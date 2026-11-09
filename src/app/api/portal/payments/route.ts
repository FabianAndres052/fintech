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

    const payments = await query<any[]>(
      `SELECT p.*, l.loan_code, l.capital_amount, l.total_amount as loan_total,
              i.installment_number, i.due_date as installment_due_date,
              r.receipt_code, r.id as receipt_id
       FROM payments p
       JOIN loans l ON p.loan_id = l.id
       LEFT JOIN installments i ON p.installment_id = i.id
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.client_id = ?
       ORDER BY p.id DESC`,
      [client.id]
    );

    return NextResponse.json({
      payments,
    });
  } catch (error: any) {
    console.error('Error fetching portal payments:', error);
    return NextResponse.json(
      { error: 'Error al obtener pagos del cliente.' },
      { status: 500 }
    );
  }
}
