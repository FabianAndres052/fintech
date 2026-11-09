import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    let sql = `
      SELECT 
        a.*,
        CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) as client_name,
        c.phone as client_phone,
        c.document_number as client_document,
        c.payout_bank as client_payout_bank,
        c.payout_key_type as client_payout_key_type,
        c.payout_key_value as client_payout_key_value,
        COALESCE(u.name, u.username) as reviewer_name,
        COALESCE(d.name, d.username) as disburser_name
      FROM loan_applications a
      JOIN clients c ON a.client_id = c.id
      LEFT JOIN administrators u ON a.reviewed_by = u.id
      LEFT JOIN administrators d ON a.disbursed_by = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'TODOS') {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (clientId) {
      sql += ' AND a.client_id = ?';
      params.push(Number(clientId));
    }

    sql += ' ORDER BY a.id DESC';

    const applications = await query<any[]>(sql, params);

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error('Error fetching admin applications:', error);
    return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 });
  }
}
