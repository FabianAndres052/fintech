import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';
import { formatCOP, formatDate } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Consultas paralelas para construir el listado de notificaciones inteligentes
    const [loginLogs, recentPayments, upcomingInstallments, overdueInstallments] = await Promise.all([
      // 1. Inicios de sesión recientes
      query<any[]>(`
        SELECT id, action, details, ip_address, created_at
        FROM audit_logs
        WHERE action = 'LOGIN_SUCCESS'
        ORDER BY id DESC
        LIMIT 5
      `),
      // 2. Pagos recientes
      query<any[]>(`
        SELECT p.id, p.payment_code, p.amount_paid, p.payment_method, p.payment_date, p.created_at,
               c.first_name, c.last_name, l.loan_code
        FROM payments p
        JOIN loans l ON p.loan_id = l.id
        JOIN clients c ON l.client_id = c.id
        ORDER BY p.id DESC
        LIMIT 5
      `),
      // 3. Próximos vencimientos (siguientes 7 días)
      query<any[]>(`
        SELECT i.id, i.installment_number, i.due_date, i.total_amount, i.balance,
               c.first_name, c.last_name, l.loan_code
        FROM installments i
        JOIN loans l ON i.loan_id = l.id
        JOIN clients c ON l.client_id = c.id
        WHERE i.due_date >= CURDATE() AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          AND i.status IN ('PENDIENTE', 'PARCIAL')
        ORDER BY i.due_date ASC
        LIMIT 5
      `),
      // 4. Cuotas en mora
      query<any[]>(`
        SELECT i.id, i.installment_number, i.due_date, i.balance,
               c.first_name, c.last_name, l.loan_code
        FROM installments i
        JOIN loans l ON i.loan_id = l.id
        JOIN clients c ON l.client_id = c.id
        WHERE i.due_date < CURDATE()
          AND i.status IN ('PENDIENTE', 'PARCIAL', 'VENCIDA')
        ORDER BY i.due_date ASC
        LIMIT 5
      `),
    ]);

    const notifications: any[] = [];

    // Formatear inicios de sesión
    loginLogs.forEach((log) => {
      let clientIp = log.ip_address || '127.0.0.1';
      notifications.push({
        id: `login-${log.id}`,
        type: 'login',
        title: 'Inicio de Sesión Exitoso',
        message: `Acceso administrativo autorizado registrado desde IP ${clientIp}.`,
        time: log.created_at,
        unread: false,
      });
    });

    // Formatear recaudos
    recentPayments.forEach((p) => {
      notifications.push({
        id: `pay-${p.id}`,
        type: 'payment',
        title: 'Recaudo Confirmado',
        message: `Abono de ${formatCOP(p.amount_paid)} recibido de ${p.first_name} ${p.last_name || ''} (${p.loan_code}) vía ${p.payment_method}.`,
        time: p.created_at || p.payment_date,
        unread: false,
      });
    });

    // Formatear cuotas en mora (Prioridad Alta)
    overdueInstallments.forEach((inst) => {
      notifications.push({
        id: `overdue-${inst.id}`,
        type: 'overdue',
        title: 'Cuota en Mora Detectada',
        message: `Cuota #${inst.installment_number} de ${inst.first_name} ${inst.last_name || ''} (${inst.loan_code}) venció el ${formatDate(inst.due_date)}. Saldo: ${formatCOP(inst.balance)}.`,
        time: inst.due_date,
        unread: true,
      });
    });

    // Formatear próximos vencimientos
    upcomingInstallments.forEach((inst) => {
      notifications.push({
        id: `upcoming-${inst.id}`,
        type: 'upcoming',
        title: 'Próximo Vencimiento',
        message: `Cuota #${inst.installment_number} de ${inst.first_name} ${inst.last_name || ''} vence el ${formatDate(inst.due_date)} por ${formatCOP(inst.total_amount)}.`,
        time: inst.due_date,
        unread: true,
      });
    });

    // Ordenar cronológicamente descendente
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notifications.filter((n) => n.unread).length,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error al consultar notificaciones' }, { status: 500 });
  }
}

