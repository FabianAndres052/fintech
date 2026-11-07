import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction, syncOverdueStatus } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const loanId = searchParams.get('loanId');
    const clientId = searchParams.get('clientId');
    const limit = Number(searchParams.get('limit')) || 100;

    let sql = `
      SELECT 
        p.*,
        l.loan_code,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
        c.document_number as client_document,
        c.phone as client_phone,
        i.installment_number
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN clients c ON p.client_id = c.id
      LEFT JOIN installments i ON p.installment_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (loanId) {
      sql += ' AND p.loan_id = ?';
      params.push(Number(loanId));
    }
    if (clientId) {
      sql += ' AND p.client_id = ?';
      params.push(Number(clientId));
    }

    sql += ' ORDER BY p.id DESC LIMIT ?';
    params.push(limit);

    const payments = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Error al consultar pagos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const {
      loan_id,
      installment_id, // opcional, si no se envía aplica en cascada a las cuotas pendientes
      amount,
      payment_method = 'EFECTIVO',
      payment_date,
      notes,
    } = body;

    const amountPaid = Number(amount);
    if (isNaN(amountPaid) || amountPaid <= 0) {
      return NextResponse.json({ error: 'El monto del pago debe ser mayor a 0.' }, { status: 400 });
    }

    const pDate = payment_date ? new Date(payment_date) : new Date();

    // Transacción ACID para registro de pago y aplicación de cascada
    const paymentResult = await withTransaction(async (conn) => {
      // 1. Obtener préstamo bloqueado para actualización
      const [loanRows]: any = await conn.query(
        'SELECT * FROM loans WHERE id = ? FOR UPDATE',
        [loan_id]
      );
      if (loanRows.length === 0) throw new Error('Préstamo no encontrado.');
      const loan = loanRows[0];

      if (loan.status === 'COMPLETADO' || loan.status === 'CANCELADO') {
        throw new Error(`Este préstamo ya se encuentra ${loan.status.toLowerCase()}. No admite nuevos pagos.`);
      }

      if (amountPaid > Number(loan.balance_remaining)) {
        throw new Error(
          `El monto ingresado ($ ${new Intl.NumberFormat('es-CO').format(amountPaid)}) supera el saldo restante del préstamo ($ ${new Intl.NumberFormat('es-CO').format(loan.balance_remaining)}).`
        );
      }

      // 2. Obtener cuotas pendientes del préstamo en orden cronológico
      let installmentsQuery = 'SELECT * FROM installments WHERE loan_id = ? AND status IN ("PENDIENTE", "PARCIAL", "VENCIDA") ORDER BY installment_number ASC FOR UPDATE';
      const [pendingInstallments]: any = await conn.query(installmentsQuery, [loan_id]);

      // 3. Aplicar pago: si tiene cuotas aplica en cascada; si no tiene cuotas (deuda congelada/libre) aplica directo al saldo
      let remainingToApply = amountPaid;
      let totalCapitalPaid = 0;
      let totalInterestPaid = 0;
      let targetInstallmentId: number | null = installment_id ? Number(installment_id) : null;

      if (pendingInstallments.length === 0) {
        // Obligación sin cuotas programadas (ej. deuda congelada de Kike): todo el abono reduce directamente el saldo
        totalCapitalPaid = amountPaid;
        totalInterestPaid = 0;
        targetInstallmentId = null;
      } else {
        for (const inst of pendingInstallments) {
          if (remainingToApply <= 0) break;

          // Si se especificó una cuota concreta y estamos en ella, o si no se especificó y vamos en orden
          const instBalance = Number(inst.balance);
          const applyToInst = Math.min(remainingToApply, instBalance);

          // Proporción exacta de capital e interés de esta cuota
          const instTotal = Number(inst.total_amount);
          const remainingCap = Math.max(0, Number(inst.capital_share) - Number(inst.capital_paid));
          const remainingInt = Math.max(0, Number(inst.interest_share) - Number(inst.interest_paid));

          let capPortion: number;
          let intPortion: number;

          if (applyToInst >= instBalance) {
            // Si liquida la cuota por completo, saldar exactamente los remanentes
            capPortion = remainingCap;
            intPortion = Math.max(0, Math.round((applyToInst - capPortion) * 100) / 100);
          } else {
            // Abono parcial proporcional
            const capRatio = instTotal > 0 ? Number(inst.capital_share) / instTotal : 0.8;
            capPortion = Math.min(remainingCap, Math.round((applyToInst * capRatio) * 100) / 100);
            intPortion = Math.max(0, Math.round((applyToInst - capPortion) * 100) / 100);
          }

          totalCapitalPaid += capPortion;
          totalInterestPaid += intPortion;

          const newInstPaid = Number(inst.paid_amount) + applyToInst;
          const newInstBalance = Math.max(0, Math.round((instBalance - applyToInst) * 100) / 100);
          const newInstStatus = newInstBalance <= 0 ? 'PAGADA' : 'PARCIAL';
          const newCapPaid = Number(inst.capital_paid) + capPortion;
          const newIntPaid = Number(inst.interest_paid) + intPortion;

          await conn.query(
            `UPDATE installments SET 
              paid_amount = ?, 
              balance = ?, 
              capital_paid = ?, 
              interest_paid = ?, 
              status = ?, 
              paid_date = NOW() 
             WHERE id = ?`,
            [newInstPaid, newInstBalance, newCapPaid, newIntPaid, newInstStatus, inst.id]
          );

          if (!targetInstallmentId) {
            targetInstallmentId = inst.id;
          }

          remainingToApply -= applyToInst;
        }
      }

      // 4. Actualizar préstamo (reducir saldo, aumentar recaudos)
      const newLoanBalance = Math.max(0, Math.round((Number(loan.balance_remaining) - amountPaid) * 100) / 100);
      const newCapitalCollected = Number(loan.capital_collected) + totalCapitalPaid;
      const newInterestCollected = Number(loan.interest_collected) + totalInterestPaid;
      const newLoanStatus = newLoanBalance <= 0 ? 'COMPLETADO' : loan.status;

      await conn.query(
        `UPDATE loans SET 
          balance_remaining = ?, 
          capital_collected = ?, 
          interest_collected = ?, 
          status = ? 
         WHERE id = ?`,
        [newLoanBalance, newCapitalCollected, newInterestCollected, newLoanStatus, loan_id]
      );

      // Si el préstamo se completó, asegurar que todas las cuotas queden en PAGADA y saldo 0
      if (newLoanStatus === 'COMPLETADO') {
        await conn.query(
          'UPDATE installments SET status = "PAGADA", balance = 0 WHERE loan_id = ? AND status != "PAGADA"',
          [loan_id]
        );
      }

      // 5. Generar código de recibo único sin riesgo de colisión
      const [maxRows]: any = await conn.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM payments');
      const nextNum = maxRows[0]?.nextId || 1;
      const paymentCode = `REC-${String(nextNum).padStart(6, '0')}`;

      // 6. Insertar registro de pago
      const [payResult]: any = await conn.query(
        `INSERT INTO payments 
          (payment_code, loan_id, client_id, installment_id, amount_paid, capital_paid, interest_paid, payment_method, payment_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentCode,
          loan_id,
          loan.client_id,
          targetInstallmentId,
          amountPaid,
          totalCapitalPaid,
          totalInterestPaid,
          payment_method,
          pDate,
          notes ? notes.trim() : null,
          admin.id,
        ]
      );

      // 7. Actualizar caja disponible (ingresa dinero físico a caja)
      const [cashRows]: any = await conn.query(
        'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" FOR UPDATE'
      );
      const currentCash = cashRows.length > 0 ? Number(cashRows[0].setting_value) : 0;
      const newCashBalance = currentCash + amountPaid;

      // 8. Registrar movimiento financiero con separación estricta de capital e intereses
      await conn.query(
        `INSERT INTO financial_movements
          (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_by)
         VALUES (?, 'COBRO_CUOTA', 'RECAUDO_PRESTAMO', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `MOV-${paymentCode}`,
          amountPaid,
          totalCapitalPaid,
          totalInterestPaid,
          payment_method,
          newCashBalance,
          `Recaudo de cuota préstamo ${loan.loan_code} (Cap: $${new Intl.NumberFormat('es-CO').format(totalCapitalPaid)}, Int: $${new Intl.NumberFormat('es-CO').format(totalInterestPaid)})`,
          paymentCode,
          admin.id,
        ]
      );

      await conn.query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = "current_cash_balance"',
        [String(newCashBalance)]
      );

      // 9. Registrar auditoría
      await conn.query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id,
          'REGISTER_PAYMENT',
          'payments',
          String(payResult.insertId),
          JSON.stringify({ paymentCode, loanCode: loan.loan_code, amountPaid, totalCapitalPaid, totalInterestPaid }),
        ]
      );

      // 10. Generar comprobante automático en tabla receipts
      const [clientRows]: any = await conn.query(
        'SELECT first_name, last_name, phone, document_number FROM clients WHERE id = ?',
        [loan.client_id]
      );
      const client = clientRows[0] || {};
      const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Cliente';

      let instNum: number | null = null;
      let instDueDate: string | null = null;
      if (targetInstallmentId) {
        const [instInfo]: any = await conn.query(
          'SELECT installment_number, due_date FROM installments WHERE id = ?',
          [targetInstallmentId]
        );
        if (instInfo.length > 0) {
          instNum = instInfo[0].installment_number;
          instDueDate = instInfo[0].due_date ? new Date(instInfo[0].due_date).toISOString().slice(0, 10) : null;
        }
      }

      const isFreeDebt = !targetInstallmentId;
      const totalInsts = loan.installments_count ? Number(loan.installments_count) : null;
      const remainingInsts = isFreeDebt || !totalInsts ? null : Math.max(0, totalInsts - (instNum || 0));

      const receiptItem = {
        loanId: loan.id,
        loanCode: loan.loan_code,
        installmentId: targetInstallmentId,
        installmentNumber: instNum,
        totalInstallments: totalInsts,
        remainingInstallments: remainingInsts,
        amountPaid,
        capitalPaid: totalCapitalPaid,
        interestPaid: totalInterestPaid,
        remainingBalance: newLoanBalance,
        totalAccumulatedPaid: newCapitalCollected + newInterestCollected,
        dueDate: instDueDate,
        isFreeDebt,
        notes: notes ? notes.trim() : null,
      };

      const summaryData = {
        totalReceived: amountPaid,
        totalBalanceRemaining: newLoanBalance,
        loansCount: 1,
        paymentMethod: payment_method,
      };

      const [receiptInsert]: any = await conn.query(
        `INSERT INTO receipts 
          (receipt_code, client_id, loan_id, payment_id, receipt_type, is_consolidated, receipt_date, total_amount, client_name, client_phone, client_document, items_json, summary_json, notes)
         VALUES (?, ?, ?, ?, 'INDIVIDUAL', 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentCode,
          loan.client_id,
          loan.id,
          payResult.insertId,
          pDate,
          amountPaid,
          clientFullName,
          client.phone || null,
          client.document_number || null,
          JSON.stringify([receiptItem]),
          JSON.stringify(summaryData),
          notes ? notes.trim() : `Recibo de pago ${paymentCode}`,
        ]
      );

      return {
        paymentId: payResult.insertId,
        paymentCode,
        receiptId: receiptInsert.insertId,
        receiptCode: paymentCode,
        amountPaid,
        capitalPaid: totalCapitalPaid,
        interestPaid: totalInterestPaid,
        newLoanBalance,
        newLoanStatus,
        paymentDate: pDate.toISOString(),
        client: {
          id: loan.client_id,
          name: clientFullName,
          phone: client.phone,
          document: client.document_number,
        },
        receiptItem,
      };
    });

    // Actualizar estado general de moras
    await syncOverdueStatus();

    return NextResponse.json({
      success: true,
      message: `Pago ${paymentResult.paymentCode} registrado exitosamente por valor de $ ${new Intl.NumberFormat('es-CO').format(amountPaid)} COP.`,
      payment: paymentResult,
    });
  } catch (error: any) {
    console.error('Error registering payment:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar el pago.' }, { status: 400 });
  }
}
