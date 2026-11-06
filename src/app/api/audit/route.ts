import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (admin.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Acceso restringido: Se requieren privilegios exclusivos de Super Administrador.' },
        { status: 403 }
      );
    }

    const logs = await query<any[]>(`
      SELECT a.*, adm.name as admin_name, adm.email as admin_email
      FROM audit_logs a
      LEFT JOIN administrators adm ON a.user_id = adm.id
      ORDER BY a.id DESC
      LIMIT 150
    `);

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Error al consultar logs de auditoría.' }, { status: 500 });
  }
}
