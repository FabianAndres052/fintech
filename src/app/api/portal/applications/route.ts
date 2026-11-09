import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getClientFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const applications = await query<any[]>(
      `SELECT * FROM loan_applications WHERE client_id = ? ORDER BY id DESC`,
      [client.id]
    );

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const requestedAmount = Number(body.requested_amount);
    const requestedInstallments = Number(body.requested_installments);
    const requestedPeriodicity = body.requested_periodicity || 'SEMANAL';
    const reason = (body.reason || '').trim();

    if (!requestedAmount || requestedAmount < 50000) {
      return NextResponse.json(
        { error: 'El monto solicitado debe ser mayor a $50.000 COP.' },
        { status: 400 }
      );
    }

    if (!requestedInstallments || requestedInstallments < 1 || requestedInstallments > 120) {
      return NextResponse.json(
        { error: 'El número de cuotas debe estar entre 1 y 120.' },
        { status: 400 }
      );
    }

    // Generar código único de solicitud
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const appCode = `SOL-${Date.now().toString().slice(-4)}${codeNum}`;

    const [result]: any = await query(
      `INSERT INTO loan_applications 
       (application_code, client_id, requested_amount, requested_installments, requested_periodicity, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, 'EN_REVISION')`,
      [appCode, client.id, requestedAmount, requestedInstallments, requestedPeriodicity, reason]
    );

    const applicationId = result.insertId;

    // Crear notificación para el cliente
    await query(
      `INSERT INTO portal_notifications (client_id, title, message, type, reference_id, reference_type)
       VALUES (?, ?, ?, 'LOAN_STATUS', ?, 'APPLICATION')`,
      [
        client.id,
        'Solicitud de préstamo enviada',
        `Tu solicitud ${appCode} por valor de $${requestedAmount.toLocaleString('es-CO')} ha sido recibida y está en revisión por el equipo FINTECH.`,
        String(applicationId),
      ]
    );

    // Auditoría
    query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        client.id,
        'LOAN_APPLICATION_SUBMITTED',
        'loan_applications',
        String(applicationId),
        JSON.stringify({ application_code: appCode, amount: requestedAmount, installments: requestedInstallments }),
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada exitosamente. El equipo de FINTECH la revisará a la brevedad.',
      applicationId,
      applicationCode: appCode,
    });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    return NextResponse.json(
      { error: 'Error al enviar la solicitud de préstamo.' },
      { status: 500 }
    );
  }
}
