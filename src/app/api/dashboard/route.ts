import { NextRequest, NextResponse } from 'next/server';
import { query, syncOverdueStatus } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // Sincronizar automáticamente estados de mora en préstamos y cuotas
    await syncOverdueStatus();

    // Ejecución paralela ultra-rápida de consultas con el pool de conexiones
    const [
      settings,
      loanStats,
      paymentStats,
      clientStats,
      overdueInstallments,
      upcomingInstallments,
      recentMovements,
    ] = await Promise.all([
      // 1. Obtener saldo disponible en caja desde system_settings
      query<any[]>(
        'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" LIMIT 1'
      ),
      // 2. Métricas agregadas de préstamos
      query<any[]>(`
        SELECT 
          COUNT(CASE WHEN status = 'ACTIVO' THEN 1 END) as active_loans_count,
          COUNT(CASE WHEN status = 'EN_MORA' THEN 1 END) as overdue_loans_count,
          COUNT(CASE WHEN status = 'COMPLETADO' THEN 1 END) as completed_loans_count,
          COALESCE(SUM(CASE WHEN status IN ('ACTIVO', 'EN_MORA') THEN balance_remaining ELSE 0 END), 0) as active_portfolio,
          COALESCE(SUM(capital_collected), 0) as total_capital_recovered,
          COALESCE(SUM(interest_collected), 0) as total_interest_collected,
          COALESCE(SUM(CASE WHEN status IN ('ACTIVO', 'EN_MORA') THEN (interest_amount - interest_collected) ELSE 0 END), 0) as total_interest_pending
        FROM loans
      `),
      // 3. Métricas agregadas de recaudos
      query<any[]>(`
        SELECT 
          COALESCE(SUM(amount_paid), 0) as total_payments_received,
          COALESCE(SUM(capital_paid), 0) as capital_recovered_payments,
          COALESCE(SUM(interest_paid), 0) as interest_collected_payments
        FROM payments
      `),
      // 4. Clientes totales
      query<any[]>('SELECT COUNT(*) as total_clients FROM clients WHERE status != "INACTIVO"'),
      // 5. Cuotas en mora (vencidas antes de hoy y no pagadas)
      query<any[]>(`
        SELECT 
          i.id, i.loan_id, i.installment_number, i.due_date, i.total_amount, i.paid_amount, i.balance, i.status,
          c.first_name, c.last_name, c.phone as client_phone,
          CONCAT(c.first_name, ' ', c.last_name) as client_name,
          l.loan_code
        FROM installments i
        JOIN loans l ON i.loan_id = l.id
        JOIN clients c ON l.client_id = c.id
        WHERE i.due_date < CURDATE() AND i.status IN ('PENDIENTE', 'PARCIAL', 'VENCIDA')
        ORDER BY i.due_date ASC
        LIMIT 10
      `),
      // 6. Próximos vencimientos (hoy hasta los siguientes 7 días)
      query<any[]>(`
        SELECT 
          i.id, i.loan_id, i.installment_number, i.due_date, i.total_amount, i.paid_amount, i.balance, i.status,
          c.first_name, c.last_name, c.phone as client_phone,
          CONCAT(c.first_name, ' ', c.last_name) as client_name,
          l.loan_code
        FROM installments i
        JOIN loans l ON i.loan_id = l.id
        JOIN clients c ON l.client_id = c.id
        WHERE i.due_date >= CURDATE() AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          AND i.status IN ('PENDIENTE', 'PARCIAL')
        ORDER BY i.due_date ASC
        LIMIT 10
      `),
      // 7. Movimientos financieros recientes
      query<any[]>(`
        SELECT id, movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_at
        FROM financial_movements
        ORDER BY id DESC
        LIMIT 10
      `),
    ]);

    const availableCash = settings.length > 0 ? Number(settings[0].setting_value) : 0;
    const stats = loanStats[0] || {};
    const pStats = paymentStats[0] || {};
    const totalClients = clientStats[0]?.total_clients || 0;

    const response = NextResponse.json({
      success: true,
      stats: {
        available_cash: availableCash,
        active_portfolio: Number(stats.active_portfolio || 0),
        total_interest_pending: Number(stats.total_interest_pending || 0),
        total_payments_received: Number(pStats.total_payments_received || 0),
        capital_recovered: Number(pStats.capital_recovered_payments || stats.total_capital_recovered || 0),
        interest_collected: Number(pStats.interest_collected_payments || stats.total_interest_collected || 0),
        total_clients: totalClients,
        active_loans_count: Number(stats.active_loans_count || 0),
        overdue_loans_count: Number(stats.overdue_loans_count || 0),
        completed_loans_count: Number(stats.completed_loans_count || 0),
        recent_movements: recentMovements,
        upcoming_installments: upcomingInstallments,
        overdue_installments: overdueInstallments,
      },
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Error al obtener datos del dashboard.' }, { status: 500 });
  }
}
