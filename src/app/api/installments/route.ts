import { NextRequest, NextResponse } from 'next/server';
import { query, syncOverdueStatus } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Sincronizar automáticamente estados de cuotas vencidas
    await syncOverdueStatus();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'mora', 'hoy', 'semana', 'mes', 'todas', or status
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    let sql = `
      SELECT 
        i.*,
        l.loan_code,
        l.periodicity,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
        c.document_number as client_document,
        c.phone as client_phone,
        DATEDIFF(CURDATE(), i.due_date) as days_overdue
      FROM installments i
      JOIN loans l ON i.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter === 'mora') {
      sql += ' AND i.due_date < CURDATE() AND i.status IN ("PENDIENTE", "PARCIAL", "VENCIDA")';
    } else if (filter === 'hoy') {
      sql += ' AND i.due_date = CURDATE() AND i.status IN ("PENDIENTE", "PARCIAL")';
    } else if (filter === 'semana') {
      sql += ' AND i.due_date >= CURDATE() AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND i.status IN ("PENDIENTE", "PARCIAL")';
    } else if (status && status !== 'TODAS') {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (l.loan_code LIKE ? OR c.document_number LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p);
    }

    sql += ' ORDER BY i.due_date ASC, i.installment_number ASC LIMIT 250';

    const installments = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, installments });
  } catch (error: any) {
    console.error('Error fetching installments:', error);
    return NextResponse.json({ error: 'Error al consultar cuotas.' }, { status: 500 });
  }
}
