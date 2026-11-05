import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';
import { MovementType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.trim();
    const limit = Number(searchParams.get('limit')) || 200;

    let sql = 'SELECT * FROM financial_movements WHERE 1=1';
    const params: any[] = [];

    if (type && type !== 'TODOS') {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      sql += ' AND (movement_code LIKE ? OR description LIKE ? OR category LIKE ? OR payment_method LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p, p);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const movements = await query<any[]>(sql, params);

    // Obtener saldo de caja actual
    const settings = await query<any[]>(
      'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" LIMIT 1'
    );
    const currentCash = settings.length > 0 ? Number(settings[0].setting_value) : 0;

    // Resumen contable
    const accountingSummary = await query<any[]>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'APORTE_CAPITAL' THEN amount ELSE 0 END), 0) as total_capital_injected,
        COALESCE(SUM(CASE WHEN type = 'RETIRO_CAPITAL' THEN amount ELSE 0 END), 0) as total_capital_withdrawn,
        COALESCE(SUM(CASE WHEN type = 'GASTO' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'DESEMBOLSO_PRESTAMO' THEN amount ELSE 0 END), 0) as total_disbursed,
        COALESCE(SUM(CASE WHEN type = 'COBRO_CUOTA' THEN capital_component ELSE 0 END), 0) as total_capital_collected,
        COALESCE(SUM(CASE WHEN type = 'COBRO_CUOTA' THEN interest_component ELSE 0 END), 0) as total_interest_collected
      FROM financial_movements
    `);

    return NextResponse.json({
      success: true,
      currentCash,
      movements,
      summary: accountingSummary[0] || {},
    });
  } catch (error: any) {
    console.error('Error fetching cash movements:', error);
    return NextResponse.json({ error: 'Error al consultar movimientos de caja.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const {
      type, // 'APORTE_CAPITAL' | 'RETIRO_CAPITAL' | 'INGRESO' | 'GASTO'
      category,
      amount,
      payment_method = 'EFECTIVO',
      description,
    } = body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un valor positivo mayor a 0.' }, { status: 400 });
    }

    if (!type || !description) {
      return NextResponse.json({ error: 'Tipo y descripción son obligatorios.' }, { status: 400 });
    }

    const validTypes: MovementType[] = ['APORTE_CAPITAL', 'RETIRO_CAPITAL', 'INGRESO', 'GASTO'];
    if (!validTypes.includes(type as MovementType)) {
      return NextResponse.json({ error: 'Tipo de movimiento inválido.' }, { status: 400 });
    }

    const result = await withTransaction(async (conn) => {
      const [cashRows]: any = await conn.query(
        'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" FOR UPDATE'
      );
      const currentCash = cashRows.length > 0 ? Number(cashRows[0].setting_value) : 0;

      let newBalance = currentCash;
      let capComp = 0;
      let intComp = 0;

      if (type === 'APORTE_CAPITAL' || type === 'INGRESO') {
        newBalance += numAmount;
        capComp = numAmount;
      } else if (type === 'RETIRO_CAPITAL' || type === 'GASTO') {
        if (numAmount > currentCash) {
          throw new Error(
            `Fondos insuficientes en caja ($ ${new Intl.NumberFormat('es-CO').format(currentCash)}) para retirar o gastar $ ${new Intl.NumberFormat('es-CO').format(numAmount)}.`
          );
        }
        newBalance -= numAmount;
        capComp = numAmount;
      }

      // Código de movimiento con garantía anti-colisión
      const [maxRows]: any = await conn.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM financial_movements');
      const nextNum = maxRows[0]?.nextId || 1;
      const movementCode = `MOV-CAJA-${String(nextNum).padStart(6, '0')}`;

      await conn.query(
        `INSERT INTO financial_movements
          (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movementCode,
          type,
          category || type,
          numAmount,
          capComp,
          intComp,
          payment_method,
          newBalance,
          description.trim(),
          movementCode,
          admin.id,
        ]
      );

      // Si es gasto, registrarlo también en la tabla expenses
      if (type === 'GASTO') {
        await conn.query(
          `INSERT INTO expenses (category, amount, payment_method, description, expense_date, created_by)
           VALUES (?, ?, ?, ?, CURDATE(), ?)`,
          [category || 'Operativo', numAmount, payment_method, description.trim(), admin.id]
        );
      }

      await conn.query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = "current_cash_balance"',
        [String(newBalance)]
      );

      await conn.query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id,
          `CASH_${type}`,
          'financial_movements',
          movementCode,
          JSON.stringify({ type, amount: numAmount, newBalance, description }),
        ]
      );

      return { movementCode, newBalance };
    });

    return NextResponse.json({
      success: true,
      message: `Movimiento de caja registrado exitosamente. Nuevo saldo: $ ${new Intl.NumberFormat('es-CO').format(result.newBalance)} COP`,
      result,
    });
  } catch (error: any) {
    console.error('Error posting cash movement:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar movimiento de caja.' }, { status: 400 });
  }
}
