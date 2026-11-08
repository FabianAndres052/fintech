import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const loanId = Number(id);

    const loans = await query<any[]>(
      `SELECT 
        l.*,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
        c.document_number as client_document,
        c.phone as client_phone,
        c.address as client_address,
        c.email as client_email
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.id = ?`,
      [loanId]
    );

    if (loans.length === 0) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    const loan = loans[0];

    // Obtener cuotas ordenadas
    const installments = await query<any[]>(
      'SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_number ASC',
      [loanId]
    );

    // Obtener pagos registrados para este préstamo
    const payments = await query<any[]>(
      'SELECT * FROM payments WHERE loan_id = ? ORDER BY id DESC',
      [loanId]
    );

    const response = NextResponse.json({
      success: true,
      loan: {
        ...loan,
        installments,
        payments,
      },
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: any) {
    console.error('Error fetching loan detail:', error);
    return NextResponse.json({ error: 'Error al consultar detalle del préstamo.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const loanId = Number(id);

    // Cancelación o reversión
    const result = await withTransaction(async (conn) => {
      const [loanRows]: any = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [loanId]);
      if (loanRows.length === 0) throw new Error('Préstamo no encontrado.');
      const loan = loanRows[0];

      // Si ya tiene pagos recibidos, no se puede simplemente borrar, se debe cancelar
      const [paymentRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM payments WHERE loan_id = ?', [loanId]);
      if (paymentRows[0].cnt > 0) {
        throw new Error('No se puede anular un préstamo que ya tiene pagos registrados. Debe cancelarlo o liquidarlo.');
      }

      // Revertir desembolso si no ha tenido ningún pago (devolver capital a caja)
      const [cashRows]: any = await conn.query(
        'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" FOR UPDATE'
      );
      const currentCash = cashRows.length > 0 ? Number(cashRows[0].setting_value) : 0;
      const restoredCash = currentCash + Number(loan.capital_amount);

      await conn.query('UPDATE loans SET status = "CANCELADO" WHERE id = ?', [loanId]);
      await conn.query('UPDATE installments SET status = "PAGADA" WHERE loan_id = ?', [loanId]);

      // Registrar movimiento de reintegro por anulación
      await conn.query(
        `INSERT INTO financial_movements
          (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_by)
         VALUES (?, 'INGRESO', 'ANULACION_PRESTAMO', ?, ?, 0.00, 'EFECTIVO', ?, ?, ?, ?)`,
        [
          `MOV-REV-${loan.loan_code}`,
          loan.capital_amount,
          loan.capital_amount,
          restoredCash,
          `Reintegro de capital por anulación de préstamo ${loan.loan_code}`,
          loan.loan_code,
          admin.id,
        ]
      );

      await conn.query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = "current_cash_balance"',
        [String(restoredCash)]
      );

      await conn.query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [admin.id, 'CANCEL_LOAN', 'loans', String(loanId), JSON.stringify({ loanCode: loan.loan_code })]
      );

      return true;
    });

    return NextResponse.json({ success: true, message: 'Préstamo anulado y capital reintegrado a caja.' });
  } catch (error: any) {
    console.error('Error canceling loan:', error);
    return NextResponse.json({ error: error.message || 'Error al anular préstamo.' }, { status: 400 });
  }
}
