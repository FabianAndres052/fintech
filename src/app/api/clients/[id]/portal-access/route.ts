import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const clientId = Number(id);

    const clients = await query<any[]>('SELECT * FROM clients WHERE id = ? LIMIT 1', [clientId]);
    if (!clients || clients.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const client = clients[0];
    const body = await req.json();
    const action = body.action; // 'SET_PASSWORD' | 'TOGGLE_ACCESS' | 'RESET_DEFAULT'

    if (action === 'TOGGLE_ACCESS') {
      const newAccess = client.portal_access === 1 ? 0 : 1;
      await query('UPDATE clients SET portal_access = ? WHERE id = ?', [newAccess, clientId]);
      return NextResponse.json({
        success: true,
        portal_access: newAccess,
        message: newAccess === 1 ? 'Acceso al portal activado para el cliente.' : 'Acceso al portal suspendido para el cliente.',
      });
    }

    if (action === 'SET_PASSWORD' || action === 'RESET_DEFAULT') {
      const newPassword = body.password || (action === 'RESET_DEFAULT' ? 'Fintech2026*' : null);
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
      }

      const hash = await hashPassword(newPassword);
      await query('UPDATE clients SET password_hash = ?, portal_access = 1 WHERE id = ?', [hash, clientId]);

      const clientName = `${client.first_name} ${client.last_name || ''}`.trim();
      const loginIdentifier = client.phone || client.document_number || 'tu número registrado';
      const whatsappMsg = `¡Hola ${clientName}! Tu acceso al Portal de Clientes FINTECH ha sido configurado.\n\n` +
        `🌐 *Portal:* https://fintech-ten-theta.vercel.app/portal\n` +
        `👤 *Usuario:* ${loginIdentifier}\n` +
        `🔑 *Contraseña:* ${newPassword}\n\n` +
        `Desde allí podrás consultar tus créditos, pagar cuotas, abonar y solicitar nuevos préstamos.`;

      // Auditoría
      query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [
          admin.id,
          'CLIENT_PORTAL_PASSWORD_RESET',
          'clients',
          String(clientId),
          JSON.stringify({ clientName, action }),
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'Contraseña actualizada y acceso al portal habilitado.',
        password: newPassword,
        whatsappMessage: encodeURIComponent(whatsappMsg),
        rawMessage: whatsappMsg,
      });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing client portal access:', error);
    return NextResponse.json({ error: 'Error al gestionar acceso al portal' }, { status: 500 });
  }
}

