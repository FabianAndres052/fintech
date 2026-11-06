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
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/calculations';
import { DashboardStats } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('admin_user');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  // Modales
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCashOpen, setIsCashOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [authRes, dashRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/dashboard'),
      ]);

      const authData = await authRes.json().catch(() => ({}));
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }
      setAdminUser(authData.admin);
      if (typeof window !== 'undefined' && authData.admin) {
        localStorage.setItem('admin_user', JSON.stringify(authData.admin));
      }

      const data = await dashRes.json().catch(() => ({}));
      if (data.success && data.stats) {
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
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    }
    router.push('/login?logout=1');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#8B5CF6]/20 border-t-[#E5092F] rounded-full animate-spin" />
          <span className="text-xs font-semibold text-neutral-400 tracking-wider">Cargando métricas FINTECH...</span>
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
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      {/* Desktop Sidebar */}
      <Sidebar
        adminName={adminUser?.name}
        adminEmail={adminUser?.email}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Dashboard"
          subtitle="Tu negocio, en control"
          availableCash={s.available_cash}
          onNewLoan={() => setIsNewLoanOpen(true)}
          onNewPayment={() => setIsPaymentOpen(true)}
          onCashMovement={() => setIsCashOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* TOP HERO CARD (Exacto al Mockup: Capital Prestado + Gráfico de Onda) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1126] via-[#14101F] to-[#250F18] border border-[#8B5CF6]/30 p-6 sm:p-7 shadow-2xl shadow-purple-950/30">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#E5092F]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs sm:text-sm font-semibold text-neutral-400">
                    Capital Prestado / Cartera Activa
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                    <span>↑ 12%</span>
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  {formatCOP(s.active_portfolio)}
                </h2>
                <p className="text-xs text-neutral-400 mt-2 max-w-lg">
                  Total de obligaciones vigentes bajo gestión y recaudación en FINTECH.
                </p>
              </div>

              {/* Botones de Acción Rápida en el Hero */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPaymentOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-[#1C1A29] hover:bg-[#252238] text-white border border-[#8B5CF6]/40 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Receipt className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Abonar</span>
                </button>
                <button
                  onClick={() => setIsNewLoanOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white transition-all cursor-pointer shadow-lg shadow-red-950/60 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nuevo Préstamo</span>
                </button>
              </div>
            </div>

            {/* Gráfico Vectorial de Onda Fluida (Visual Wave Gradient) */}
            <div className="relative mt-4 sm:mt-6 h-20 w-full overflow-hidden">
              <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="w-full h-full opacity-80">
                <defs>
                  <linearGradient id="heroWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E5092F" />
                    <stop offset="50%" stopColor="#C026D3" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                  <linearGradient id="heroAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 Q250,20 500,60 T1000,30 L1000,120 L0,120 Z"
                  fill="url(#heroAreaGrad)"
                />
                <path
                  d="M0,80 Q250,20 500,60 T1000,30"
                  fill="none"
                  stroke="url(#heroWaveGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* 4 STAT CARDS EN GRID 2X2 (Como en la Imagen de Referencia) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Clientes */}
            <Link
              href="/clientes"
              className="bg-[#121118] hover:bg-[#181622] rounded-3xl p-4 sm:p-5 border border-[#2D2545] transition-all group active:scale-95 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Clientes</span>
                <div className="w-9 h-9 rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#8B5CF6]/30">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">{s.total_clients}</p>
                <p className="text-[11px] text-[#A78BFA] mt-0.5">Activos en el sistema</p>
              </div>
            </Link>

            {/* 2. Créditos */}
            <Link
              href="/prestamos"
              className="bg-[#121118] hover:bg-[#181622] rounded-3xl p-4 sm:p-5 border border-[#2D2545] transition-all group active:scale-95 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Créditos</span>
                <div className="w-9 h-9 rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#8B5CF6]/30">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">{s.active_loans_count}</p>
                <p className="text-[11px] text-[#A78BFA] mt-0.5">Obligaciones vigentes</p>
              </div>
            </Link>

            {/* 3. Recibido (Abonos Totales) */}
            <Link
              href="/pagos"
              className="bg-[#121118] hover:bg-[#181622] rounded-3xl p-4 sm:p-5 border border-[#2D2545] transition-all group active:scale-95 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Recibido</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/30">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
                  {formatCOP(s.total_payments_received)}
                </p>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">Total recaudado</p>
              </div>
            </Link>

            {/* 4. Pendiente (Saldo Cartera) */}
            <div className="bg-[#121118] rounded-3xl p-4 sm:p-5 border border-[#2D2545] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Pendiente</span>
                <div className="w-9 h-9 rounded-2xl bg-[#E5092F]/15 text-[#E5092F] flex items-center justify-center border border-[#E5092F]/30">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {formatCOP(s.active_portfolio)}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Saldo por cobrar</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN PRÓXIMOS VENCIMIENTOS & RESUMEN FINANCIERO (2 COLUMNAS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Próximos Vencimientos */}
            <div className="bg-[#121118] rounded-3xl p-5 sm:p-6 border border-[#2D2545] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[#221D33] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center border border-[#8B5CF6]/30">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Próximos Vencimientos</h3>
                    <p className="text-[11px] text-neutral-400">Cobros programados de la semana</p>
                  </div>
                </div>
                <Link
                  href="/cuotas"
                  className="text-xs font-bold text-[#E5092F] hover:text-[#FF1744] flex items-center gap-1 transition-colors"
                >
                  <span>Ver todos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {s.upcoming_installments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mb-2" />
                  <p className="text-xs font-medium text-neutral-300">No hay cuotas pendientes para los próximos días.</p>
                  <p className="text-[11px] text-neutral-500">Todas las obligaciones se encuentran al día.</p>
                </div>
              ) : (
                <div className="space-y-2.5 overflow-y-auto max-h-72 touch-scroll">
                  {s.upcoming_installments.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-3.5 rounded-2xl bg-[#181622] hover:bg-[#1E1B2C] border border-[#2D2545] flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{inst.client_name}</p>
                          <p className="text-[11px] text-neutral-400">
                            {formatDate(inst.due_date)} · Cuota #{inst.installment_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-black text-[#E5092F] bg-[#E5092F]/10 px-2.5 py-1 rounded-xl border border-[#E5092F]/20">
                          {formatCOP(inst.total_amount)}
                        </span>
                        <button
                          onClick={() => setIsPaymentOpen(true)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#E5092F] hover:bg-[#C40726] text-white transition-colors"
                        >
                          Cobrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen Financiero con Gráfico Elegante */}
            <div className="bg-[#121118] rounded-3xl p-5 sm:p-6 border border-[#2D2545] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[#221D33] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] text-white flex items-center justify-center shadow-md">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Resumen Financiero</h3>
                    <p className="text-[11px] text-neutral-400">Evolución de cobros y rentabilidad</p>
                  </div>
                </div>
                <Link
                  href="/contabilidad"
                  className="text-xs font-bold text-[#A78BFA] hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>Finanzas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Gráfico de Líneas / Puntos Representativo (Sep, Oct, Nov, Dic) */}
              <div className="flex-1 flex flex-col justify-between pt-2">
                <div className="relative h-40 w-full flex items-end justify-between px-4 pb-2">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-neutral-600 w-full" />
                    <div className="border-b border-neutral-600 w-full" />
                    <div className="border-b border-neutral-600 w-full" />
                  </div>

                  {/* SVG Line / Dots */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 150">
                    <defs>
                      <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="50%" stopColor="#C026D3" />
                        <stop offset="100%" stopColor="#E5092F" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 30 110 Q 130 90 230 40 T 370 20"
                      fill="none"
                      stroke="url(#chartLineGrad)"
                      strokeWidth="3.5"
                    />
                    {/* Points */}
                    <circle cx="30" cy="110" r="5" fill="#8B5CF6" />
                    <circle cx="140" cy="95" r="5" fill="#A855F7" />
                    <circle cx="250" cy="45" r="5" fill="#D946EF" />
                    <circle cx="370" cy="20" r="6" fill="#E5092F" />
                  </svg>
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between px-4 text-xs font-semibold text-neutral-400 pt-2 border-t border-[#221D33]">
                  <span>Sep</span>
                  <span>Oct</span>
                  <span>Nov</span>
                  <span className="text-[#E5092F] font-bold">Dic</span>
                </div>

                {/* Bottom Financial Metric Pills */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#221D33]">
                  <div className="p-2.5 rounded-2xl bg-[#181622] border border-[#2D2545]">
                    <span className="text-[10px] text-neutral-400 block">Ganancia en Intereses</span>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatCOP(s.interest_collected)}</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-[#181622] border border-[#2D2545]">
                    <span className="text-[10px] text-neutral-400 block">Capital Retornado</span>
                    <p className="text-sm font-bold text-white mt-0.5">{formatCOP(s.capital_recovered)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VENCIMIENTOS EN MORA (SI EXISTEN) */}
          {s.overdue_installments.length > 0 && (
            <div className="bg-[#121118] rounded-3xl p-5 border border-red-900/40">
              <div className="flex items-center justify-between pb-3 border-b border-[#221D33] mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-950/50 border border-red-800/40 text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cuotas con Retraso / En Mora</h3>
                    <p className="text-[11px] text-neutral-400">Vencimientos anteriores que requieren gestión</p>
                  </div>
                </div>
                <Link href="/cuotas?filter=mora" className="text-xs text-red-400 font-bold hover:underline">
                  Ver todas
                </Link>
              </div>

              <div className="space-y-2">
                {s.overdue_installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3 rounded-2xl bg-neutral-900/80 border border-red-900/30 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{inst.client_name}</p>
                      <p className="text-[11px] text-neutral-400">
                        {inst.loan_code} · Cuota #{inst.installment_number} · Venció:{' '}
                        <span className="text-red-400 font-semibold">{formatDate(inst.due_date)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-red-400">{formatCOP(inst.balance)}</p>
                      <button
                        onClick={() => setIsPaymentOpen(true)}
                        className="mt-1 px-2.5 py-0.5 rounded-lg bg-red-950/60 border border-red-800 text-[10px] font-bold text-red-300"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MOVIMIENTOS RECIENTES DE CAJA */}
          <div className="bg-[#121118] rounded-3xl p-5 sm:p-6 border border-[#2D2545]">
            <div className="flex items-center justify-between pb-3 border-b border-[#221D33] mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Movimientos Financieros Recientes</h3>
                <p className="text-[11px] text-neutral-400">Flujo de caja, cobros y desembolsos</p>
              </div>
              <Link
                href="/caja"
                className="text-xs text-[#E5092F] hover:text-white font-bold flex items-center gap-1 transition-colors"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto touch-scroll">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181622] text-neutral-400 border-b border-[#221D33]">
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
                <tbody className="divide-y divide-[#221D33]/60">
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
                        <tr key={mov.id} className="hover:bg-[#181622]/50 transition-colors">
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
                              isPositive ? 'text-emerald-400' : 'text-[#E5092F]'
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
