import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getClientFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const applicationId = Number(id);

    const apps = await query<any[]>(
      `SELECT * FROM loan_applications WHERE id = ? AND client_id = ? LIMIT 1`,
      [applicationId, client.id]
    );

    if (!apps || apps.length === 0) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    }

    const app = apps[0];

    if (app.status !== 'APROBADA') {
      return NextResponse.json(
        { error: 'La solicitud no se encuentra en estado APROBADA para aceptar condiciones.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const payoutBank = body.payout_bank || client.payout_bank || 'Bancolombia';
    const payoutKeyType = body.payout_key_type || client.payout_key_type || 'CELULAR';
    const payoutKeyValue = body.payout_key_value || client.payout_key_value || client.phone || '';

    // Actualizar solicitud y datos de desembolso del cliente
    await query(
      `UPDATE loan_applications 
       SET status = 'CONDICIONES_ACEPTADAS',
           client_accepted_at = NOW(),
           disbursement_bank = ?,
           disbursement_key_type = ?,
           disbursement_key_value = ?
       WHERE id = ?`,
      [payoutBank, payoutKeyType, payoutKeyValue, applicationId]
    );

    // Actualizar perfil de desembolso del cliente si se proporcionó
    if (payoutBank && payoutKeyValue) {
      await query(
        `UPDATE clients SET payout_bank = ?, payout_key_type = ?, payout_key_value = ? WHERE id = ?`,
        [payoutBank, payoutKeyType, payoutKeyValue, client.id]
      );
    }

    // Notificación para el cliente
    await query(
      `INSERT INTO portal_notifications (client_id, title, message, type, reference_id, reference_type)
       VALUES (?, ?, ?, 'LOAN_STATUS', ?, 'APPLICATION')`,
      [
        client.id,
        'Condiciones aceptadas',
        `Has aceptado exitosamente las condiciones de la solicitud ${app.application_code}. El administrador procederá con el desembolso.`,
        String(applicationId),
      ]
    );

    // Auditoría
    query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        client.id,
        'LOAN_CONDITIONS_ACCEPTED',
        'loan_applications',
        String(applicationId),
        JSON.stringify({ application_code: app.application_code, approved_capital: app.approved_capital }),
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Condiciones aceptadas exitosamente. El crédito está listo para su desembolso por el administrador.',
    });
  } catch (error: any) {
    console.error('Error accepting conditions:', error);
    return NextResponse.json(
      { error: 'Error al aceptar condiciones de la solicitud.' },
      { status: 500 }
    );
  }
}

