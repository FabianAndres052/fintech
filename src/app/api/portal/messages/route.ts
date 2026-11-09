import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getClientFromRequest, getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    const admin = !client ? await getAdminFromRequest(req) : null;

    if (!client && !admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');
    const clientIdParam = searchParams.get('clientId');

    const targetClientId = client ? client.id : Number(clientIdParam);

    if (!targetClientId) {
      return NextResponse.json({ error: 'Se requiere el identificador del cliente.' }, { status: 400 });
    }

    let sql = `
      SELECT id, application_id, client_id, sender_type, sender_id, sender_name,
             message, attachment_url, is_read, created_at
      FROM application_messages
      WHERE client_id = ?
    `;
    const params: any[] = [targetClientId];

    if (applicationId) {
      sql += ' AND application_id = ?';
      params.push(Number(applicationId));
    }

    sql += ' ORDER BY id ASC';

    const messages = await query<any[]>(sql, params);

    // Marcar como leídos los mensajes dirigidos a quien consulta
    if (client) {
      await query(
        `UPDATE application_messages SET is_read = 1 WHERE client_id = ? AND sender_type = 'ADMIN' AND is_read = 0`,
        [targetClientId]
      );
    } else if (admin) {
      await query(
        `UPDATE application_messages SET is_read = 1 WHERE client_id = ? AND sender_type = 'CLIENT' AND is_read = 0`,
        [targetClientId]
      );
    }

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Error al obtener mensajes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    const admin = !client ? await getAdminFromRequest(req) : null;

    if (!client && !admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const message = (body.message || '').trim();
    const applicationId = body.application_id ? Number(body.application_id) : null;
    const attachmentUrl = body.attachment_url || null;

    if (!message) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
    }

    let targetClientId: number;
    let senderType: 'CLIENT' | 'ADMIN';
    let senderId: number;
    let senderName: string;

    if (client) {
      targetClientId = client.id;
      senderType = 'CLIENT';
      senderId = client.id;
      senderName = `${client.first_name} ${client.last_name || ''}`.trim();
    } else {
      targetClientId = Number(body.client_id);
      if (!targetClientId) {
        return NextResponse.json({ error: 'Se requiere client_id para enviar el mensaje.' }, { status: 400 });
      }
      senderType = 'ADMIN';
      senderId = admin!.id;
      senderName = admin!.name || 'Asesor FINTECH';
    }

    const [result]: any = await query(
      `INSERT INTO application_messages 
       (application_id, client_id, sender_type, sender_id, sender_name, message, attachment_url, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [applicationId, targetClientId, senderType, senderId, senderName, message, attachmentUrl]
    );

    // Si el remitente fue admin, crear notificación para el cliente en el portal
    if (senderType === 'ADMIN') {
      await query(
        `INSERT INTO portal_notifications (client_id, title, message, type, reference_id, reference_type)
         VALUES (?, ?, ?, 'MESSAGE', ?, 'CHAT')`,
        [
          targetClientId,
          'Nuevo mensaje de tu asesor FINTECH',
          message.length > 80 ? `${message.slice(0, 80)}...` : message,
          String(result.insertId),
        ]
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.insertId,
      message: {
        id: result.insertId,
        application_id: applicationId,
        client_id: targetClientId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message,
        attachment_url: attachmentUrl,
        is_read: 0,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Error al enviar el mensaje.' }, { status: 500 });
  }
}
