'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import NewLoanModal from '@/components/NewLoanModal';
import PaymentModal from '@/components/PaymentModal';
import CashMovementModal from '@/components/CashMovementModal';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Users,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  ChevronRight,
  Banknote,
  DollarSign,
  PlusCircle,
  Receipt,
} from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/calculations';
import { DashboardStats } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Modales
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCashOpen, setIsCashOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Verificar sesión admin
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }
      setAdminUser(authData.admin);

      // Cargar estadísticas
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-neutral-400">Cargando métricas FINTECH...</span>
        </div>
      </div>
    );
  }

  const s = stats || {
    available_cash: 0,
    active_portfolio: 0,
    total_interest_pending: 0,
    total_payments_received: 0,
    capital_recovered: 0,
    interest_collected: 0,
    total_clients: 0,
    active_loans_count: 0,
    overdue_loans_count: 0,
    completed_loans_count: 0,
    recent_movements: [],
    upcoming_installments: [],
    overdue_installments: [],
  };

  return (
    <div className="flex min-h-screen bg-black text-neutral-100">
      {/* Desktop Sidebar */}
      <Sidebar
        adminName={adminUser?.name}
        adminEmail={adminUser?.email}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <Header
          title="Dashboard Financiero"
          subtitle="Monitoreo en tiempo real de capital, cartera, cobros y liquidez"
          availableCash={s.available_cash}
          onNewLoan={() => setIsNewLoanOpen(true)}
          onNewPayment={() => setIsPaymentOpen(true)}
          onCashMovement={() => setIsCashOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 space-y-7 max-w-7xl mx-auto w-full">
          {/* Quick Action Greeting Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-neutral-950 border border-neutral-800 p-6 shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-red-500">
                  Panel de Control Maestro
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Hola, {adminUser?.name || 'Administrador'} 👋
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
                  Tu cartera actual suma{' '}
                  <span className="text-white font-bold">{formatCOP(s.active_portfolio)}</span>{' '}
                  en colocación activa con{' '}
                  <span className="text-emerald-400 font-bold">{s.active_loans_count} préstamos vigentes</span>.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsPaymentOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-100 border border-neutral-700 transition-all cursor-pointer shadow-sm"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Cobrar Cuota</span>
                </button>
                <button
                  onClick={() => setIsNewLoanOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-lg shadow-red-950/60"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Prestar Capital</span>
                </button>
              </div>
            </div>

            {/* Subtle glow */}
            <div className="absolute right-0 top-0 w-80 h-80 bg-red-950/15 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Tarjetas Estadísticas Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Capital Disponible en Caja */}
            <div
              onClick={() => setIsCashOpen(true)}
              className="bg-neutral-950/80 rounded-2xl p-5 border border-neutral-800 hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Caja Disponible
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-950/50 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/30">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-400 mt-3 tracking-tight">
                {formatCOP(s.available_cash)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400/80">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Liquidez inmediata para desembolsos</span>
              </div>
            </div>

            {/* 2. Cartera Activa (Capital prestado pendiente) */}
            <div className="bg-neutral-950/80 rounded-2xl p-5 border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Cartera Activa
                </span>
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-neutral-200 flex items-center justify-center border border-neutral-700">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-3 tracking-tight">
                {formatCOP(s.active_portfolio)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span>{s.active_loans_count} préstamos en colocación</span>
              </div>
            </div>

            {/* 3. Intereses Cobrados (Ganancia Real) */}
            <div className="bg-neutral-950/80 rounded-2xl p-5 border border-neutral-800 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Ganancia Intereses
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-400 mt-3 tracking-tight">
                {formatCOP(s.interest_collected)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span>Interés real cobrado y realizado</span>
              </div>
            </div>

            {/* 4. Capital Recuperado */}
            <div className="bg-neutral-950/80 rounded-2xl p-5 border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Capital Recuperado
                </span>
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-700">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-3 tracking-tight">
                {formatCOP(s.capital_recovered)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span>Amortización pura retornada a caja</span>
              </div>
            </div>
          </div>

          {/* Segunda Fila: Métricas Secundarias */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-semibold">Total Clientes</span>
              <p className="text-xl font-bold text-white mt-1">{s.total_clients}</p>
            </div>
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-semibold">Préstamos en Mora</span>
              <p className="text-xl font-bold text-red-400 mt-1">{s.overdue_loans_count}</p>
            </div>
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-semibold">Préstamos Liquidados</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">{s.completed_loans_count}</p>
            </div>
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-semibold">Interés Futuro por Cobrar</span>
              <p className="text-xl font-bold text-white mt-1">
                {formatCOP(s.total_interest_pending)}
              </p>
            </div>
          </div>

          {/* Vencimientos: En Mora vs Próximos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cuotas en Mora */}
            <div className="bg-neutral-950 rounded-3xl p-5 border border-neutral-800 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-800/40 text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Vencimientos en Mora</h3>
                    <p className="text-[11px] text-neutral-400">Cuotas no pagadas anteriores a hoy</p>
                  </div>
                </div>
                <Link
                  href="/cuotas?filter=mora"
                  className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                >
                  <span>Ver todas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {s.overdue_installments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mb-2" />
                  <p className="text-xs text-neutral-400">No hay cuotas en mora en este momento.</p>
                  <p className="text-[11px] text-neutral-500">¡Tu cartera está completamente al día!</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-64">
                  {s.overdue_installments.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-3 rounded-xl bg-neutral-900 border border-red-900/30 hover:border-red-700/50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{inst.client_name}</p>
                        <p className="text-[11px] text-neutral-400">
                          {inst.loan_code} · Cuota #{inst.installment_number} · Venció:{' '}
                          <span className="text-red-400 font-semibold">
                            {formatDate(inst.due_date)}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-red-400">
                          {formatCOP(inst.balance)}
                        </p>
                        <button
                          onClick={() => setIsPaymentOpen(true)}
                          className="mt-1 px-2.5 py-0.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-[10px] font-bold text-red-300 cursor-pointer"
                        >
                          Cobrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Próximos Vencimientos (Siguientes 7 días) */}
            <div className="bg-neutral-950 rounded-3xl p-5 border border-neutral-800 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Próximos Cobros</h3>
                    <p className="text-[11px] text-neutral-400">Cuotas a vencer en los siguientes 7 días</p>
                  </div>
                </div>
                <Link
                  href="/cuotas"
                  className="text-xs text-neutral-400 hover:text-white font-semibold flex items-center gap-1"
                >
                  <span>Calendario</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {s.upcoming_installments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="w-8 h-8 text-neutral-600 mb-2" />
                  <p className="text-xs text-neutral-400">No hay cuotas programadas para los próximos 7 días.</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-64">
                  {s.upcoming_installments.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{inst.client_name}</p>
                        <p className="text-[11px] text-neutral-400">
                          {inst.loan_code} · Cuota #{inst.installment_number} · Vence:{' '}
                          <span className="text-neutral-300 font-medium">
                            {formatDate(inst.due_date)}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-white">
                          {formatCOP(inst.total_amount)}
                        </p>
                        <button
                          onClick={() => setIsPaymentOpen(true)}
                          className="mt-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 cursor-pointer"
                        >
                          Recaudar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Movimientos Recientes de Caja */}
          <div className="bg-neutral-950 rounded-3xl p-5 border border-neutral-800">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Movimientos Financieros Recientes</h3>
                <p className="text-[11px] text-neutral-400">Flujo de efectivo, cobros y desembolsos</p>
              </div>
              <Link
                href="/caja"
                className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
              >
                <span>Ver Libro Mayor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Concepto</th>
                    <th className="py-2.5 px-3">Monto</th>
                    <th className="py-2.5 px-3">Medio</th>
                    <th className="py-2.5 px-3">Saldo Caja</th>
                    <th className="py-2.5 px-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {s.recent_movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-neutral-500">
                        No hay movimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    s.recent_movements.map((mov) => {
                      const isPositive =
                        mov.type === 'COBRO_CUOTA' ||
                        mov.type === 'APORTE_CAPITAL' ||
                        mov.type === 'INGRESO';

                      return (
                        <tr key={mov.id} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-neutral-400">{mov.movement_code}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                mov.type === 'COBRO_CUOTA'
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                                  : mov.type === 'DESEMBOLSO_PRESTAMO'
                                  ? 'bg-amber-950/40 text-amber-400 border border-amber-500/30'
                                  : mov.type === 'GASTO' || mov.type === 'RETIRO_CAPITAL'
                                  ? 'bg-red-950/40 text-red-400 border border-red-800/30'
                                  : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                              }`}
                            >
                              {mov.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-300 max-w-xs truncate">
                            {mov.description}
                          </td>
                          <td
                            className={`py-2.5 px-3 font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isPositive ? '+' : '-'} {formatCOP(mov.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">{mov.payment_method}</td>
                          <td className="py-2.5 px-3 font-semibold text-neutral-200">
                            {formatCOP(mov.balance_after)}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">{formatDate(mov.created_at)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav onLogout={handleLogout} />

      {/* Interactive Modals */}
      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => setIsNewLoanOpen(false)}
        onSuccess={fetchDashboardData}
        availableCash={s.available_cash}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <CashMovementModal
        isOpen={isCashOpen}
        onClose={() => setIsCashOpen(false)}
        onSuccess={fetchDashboardData}
        currentCash={s.available_cash}
      />
    </div>
  );
}
