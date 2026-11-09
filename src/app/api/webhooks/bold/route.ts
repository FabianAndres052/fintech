import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    // Bold payload structure:
    // payload.data?.order_id or payload.order_id or payload.id
    const orderId = payload.data?.order_id || payload.order_id || payload.reference;
    const status = (payload.data?.status || payload.status || '').toUpperCase();
    const boldTxId = payload.data?.id || payload.transaction_id || payload.id;
    const paymentMethodType = payload.data?.payment_method_type || payload.payment_method || 'BOLD_ONLINE';

    if (!orderId) {
      return NextResponse.json({ error: 'Falta order_id en el webhook de Bold' }, { status: 400 });
    }

    // Verificar si existe la orden en bold_payments
    const [orders] = await query<any[]>('SELECT * FROM bold_payments WHERE order_id = ? LIMIT 1', [orderId]);
    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'Orden Bold no encontrada en base de datos' }, { status: 404 });
    }

    const boldOrder = orders[0];

    // Idempotencia: si ya está procesada como APPROVED, responder OK sin duplicar
    if (boldOrder.status === 'APPROVED') {
      return NextResponse.json({ success: true, message: 'Pago ya había sido procesado previamente.' });
    }

    if (status !== 'APPROVED' && status !== 'PAID') {
      // Si fue rechazada o falló, actualizar estado
      await query(
        'UPDATE bold_payments SET status = ?, bold_tx_id = ?, payment_method_type = ?, payload_json = ? WHERE id = ?',
        [status === 'REJECTED' ? 'REJECTED' : 'FAILED', boldTxId, paymentMethodType, JSON.stringify(payload), boldOrder.id]
      );
      return NextResponse.json({ success: true, status });
    }

    // Ejecutar procesamiento del pago dentro de transacción segura
    const paymentResult = await withTransaction(async (conn) => {
      const loanId = boldOrder.loan_id;
      const clientId = boldOrder.client_id;
      const amountPaid = Number(boldOrder.amount);
      const installmentId = boldOrder.installment_id;

      // 1. Obtener préstamo
      const [loans] = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [loanId]);
      const loan = (loans as any[])[0];
      if (!loan) throw new Error('Préstamo no encontrado');

      // 2. Obtener cliente
      const [clients] = await conn.query('SELECT * FROM clients WHERE id = ?', [clientId]);
      const client = (clients as any[])[0];

      // 3. Generar código de pago
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const paymentCode = `REC-BOLD-${Date.now().toString().slice(-4)}${randSuffix}`;

      let capitalPaid = 0;
      let interestPaid = 0;
      let installmentNumber: number | null = null;
      let installmentDueDate: string | null = null;

      if (installmentId) {
        // Pago de cuota específica
        const [insts] = await conn.query('SELECT * FROM installments WHERE id = ? FOR UPDATE', [installmentId]);
        const inst = (insts as any[])[0];
        if (inst) {
          installmentNumber = inst.installment_number;
          installmentDueDate = inst.due_date;
          const currentBal = Number(inst.balance);
          const newBal = Math.max(0, currentBal - amountPaid);
          const newStatus = newBal === 0 ? 'PAGADA' : 'PARCIAL';

          // Proporción capital e interés
          const capShare = Number(inst.capital_share);
          const intShare = Number(inst.interest_share);
          const totalInst = capShare + intShare;
          if (totalInst > 0) {
            capitalPaid = Math.round((capShare / totalInst) * amountPaid * 100) / 100;
            interestPaid = Math.round((intShare / totalInst) * amountPaid * 100) / 100;
          }

          await conn.query(
            `UPDATE installments 
             SET paid_amount = paid_amount + ?, balance = ?, status = ?,
                 capital_paid = capital_paid + ?, interest_paid = interest_paid + ?,
                 paid_date = NOW()
             WHERE id = ?`,
            [amountPaid, newBal, newStatus, capitalPaid, interestPaid, installmentId]
          );
        }
      } else {
        // Abono libre a capital
        capitalPaid = amountPaid;
        interestPaid = 0;
      }

      // 4. Actualizar saldo del préstamo
      const currentLoanBalance = Number(loan.balance_remaining);
      const newLoanBalance = Math.max(0, currentLoanBalance - amountPaid);
      const newLoanStatus = newLoanBalance === 0 ? 'COMPLETADO' : loan.status;

      await conn.query(
        `UPDATE loans 
         SET balance_remaining = ?, capital_collected = capital_collected + ?,
             interest_collected = interest_collected + ?, status = ?
         WHERE id = ?`,
        [newLoanBalance, capitalPaid, interestPaid, newLoanStatus, loanId]
      );

      // 5. Insertar pago en payments
      const [payResult]: any = await conn.query(
        `INSERT INTO payments 
         (payment_code, loan_id, client_id, installment_id, amount_paid, capital_paid, interest_paid, payment_method, payment_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'BOLD_ONLINE', NOW(), ?)`,
        [paymentCode, loanId, clientId, installmentId, amountPaid, capitalPaid, interestPaid, `Pago confirmado vía Bold (${orderId})`]
      );
      const paymentId = payResult.insertId;

      // 6. Contar cuotas restantes
      const [pendInsts]: any = await conn.query(
        `SELECT COUNT(*) as pending_count FROM installments WHERE loan_id = ? AND status IN ('PENDIENTE', 'PARCIAL', 'VENCIDA')`,
        [loanId]
      );
      const remainingInstallments = Number(pendInsts[0]?.pending_count || 0);

      // Total acumulado pagado
      const [totPaidRes]: any = await conn.query(
        `SELECT SUM(amount_paid) as total_paid FROM payments WHERE loan_id = ?`,
        [loanId]
      );
      const totalAccumulatedPaid = Number(totPaidRes[0]?.total_paid || amountPaid);

      // 7. Crear movimiento contable en financial_movements
      await conn.query(
        `INSERT INTO financial_movements
         (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id)
         VALUES (?, 'COBRO_CUOTA', 'PAGO_BOLD', ?, ?, ?, 'BOLD_ONLINE', ?, ?, ?)`,
        [
          `MOV-${paymentCode}`,
          amountPaid,
          capitalPaid,
          interestPaid,
          newLoanBalance,
          `Recaudo online Bold cuota ${installmentNumber || 'abono'} préstamo ${loan.loan_code}`,
          orderId,
        ]
      );

      // 8. Crear comprobante de recibo en receipts con los 4 bloques
      const receiptItem = {
        loanId: loan.id,
        loanCode: loan.loan_code,
        installmentId,
        installmentNumber,
        totalInstallments: loan.installments_count || 1,
        remainingInstallments,
        amountPaid,
        capitalPaid,
        interestPaid,
        remainingBalance: newLoanBalance,
        totalAccumulatedPaid,
        disbursementDate: loan.disbursement_date,
        capitalAmount: Number(loan.capital_amount),
        totalAmount: Number(loan.total_amount),
        loanStatus: newLoanStatus,
        dueDate: installmentDueDate,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BOLD_ONLINE',
        notes: `Pago confirmado vía Bold (${orderId})`,
        isFreeDebt: loan.periodicity === 'LIBRE',
      };

      const summaryJson = {
        totalReceived: amountPaid,
        totalBalanceRemaining: newLoanBalance,
        paymentMethod: 'BOLD_ONLINE',
        loansCount: 1,
      };

      const clientFullName = `${client.first_name} ${client.last_name || ''}`.trim();

      await conn.query(
        `INSERT INTO receipts 
         (receipt_code, client_id, loan_id, payment_id, receipt_type, is_consolidated, receipt_date, total_amount, client_name, client_phone, client_document, items_json, summary_json, notes)
         VALUES (?, ?, ?, ?, 'INDIVIDUAL', 0, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentCode,
          clientId,
          loanId,
          paymentId,
          amountPaid,
          clientFullName,
          client.phone || '',
          client.document_number || '',
          JSON.stringify([receiptItem]),
          JSON.stringify(summaryJson),
          `Comprobante de pago Bold ${paymentCode}`,
        ]
      );

      // 9. Actualizar orden Bold
      await conn.query(
        `UPDATE bold_payments 
         SET status = 'APPROVED', bold_tx_id = ?, payment_method_type = ?, payload_json = ?
         WHERE id = ?`,
        [boldTxId, paymentMethodType, JSON.stringify(payload), boldOrder.id]
      );

      // 10. Crear notificación en el portal
      await conn.query(
        `INSERT INTO portal_notifications (client_id, title, message, type, reference_id, reference_type)
         VALUES (?, ?, ?, 'PAYMENT', ?, 'PAYMENT')`,
        [
          clientId,
          '¡Pago confirmado exitosamente!',
          `Tu pago de $${amountPaid.toLocaleString('es-CO')} para el crédito ${loan.loan_code} ha sido confirmado vía Bold. Comprobante: ${paymentCode}.`,
          String(paymentId),
        ]
      );

      return { paymentCode, paymentId, amountPaid, newLoanBalance };
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook de Bold procesado correctamente.',
      data: paymentResult,
    });
  } catch (error: any) {
    console.error('Error processing Bold webhook:', error);
    return NextResponse.json({ error: error.message || 'Error procesando webhook' }, { status: 500 });
  }
}
