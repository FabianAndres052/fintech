import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

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
    const body = await req.json();
    const action = body.action; // 'APROBAR' | 'RECHAZAR' | 'EN_REVISION'

    if (action === 'RECHAZAR') {
      const reason = (body.rejection_reason || 'No cumple con las políticas de crédito vigentes.').trim();
      await query(
        `UPDATE loan_applications 
         SET status = 'RECHAZADA', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [reason, admin.id, applicationId]
      );

      // Notificar al cliente en el portal
      await query(
        `INSERT INTO portal_notifications (client_id, title, message, type, reference_id, reference_type)
         VALUES (?, ?, ?, 'LOAN_STATUS', ?, 'APPLICATION')`,
        [
          app.client_id,
          'Solicitud de préstamo rechazada',
          `Tu solicitud ${app.application_code} no fue aprobada: "${reason}". Comunícate con tu asesor si tienes dudas.`,
          String(applicationId),
        ]
      );

      // Auditoría
      query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [
          admin.id,
          'LOAN_APPLICATION_REJECTED',
          'loan_applications',
          String(applicationId),
          JSON.stringify({ code: app.application_code, reason }),
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      ).catch(() => {});

      return NextResponse.json({ success: true, message: 'Solicitud rechazada correctamente.' });
    }

    if (action === 'APROBAR') {
      const approvedCapital = Number(body.approved_capital || app.requested_amount);
      const interestRate = Number(body.approved_interest_rate || 20); // 20%
      const approvedInstallments = Number(body.approved_installments || app.requested_installments || 12);
      const approvedPeriodicity = body.approved_periodicity || app.requested_periodicity || 'SEMANAL';

      const interestAmount = Math.round((approvedCapital * (interestRate / 100)) * 100) / 100;
      const approvedTotalAmount = approvedCapital + interestAmount;
      const paymentPerInstallment = approvedInstallments > 0 ? Math.round((approvedTotalAmount / approvedInstallments) * 100) / 100 : approvedTotalAmount;

      await query(
        `UPDATE loan_applications 
         SET status = 'APROBADA',
             approved_capital = ?,
             approved_interest_rate = ?,
             approved_interest_amount = ?,
             approved_total_amount = ?,
             approved_installments = ?,
             approved_periodicity = ?,
             approved_payment_per_installment = ?,
             reviewed_by = ?,
             reviewed_at = NOW()
         WHERE id = ?`,
        [
          approvedCapital,
          interestRate,
          interestAmount,
          approvedTotalAmount,
          approvedInstallments,
          approvedPeriodicity,
          paymentPerInstallment,
          admin.id,
          applicationId,
        ]
      );

      // Notificar al cliente para que acepte condiciones
      await query(
        `INSERT INTO portal_notifications (client_id, title, message, type, reference_id, reference_type)
         VALUES (?, ?, ?, 'LOAN_STATUS', ?, 'APPLICATION')`,
        [
          app.client_id,
          '¡Tu solicitud ha sido aprobada!',
          `Tu solicitud ${app.application_code} fue aprobada por $${approvedCapital.toLocaleString('es-CO')} en ${approvedInstallments} cuotas de $${paymentPerInstallment.toLocaleString('es-CO')}. Ingresa a tu portal para revisar y aceptar las condiciones.`,
          String(applicationId),
        ]
      );

      // Auditoría
      query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [
          admin.id,
          'LOAN_APPLICATION_APPROVED',
          'loan_applications',
          String(applicationId),
          JSON.stringify({ code: app.application_code, approvedCapital, approvedTotalAmount }),
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'Solicitud aprobada con éxito. El cliente deberá aceptar las condiciones en su portal antes del desembolso.',
      });
    }

    return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error reviewing application:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
