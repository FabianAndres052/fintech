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

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    let sql = `
      SELECT id, receipt_code, client_id, loan_id, payment_id, receipt_type,
             is_consolidated, receipt_date, total_amount, client_name, client_phone,
             client_document, items_json, summary_json, whatsapp_sent, whatsapp_sent_at,
             notes, created_at
      FROM receipts
      WHERE client_id = ?
    `;
    const params: any[] = [client.id];

    if (code) {
      sql += ' AND receipt_code = ?';
      params.push(code);
    }

    sql += ' ORDER BY id DESC';

    const receipts = await query<any[]>(sql, params);

    const parsed = receipts.map((r) => ({
      ...r,
      items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json,
      summary: typeof r.summary_json === 'string' ? JSON.parse(r.summary_json) : r.summary_json,
    }));

    return NextResponse.json({
      receipts: parsed,
    });
  } catch (error: any) {
    console.error('Error fetching portal receipts:', error);
    return NextResponse.json(
      { error: 'Error al obtener recibos.' },
      { status: 500 }
    );
  }
}
