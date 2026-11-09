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

    const loans = await query<any[]>(
      `SELECT * FROM loans WHERE client_id = ? ORDER BY id ASC`,
      [client.id]
    );

    const fullLoans = await Promise.all(
      loans.map(async (l) => {
        const installments = await query<any[]>(
          `SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_number ASC`,
          [l.id]
        );

        const total = Number(l.total_amount || 0);
        const balance = Number(l.balance_remaining || 0);
        const paid = Math.max(0, total - balance);
        const progressPercentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

        return {
          ...l,
          paid_amount: paid,
          progress_percentage: progressPercentage,
          installments,
        };
      })
    );

    return NextResponse.json({
      loans: fullLoans,
    });
  } catch (error: any) {
    console.error('Error fetching portal credits:', error);
    return NextResponse.json(
      { error: 'Error al obtener créditos del cliente.' },
      { status: 500 }
    );
  }
}

