import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';
import { calculateLoan } from '@/lib/calculations';
import { Periodicity } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const applicationId = Number(id);

    const [apps] = await query<any[]>('SELECT * FROM loan_applications WHERE id = ? LIMIT 1', [applicationId]);
    if (!apps || apps.length === 0) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    const app = apps[0];

    if (app.status !== 'CONDICIONES_ACEPTADAS') {
      return NextResponse.json(
        { error: 'La solicitud debe haber sido aceptada por el cliente antes de proceder con el desembolso.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const disbursementMethod = body.disbursement_method || 'TRANSFERENCIA'; // 'TRANSFERENCIA' | 'EFECTIVO'
    const disbursementBank = body.disbursement_bank || app.disbursement_bank || 'Bancolombia';
    const disbursementKeyType = body.disbursement_key_type || app.disbursement_key_type || 'CELULAR';
    const disbursementKeyValue = body.disbursement_key_value || app.disbursement_key_value || '';
    const disbursementReference = body.disbursement_reference || (disbursementMethod === 'EFECTIVO' ? 'ENTREGA_EFECTIVO' : `TX-${Date.now().toString().slice(-6)}`);
    const disbursementNotes = body.disbursement_notes || '';

    const capital = Number(app.approved_capital);
    const interestRate = Number(app.approved_interest_rate);
    const installmentsCount = Number(app.approved_installments);
    const periodicity = (app.approved_periodicity || 'SEMANAL') as Periodicity;

    // Calcular cronograma de cuotas exacto
    const todayStr = new Date().toISOString().split('T')[0];
    const calc = calculateLoan({
      capital,
      interestRate,
      installmentsCount,
      periodicity,
      disbursementDate: todayStr,
    });

    const result = await withTransaction(async (conn) => {
      // 1. Generar código correlativo de préstamo PRE-XXXXX
      const [maxLoan]: any = await conn.query('SELECT MAX(id) as max_id FROM loans');
      const nextId = (maxLoan[0]?.max_id || 0) + 1;
      const loanCode = `PRE-${String(nextId).padStart(5, '0')}`;

      // 2. Insertar préstamo en loans
      const [loanInsert]: any = await conn.query(
        `INSERT INTO loans 
         (loan_code, client_id, capital_amount, interest_rate, interest_amount, total_amount,
          balance_remaining, capital_collected, interest_collected, installments_count,
          periodicity, payment_per_installment, disbursement_date, start_date, end_date,
          status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?)`,
        [
          loanCode,
          app.client_id,
          calc.capital,
          calc.interestRate,
          calc.interestAmount,
          calc.totalAmount,
          calc.totalAmount, // Balance inicial = totalAmount
          calc.installmentsCount,
          calc.periodicity,
          calc.paymentPerInstallment,
          calc.disbursementDate,
          calc.startDate,
          calc.endDate,
          `Desembolso originado por solicitud ${app.application_code}. ${disbursementNotes}`.trim(),
          admin.id,
        ]
      );

      const loanId = loanInsert.insertId;

      // 3. Insertar cuotas en installments si tiene cuotas
      if (calc.schedule && calc.schedule.length > 0) {
        for (const inst of calc.schedule) {
          await conn.query(
            `INSERT INTO installments 
             (loan_id, installment_number, due_date, capital_share, interest_share, total_amount, paid_amount, balance, status)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'PENDIENTE')`,
            [
              loanId,
              inst.installmentNumber,
              inst.dueDate,
              inst.capitalShare,
              inst.interestShare,
              inst.totalAmount,
              inst.totalAmount,
            ]
          );
        }
      }

      // 4. Registrar movimiento de egreso por desembolso en financial_movements
      const movCode = `MOV-DES-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      await conn.query(
        `INSERT INTO financial_movements
         (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_by)
         VALUES (?, 'DESEMBOLSO_PRESTAMO', 'DESEMBOLSO', ?, ?, 0, ?, 0, ?, ?, ?)`,
        [
          movCode,
          capital,
          capital,
          disbursementMethod,
          `Desembolso de crédito ${loanCode} por ${disbursementMethod.toLowerCase()} (Ref: ${disbursementReference})`,
          app.application_code,
          admin.id,
        ]
      );

      // 5. Actualizar solicitud a DESEMBOLSADO
      await conn.query(
        `UPDATE loan_applications 
         SET status = 'DESEMBOLSADO',
             disbursement_method = ?,
             disbursement_bank = ?,
             disbursement_key_type = ?,
             disbursement_key_value = ?,
             disbursement_reference = ?,
             disbursement_notes = ?,
             disbursed_by = ?,
             disbursed_at = NOW(),
             loan_id = ?
         WHERE id = ?`,
        [
          disbursementMethod,
          disbursementBank,
          disbursementKeyType,
          disbursementKeyValue,
          disbursementReference,
          disbursementNotes,
          admin.id,
          loanId,
          applicationId,
        ]
      );

      // 6. Crear notificación para el cliente en el portal
      await conn.query(
        `INSERT INTO portal_notifications (client_id, title, message, type, reference_id, reference_type)
         VALUES (?, ?, ?, 'DISBURSEMENT', ?, 'LOAN')`,
        [
          app.client_id,
          '¡Tu préstamo ha sido desembolsado!',
          `El crédito ${loanCode} por $${capital.toLocaleString('es-CO')} ha sido desembolsado exitosamente mediante ${disbursementMethod.toLowerCase()} (Ref: ${disbursementReference}). Ya puedes consultar tus cuotas en tu portal.`,
          String(loanId),
        ]
      );

      return { loanId, loanCode, capital, totalAmount: calc.totalAmount };
    });

    // Auditoría
    query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        admin.id,
        'LOAN_DISBURSED',
        'loans',
        String(result.loanId),
        JSON.stringify({
          application_code: app.application_code,
          loan_code: result.loanCode,
          capital: result.capital,
          method: disbursementMethod,
          ref: disbursementReference,
        }),
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Desembolso completado exitosamente. Se ha activado el crédito ${result.loanCode}.`,
      loanId: result.loanId,
      loanCode: result.loanCode,
    });
  } catch (error: any) {
    console.error('Error during disbursement:', error);
    return NextResponse.json({ error: error.message || 'Error al ejecutar desembolso.' }, { status: 500 });
  }
}
