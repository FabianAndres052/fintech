import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction, syncOverdueStatus } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';
import { calculateLoan, validateLoanRules } from '@/lib/calculations';
import { Periodicity } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Sincronizar automáticamente estados de mora
    await syncOverdueStatus();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search')?.trim();

    let sql = `
      SELECT 
        l.*,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
        c.document_number as client_document,
        c.phone as client_phone
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'TODOS') {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    if (clientId) {
      sql += ' AND l.client_id = ?';
      params.push(Number(clientId));
    }

    if (search) {
      sql += ' AND (l.loan_code LIKE ? OR c.document_number LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p);
    }

    sql += ' ORDER BY l.id DESC';

    const loans = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, loans });
  } catch (error: any) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: 'Error al consultar préstamos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const {
      client_id,
      capital_amount,
      interest_rate = 10,
      installments_count,
      periodicity = 'SEMANAL',
      disbursement_date,
      start_date,
      payment_method = 'EFECTIVO',
      notes,
      is_historical = false,
      affect_cash = true,
      paid_installments_count = 0,
    } = body;

    const capital = Number(capital_amount);
    const rate = Number(interest_rate);
    const installments = Number(installments_count);
    const pDate = disbursement_date || new Date().toISOString().substring(0, 10);

    // Obtener límites configurados del sistema
    const settings = await query<any[]>('SELECT setting_key, setting_value FROM system_settings');
    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.setting_key] = s.setting_value;
    });

    // 1. Validar reglas de negocio con límites del sistema
    const validation = validateLoanRules(capital, installments, {
      minCapital: configMap.min_capital_amount ? Number(configMap.min_capital_amount) : 100000,
      maxCapital: configMap.max_capital_amount ? Number(configMap.max_capital_amount) : 10000000,
      maxInstallmentsUnder1m: configMap.max_installments_under_1m ? Number(configMap.max_installments_under_1m) : 20,
      maxInstallmentsOver1m: configMap.max_installments_over_1m ? Number(configMap.max_installments_over_1m) : 28,
    });
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 2. Verificar cliente
    const clients = await query<any[]>('SELECT id, status, first_name, last_name FROM clients WHERE id = ?', [client_id]);
    if (clients.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    }
    if (clients[0].status === 'BLOQUEADO') {
      return NextResponse.json({ error: 'El cliente se encuentra bloqueado para nuevos préstamos.' }, { status: 400 });
    }

    // 3. Calcular cronograma y valores exactos
    const calculation = calculateLoan({
      capital,
      interestRate: rate,
      installmentsCount: installments,
      periodicity: periodicity as Periodicity,
      disbursementDate: pDate,
      firstPaymentDate: start_date,
    });

    if (!calculation.isValid) {
      return NextResponse.json({ error: calculation.validationError }, { status: 400 });
    }

    // 4. Ejecutar transacción ACID en base de datos
    const createdLoan = await withTransaction(async (conn) => {
      // 4.1 Comprobar saldo en caja solo si no es préstamo histórico previo
      const shouldDeductCash = affect_cash && !is_historical;

      const [cashRows]: any = await conn.query(
        'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" FOR UPDATE'
      );
      const currentCash = cashRows.length > 0 ? Number(cashRows[0].setting_value) : 0;

      if (shouldDeductCash && currentCash < capital) {
        throw new Error(
          `Capital disponible insuficiente en caja ($ ${new Intl.NumberFormat('es-CO').format(currentCash)} COP) para desembolsar $ ${new Intl.NumberFormat('es-CO').format(capital)} COP.`
        );
      }

      // 4.2 Generar código único de préstamo con garantía anti-colisión
      const [maxRows]: any = await conn.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM loans');
      const nextNum = maxRows[0]?.nextId || 1;
      const loanCode = `PRE-${String(nextNum).padStart(5, '0')}`;

      // 4.3 Calcular estado previo y cuotas si ya hubo pagos antes de la app
      const todayStr = new Date().toISOString().substring(0, 10);
      const numPaid = Math.max(0, Math.min(Number(paid_installments_count) || 0, installments));

      let initCapitalCollected = 0;
      let initInterestCollected = 0;
      let hasOverdue = false;

      calculation.schedule.forEach((inst, idx) => {
        if (idx < numPaid) {
          initCapitalCollected += inst.capitalShare;
          initInterestCollected += inst.interestShare;
        } else {
          if (inst.dueDate < todayStr) {
            hasOverdue = true;
          }
        }
      });

      const totalCollected = initCapitalCollected + initInterestCollected;
      const balanceRemaining = Math.max(0, calculation.totalAmount - totalCollected);

      let loanStatus = 'ACTIVO';
      if (balanceRemaining <= 0) {
        loanStatus = 'COMPLETADO';
      } else if (hasOverdue) {
        loanStatus = 'EN_MORA';
      }

      const loanNote = is_historical
        ? (notes ? `${notes.trim()} | [Préstamo anterior previo a la app]` : '[Préstamo anterior previo a la app]')
        : (notes ? notes.trim() : null);

      // 4.4 Insertar registro del préstamo
      const [loanResult]: any = await conn.query(
        `INSERT INTO loans 
          (loan_code, client_id, capital_amount, interest_rate, interest_amount, total_amount, balance_remaining,
           capital_collected, interest_collected, installments_count, periodicity, payment_per_installment,
           disbursement_date, start_date, end_date, status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          loanCode,
          client_id,
          capital,
          rate,
          calculation.interestAmount,
          calculation.totalAmount,
          balanceRemaining,
          initCapitalCollected,
          initInterestCollected,
          installments,
          periodicity,
          calculation.paymentPerInstallment,
          pDate,
          calculation.startDate,
          calculation.endDate,
          loanStatus,
          loanNote,
          admin.id,
        ]
      );

      const loanId = loanResult.insertId;

      // 4.5 Insertar cuotas en la tabla de amortización
      for (let i = 0; i < calculation.schedule.length; i++) {
        const inst = calculation.schedule[i];
        const isPaid = i < numPaid;

        let instStatus = 'PENDIENTE';
        let paidAmount = 0.00;
        let balance = inst.totalAmount;
        let capPaid = 0.00;
        let intPaid = 0.00;
        let paidDate = null;

        if (isPaid) {
          instStatus = 'PAGADA';
          paidAmount = inst.totalAmount;
          balance = 0.00;
          capPaid = inst.capitalShare;
          intPaid = inst.interestShare;
          paidDate = `${inst.dueDate} 12:00:00`;
        } else if (inst.dueDate < todayStr) {
          instStatus = 'VENCIDA';
        }

        const [instResult]: any = await conn.query(
          `INSERT INTO installments
            (loan_id, installment_number, due_date, capital_share, interest_share, total_amount, paid_amount, balance, capital_paid, interest_paid, status, paid_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            loanId,
            inst.installmentNumber,
            inst.dueDate,
            inst.capitalShare,
            inst.interestShare,
            inst.totalAmount,
            paidAmount,
            balance,
            capPaid,
            intPaid,
            instStatus,
            paidDate,
          ]
        );

        // Si fue pagada previamente, registrar comprobante histórico en payments
        if (isPaid) {
          const payCode = `REC-PREV-${loanCode}-${String(inst.installmentNumber).padStart(2, '0')}`;
          await conn.query(
            `INSERT INTO payments
              (payment_code, loan_id, client_id, installment_id, amount_paid, capital_paid, interest_paid, payment_method, payment_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PREVIO_APP', ?, 'Pago registrado previo a la digitalización en la app')`,
            [
              payCode,
              loanId,
              client_id,
              instResult.insertId,
              inst.totalAmount,
              inst.capitalShare,
              inst.interestShare,
              `${inst.dueDate} 12:00:00`,
            ]
          );
        }
      }

      // 4.6 Desembolso en caja solo si no es un préstamo histórico previo
      if (shouldDeductCash) {
        const newCashBalance = currentCash - capital;
        const movementCode = `MOV-DES-${loanCode}`;

        await conn.query(
          `INSERT INTO financial_movements
            (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_by)
           VALUES (?, 'DESEMBOLSO_PRESTAMO', 'PRESTAMO_CLIENTE', ?, ?, 0.00, ?, ?, ?, ?, ?)`,
          [
            movementCode,
            capital,
            capital,
            payment_method,
            newCashBalance,
            `Desembolso de préstamo ${loanCode} a cliente ${clients[0].first_name} ${clients[0].last_name}`,
            loanCode,
            admin.id,
          ]
        );

        await conn.query(
          'UPDATE system_settings SET setting_value = ? WHERE setting_key = "current_cash_balance"',
          [String(newCashBalance)]
        );
      }

      // 4.7 Registrar auditoría
      await conn.query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id,
          is_historical ? 'MIGRATE_HISTORICAL_LOAN' : 'CREATE_LOAN',
          'loans',
          String(loanId),
          JSON.stringify({
            loanCode,
            capital,
            installments,
            periodicity,
            total: calculation.totalAmount,
            is_historical,
            paid_installments_count: numPaid,
          }),
        ]
      );

      return {
        loanId,
        loanCode,
        capital,
        totalAmount: calculation.totalAmount,
        installmentsCount: installments,
        isHistorical: is_historical,
        paidCount: numPaid,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Préstamo ${createdLoan.loanCode} creado y desembolsado exitosamente.`,
      loan: createdLoan,
    });
  } catch (error: any) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar el préstamo.' },
      { status: 400 }
    );
  }
}
