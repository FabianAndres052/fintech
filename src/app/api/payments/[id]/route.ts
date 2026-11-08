import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction, syncOverdueStatus } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const paymentId = Number(id);

    if (!paymentId) {
      return NextResponse.json({ error: 'ID de pago inválido.' }, { status: 400 });
    }

    const deleteResult = await withTransaction(async (conn) => {
      // 1. Obtener información completa del pago y su crédito
      const [pRows]: any = await conn.query(
        `SELECT p.*, l.loan_code, l.balance_remaining, l.capital_collected, l.interest_collected, l.total_amount as loan_total
         FROM payments p
         JOIN loans l ON p.loan_id = l.id
         WHERE p.id = ? FOR UPDATE`,
        [paymentId]
      );

      if (!pRows || pRows.length === 0) {
        throw new Error('Pago no encontrado en el sistema.');
      }

      const p = pRows[0];
      const amountPaid = Number(p.amount_paid);
      const capPaid = Number(p.capital_paid || 0);
      const intPaid = Number(p.interest_paid || 0);

      // 2. Si estaba vinculado a una cuota, restaurar la cuota
      if (p.installment_id) {
        const [instRows]: any = await conn.query(
          'SELECT * FROM installments WHERE id = ? FOR UPDATE',
          [p.installment_id]
        );

        if (instRows.length > 0) {
          const inst = instRows[0];
          const newInstPaid = Math.max(0, Number(inst.paid_amount) - amountPaid);
          const newInstBal = Math.min(Number(inst.total_amount), Number(inst.balance) + amountPaid);
          const newStatus = newInstPaid <= 0 ? 'PENDIENTE' : (newInstBal > 0 ? 'PARCIAL' : 'PAGADA');

          await conn.query(
            `UPDATE installments 
             SET paid_amount = ?, balance = ?, status = ?, paid_date = IF(? = 'PAGADA', paid_date, NULL),
                 capital_paid = GREATEST(0, capital_paid - ?),
                 interest_paid = GREATEST(0, interest_paid - ?)
             WHERE id = ?`,
            [newInstPaid, newInstBal, newStatus, newStatus, capPaid, intPaid, p.installment_id]
          );
        }
      }

      // 3. Restaurar saldo y recaudos del préstamo
      const newLoanBalance = Number(p.balance_remaining) + amountPaid;
      const newCapCollected = Math.max(0, Number(p.capital_collected) - capPaid);
      const newIntCollected = Math.max(0, Number(p.interest_collected) - intPaid);

      await conn.query(
        `UPDATE loans 
         SET balance_remaining = ?, capital_collected = ?, interest_collected = ?, status = 'ACTIVO'
         WHERE id = ?`,
        [newLoanBalance, newCapCollected, newIntCollected, p.loan_id]
      );

      // 4. Actualizar saldo de caja disponible (revertir dinero)
      const [cashRows]: any = await conn.query(
        'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" FOR UPDATE'
      );
      const currentCash = cashRows.length > 0 ? Number(cashRows[0].setting_value) : 0;
      const newCashBalance = Math.max(0, currentCash - amountPaid);

      await conn.query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = "current_cash_balance"',
        [String(newCashBalance)]
      );

      // 5. Registrar movimiento de ajuste / anulación
      await conn.query(
        `INSERT INTO financial_movements
          (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_by)
         VALUES (?, 'GASTO', 'AJUSTE_ANULACION', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `REV-${p.payment_code}`,
          amountPaid,
          capPaid,
          intPaid,
          p.payment_method || 'EFECTIVO',
          newCashBalance,
          `Anulación / Reversión de pago ${p.payment_code} (Préstamo ${p.loan_code})`,
          p.payment_code,
          admin.id,
        ]
      );

      // 6. Eliminar recibo(s) generados para este pago
      await conn.query(
        'DELETE FROM receipts WHERE payment_id = ? OR receipt_code = ?',
        [p.id, p.payment_code]
      );

      // 7. Eliminar el pago
      await conn.query('DELETE FROM payments WHERE id = ?', [p.id]);

      // 8. Registrar auditoría
      await conn.query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id,
          'DELETE_PAYMENT',
          'payments',
          String(p.id),
          JSON.stringify({
            paymentCode: p.payment_code,
            loanCode: p.loan_code,
            amountReverted: amountPaid,
            restoredLoanBalance: newLoanBalance,
          }),
        ]
      );

      return {
        paymentCode: p.payment_code,
        loanCode: p.loan_code,
        amountReverted: amountPaid,
      };
    });

    await syncOverdueStatus();

    return NextResponse.json({
      success: true,
      message: `Pago ${deleteResult.paymentCode} revertido y eliminado correctamente. El saldo y cuota fueron restaurados.`,
      result: deleteResult,
    });
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar/revertir el pago.' },
      { status: 400 }
    );
  }
}
