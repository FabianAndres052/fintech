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

    const notifications = await query<any[]>(
      `SELECT * FROM portal_notifications WHERE client_id = ? ORDER BY id DESC LIMIT 50`,
      [client.id]
    );

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Error fetching portal notifications:', error);
    return NextResponse.json(
      { error: 'Error al obtener notificaciones.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const notificationId = body.id;

    if (notificationId) {
      await query(
        `UPDATE portal_notifications SET is_read = 1 WHERE id = ? AND client_id = ?`,
        [notificationId, client.id]
      );
    } else {
      // Marcar todas como leídas
      await query(
        `UPDATE portal_notifications SET is_read = 1 WHERE client_id = ?`,
        [client.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating portal notifications:', error);
    return NextResponse.json(
      { error: 'Error al actualizar notificaciones.' },
      { status: 500 }
    );
  }
}
