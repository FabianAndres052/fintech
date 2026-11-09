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

    const clientId = client.id;

    // 1. Obtener préstamos del cliente
    const loans = await query<any[]>(
      `SELECT id, loan_code, capital_amount, total_amount, balance_remaining,
              capital_collected, interest_collected, installments_count, periodicity,
              payment_per_installment, disbursement_date, start_date, end_date, status, notes
       FROM loans
       WHERE client_id = ?
       ORDER BY id ASC`,
      [clientId]
    );

    const activeLoans = loans.filter((l) => l.status === 'ACTIVO' || l.status === 'EN_MORA');
    const totalPendingBalance = activeLoans.reduce((sum, l) => sum + Number(l.balance_remaining || 0), 0);

    // 2. Próximo vencimiento más cercano
    const [nextDue] = await query<any[]>(
      `SELECT i.id, i.loan_id, i.installment_number, i.due_date, i.total_amount, i.balance, l.loan_code
       FROM installments i
       JOIN loans l ON i.loan_id = l.id
       WHERE l.client_id = ? AND i.status IN ('PENDIENTE', 'PARCIAL')
       ORDER BY i.due_date ASC
       LIMIT 1`,
      [clientId]
    );

    // 3. Métricas de cumplimiento de pago (Pagos al día %)
    const [installmentStats] = await query<any[]>(
      `SELECT 
         COUNT(*) as total_installments,
         SUM(CASE WHEN i.status = 'PAGADA' THEN 1 ELSE 0 END) as paid_installments,
         SUM(CASE WHEN i.status = 'VENCIDA' THEN 1 ELSE 0 END) as overdue_installments
       FROM installments i
       JOIN loans l ON i.loan_id = l.id
       WHERE l.client_id = ?`,
      [clientId]
    );

    let onTimePercentage = 100;
    const totalInst = Number(installmentStats[0]?.total_installments || 0);
    const paidInst = Number(installmentStats[0]?.paid_installments || 0);
    const overdueInst = Number(installmentStats[0]?.overdue_installments || 0);

    if (totalInst > 0) {
      const nonOverdue = totalInst - overdueInst;
      onTimePercentage = Math.max(0, Math.min(100, Math.round((nonOverdue / totalInst) * 100)));
    }

    // 4. Enriquecer préstamos activos con progreso y próxima cuota
    const enrichedLoans = await Promise.all(
      activeLoans.map(async (l) => {
        const total = Number(l.total_amount || 0);
        const balance = Number(l.balance_remaining || 0);
        const paid = Math.max(0, total - balance);
        const progressPercentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

        const [nextInst] = await query<any[]>(
          `SELECT installment_number, due_date, total_amount, balance
           FROM installments
           WHERE loan_id = ? AND status IN ('PENDIENTE', 'PARCIAL')
           ORDER BY installment_number ASC
           LIMIT 1`,
          [l.id]
        );

        const [instCounts] = await query<any[]>(
          `SELECT 
             COUNT(*) as total_count,
             SUM(CASE WHEN status = 'PAGADA' THEN 1 ELSE 0 END) as paid_count,
             SUM(CASE WHEN status IN ('PENDIENTE', 'PARCIAL', 'VENCIDA') THEN 1 ELSE 0 END) as pending_count
           FROM installments
           WHERE loan_id = ?`,
          [l.id]
        );

        return {
          ...l,
          paid_amount: paid,
          progress_percentage: progressPercentage,
          total_installments: Number(instCounts[0]?.total_count || l.installments_count || 0),
          paid_installments: Number(instCounts[0]?.paid_count || 0),
          pending_installments: Number(instCounts[0]?.pending_count || 0),
          next_installment: nextInst[0] || null,
        };
      })
    );

    // 5. Historial reciente de pagos (últimos 5)
    const recentPayments = await query<any[]>(
      `SELECT p.id, p.payment_code, p.loan_id, l.loan_code, p.installment_id,
              i.installment_number, p.amount_paid, p.payment_method, p.payment_date,
              p.receipt_url, r.receipt_code
       FROM payments p
       JOIN loans l ON p.loan_id = l.id
       LEFT JOIN installments i ON p.installment_id = i.id
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.client_id = ?
       ORDER BY p.id DESC
       LIMIT 5`,
      [clientId]
    );

    // 6. Solicitudes de préstamo recientes
    const recentApplications = await query<any[]>(
      `SELECT id, application_code, requested_amount, requested_installments,
              requested_periodicity, reason, status, approved_capital, approved_total_amount,
              approved_installments, created_at
       FROM loan_applications
       WHERE client_id = ?
       ORDER BY id DESC
       LIMIT 5`,
      [clientId]
    );

    // 7. Notificaciones recientes y conteo de no leídas
    const notifications = await query<any[]>(
      `SELECT id, title, message, type, reference_id, reference_type, is_read, created_at
       FROM portal_notifications
       WHERE client_id = ?
       ORDER BY id DESC
       LIMIT 6`,
      [clientId]
    );

    const [unreadCountResult] = await query<any[]>(
      `SELECT COUNT(*) as unread_count
       FROM portal_notifications
       WHERE client_id = ? AND is_read = 0`,
      [clientId]
    );

    return NextResponse.json({
      client: {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        full_name: `${client.first_name} ${client.last_name || ''}`.trim(),
        document_type: client.document_type || 'CC',
        document_number: client.document_number,
        phone: client.phone,
        email: client.email,
        payout_bank: client.payout_bank,
        payout_key_type: client.payout_key_type,
        payout_key_value: client.payout_key_value,
      },
      summary: {
        activeLoansCount: activeLoans.length,
        totalPendingBalance,
        nextDueDate: nextDue[0]?.due_date || null,
        nextDueAmount: nextDue[0]?.balance || nextDue[0]?.total_amount || 0,
        nextDueLoanCode: nextDue[0]?.loan_code || null,
        nextDueInstallmentNumber: nextDue[0]?.installment_number || null,
        onTimePaymentPercentage: onTimePercentage,
        unreadNotificationsCount: Number(unreadCountResult[0]?.unread_count || 0),
      },
      activeLoans: enrichedLoans,
      recentPayments,
      recentApplications,
      notifications,
    });
  } catch (error: any) {
    console.error('Error fetching portal dashboard:', error);
    return NextResponse.json(
      { error: 'Error al cargar los datos del portal.' },
      { status: 500 }
    );
  }
}
