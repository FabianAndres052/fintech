'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PortalDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch(() => {
        router.push('/portal/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Al día';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Hace un momento';
      if (mins < 60) return `Hace ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Hace ${hours} h`;
      const days = Math.floor(hours / 24);
      return `Hace ${days} d`;
    } catch {
      return 'Reciente';
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400 gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="text-xs">Cargando tus datos financieros...</p>
      </div>
    );
  }

  const { client, summary, activeLoans, recentPayments, recentApplications, notifications } = data;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 1. HERO BANNER */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-gradient-to-r from-[#28154A] via-[#3B1761] to-[#E5092F]/40 border border-[#52298F]/50 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-radial from-[#E5092F]/30 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-4 pointer-events-none">
          {/* Decorative 3D Phone Icon Graphic */}
          <div className="w-24 h-40 rounded-3xl bg-[#141024] border-2 border-[#8B5CF6]/50 shadow-2xl shadow-purple-950 flex flex-col items-center justify-between p-3 rotate-12 scale-110">
            <div className="w-8 h-1.5 rounded-full bg-neutral-700" />
            <div className="text-center">
              <span className="text-[10px] font-black text-white block">FINTECH</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto mt-1 flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border border-neutral-700" />
          </div>
          {/* Floating Coins Graphic */}
          <div className="flex flex-col gap-2 -ml-6">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-amber-950/60 animate-bounce">
              $
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-300 to-amber-500 flex items-center justify-center text-slate-950 font-black text-[10px] shadow-md shadow-amber-950/40">
              $
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="px-3 py-1 rounded-full bg-white/10 text-[#C4B5FD] text-[10px] font-extrabold uppercase tracking-wider inline-block mb-3 backdrop-blur-sm border border-white/10">
            Portal Oficial de Clientes
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
            Tu bienestar financiero, nuestra prioridad
          </h2>
          <p className="text-xs sm:text-sm text-neutral-200 mt-2 leading-relaxed">
            Consulta, paga y solicita tus préstamos de forma fácil, segura y transparente desde cualquier lugar.
          </p>
        </div>
      </div>

      {/* 2. KPI SUMMARY CARDS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Créditos Activos */}
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#8B5CF6]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-neutral-400">Créditos Activos</span>
            <div className="w-8 h-8 rounded-xl bg-purple-950/60 text-[#A78BFA] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-white">{summary.activeLoansCount}</p>
            <Link
              href="/portal/creditos"
              className="text-[11px] font-bold text-[#8B5CF6] hover:text-[#A78BFA] flex items-center gap-1 mt-2 transition-colors"
            >
              <span>Ver detalles</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Saldo Pendiente */}
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#8B5CF6]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-neutral-400">Saldo Pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-red-950/50 text-[#E5092F] flex items-center justify-center">
              <span className="font-black text-sm">$</span>
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-black text-white truncate">
              {formatCOP(summary.totalPendingBalance)}
            </p>
            <Link
              href="/portal/creditos"
              className="text-[11px] font-bold text-[#8B5CF6] hover:text-[#A78BFA] flex items-center gap-1 mt-2 transition-colors"
            >
              <span>Ver detalles</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Card 3: Próximo Vencimiento */}
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#8B5CF6]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-neutral-400">Próximo Vencimiento</span>
            <div className="w-8 h-8 rounded-xl bg-amber-950/50 text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-base sm:text-xl font-black text-white truncate">
              {summary.nextDueDate ? formatDate(summary.nextDueDate) : 'Al día'}
            </p>
            <Link
              href="/portal/pagar"
              className="text-[11px] font-bold text-[#8B5CF6] hover:text-[#A78BFA] flex items-center gap-1 mt-2 transition-colors"
            >
              <span>Ver cuotas</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Card 4: Pagos al Día */}
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#8B5CF6]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-neutral-400">Pagos al Día</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/50 text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">{summary.onTimePaymentPercentage}%</p>
            <Link
              href="/portal/pagos"
              className="text-[11px] font-bold text-[#8B5CF6] hover:text-[#A78BFA] flex items-center gap-1 mt-2 transition-colors"
            >
              <span>Ver historial</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. TWO COLUMNS LAYOUT: LEFT (CREDITOS & HISTORIAL), RIGHT (NOTIFICATIONS, SOLICITAR BANNER, ADVISOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* LEFT COLUMN: Mis Créditos & Historiales (col-span-2) */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* MIS CRÉDITOS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5092F]" />
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Mis Créditos</h3>
              </div>
              <Link href="/portal/creditos" className="text-xs font-bold text-[#8B5CF6] hover:underline">
                Ver todos ({activeLoans.length}) →
              </Link>
            </div>

            {activeLoans.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#13111E] border border-[#231E33] text-center text-neutral-400">
                <p className="text-xs">No tienes créditos activos en este momento.</p>
                <Link
                  href="/portal/solicitar"
                  className="mt-3 inline-block px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold shadow-md"
                >
                  Solicitar un préstamo
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeLoans.map((loan: any) => {
                  const isLibre = loan.periodicity === 'LIBRE';
                  return (
                    <div
                      key={loan.id}
                      className="bg-[#13111E] border border-[#231E33] rounded-3xl p-5 sm:p-6 hover:border-[#8B5CF6]/50 transition-all shadow-xl"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* Info Left */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {loan.status}
                            </span>
                            <h4 className="text-sm sm:text-base font-extrabold text-white">
                              Crédito {loan.loan_code}
                            </h4>
                            {isLibre && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-[#C4B5FD] border border-purple-800/40">
                                Abono Libre
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div>
                              <span className="text-[10px] text-neutral-400 font-medium block">Desembolso</span>
                              <span className="font-bold text-neutral-200">
                                {formatDate(loan.disbursement_date)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-400 font-medium block">Total Acordado</span>
                              <span className="font-extrabold text-white">
                                {formatCOP(loan.total_amount)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-400 font-medium block">Capital Prestado</span>
                              <span className="font-bold text-neutral-300">
                                {formatCOP(loan.capital_amount)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-400 font-medium block">Saldo Pendiente</span>
                              <span className="font-black text-[#E5092F]">
                                {formatCOP(loan.balance_remaining)}
                              </span>
                            </div>
                          </div>

                          {/* Next installment info */}
                          {loan.next_installment && (
                            <div className="p-2.5 rounded-2xl bg-[#1A172A] border border-[#29233F] text-xs flex items-center justify-between">
                              <span className="text-neutral-400 text-[11px]">
                                Cuota #{loan.next_installment.installment_number} vence el{' '}
                                <strong className="text-white">
                                  {formatDate(loan.next_installment.due_date)}
                                </strong>
                              </span>
                              <span className="font-bold text-emerald-400">
                                {formatCOP(loan.next_installment.balance)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Circular Progress & Buttons */}
                        <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-4 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#231E33]">
                          {/* Circular Progress Meter */}
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-[#201C30]"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-[#8B5CF6] transition-all duration-1000"
                                strokeDasharray={`${loan.progress_percentage}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center text-center">
                              <span className="text-xs sm:text-sm font-black text-white leading-none">
                                {loan.progress_percentage}%
                              </span>
                              <span className="text-[8px] font-semibold text-neutral-400 uppercase mt-0.5">
                                Pagado
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex sm:flex-col gap-2 w-auto">
                            {!isLibre && (
                              <Link
                                href={`/portal/pagar?loanId=${loan.id}`}
                                className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-bold text-center transition-all shadow-md shadow-purple-950/60"
                              >
                                Pagar Cuota
                              </Link>
                            )}
                            <Link
                              href={`/portal/abonar?loanId=${loan.id}`}
                              className="px-4 py-2 rounded-xl bg-[#1D1930] hover:bg-[#272142] border border-[#8B5CF6]/40 active:scale-95 text-[#C4B5FD] text-xs font-bold text-center transition-all"
                            >
                              $ Abonar
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DUAL GRID: HISTORIAL DE PAGOS & SOLICITUDES DE PRÉSTAMO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Historial de Pagos */}
            <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Historial de Pagos</span>
                </h4>
                <Link href="/portal/pagos" className="text-[11px] font-bold text-[#8B5CF6] hover:underline">
                  Ver todos →
                </Link>
              </div>

              {recentPayments.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">No hay pagos recientes registrados.</p>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-[#181527] border border-[#26213A] text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-white text-[11px]">
                            {p.installment_number ? `Cuota #${p.installment_number}` : 'Abono'} ({p.loan_code})
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {formatCOP(p.amount_paid)} · {formatDate(p.payment_date)}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Confirmado
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Solicitudes de Préstamo */}
            <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Solicitudes de Préstamo</span>
                </h4>
                <Link href="/portal/solicitar" className="text-[11px] font-bold text-[#8B5CF6] hover:underline">
                  Ver todas →
                </Link>
              </div>

              {recentApplications.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-neutral-500 mb-2">No tienes solicitudes pendientes.</p>
                  <Link
                    href="/portal/solicitar"
                    className="text-[11px] font-bold text-[#8B5CF6] hover:underline"
                  >
                    + Solicitar nuevo crédito
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app: any) => {
                    const statusColor =
                      app.status === 'APROBADA'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : app.status === 'CONDICIONES_ACEPTADAS'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : app.status === 'DESEMBOLSADO'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : app.status === 'RECHAZADA'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-[#181527] border border-[#26213A] text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                            <span className="text-xs font-black">⏳</span>
                          </div>
                          <div>
                            <p className="font-bold text-white text-[11px]">{app.application_code}</p>
                            <p className="text-[10px] text-neutral-400">
                              {formatCOP(app.requested_amount)} · {app.requested_installments} cuotas
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${statusColor}`}>
                          {app.status === 'EN_REVISION'
                            ? 'En revisión'
                            : app.status === 'CONDICIONES_ACEPTADAS'
                            ? 'Aceptada'
                            : app.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: NOTIFICATIONS, BANNER, ASESOR, SEGURIDAD */}
        <div className="space-y-6">
          {/* NOTIFICACIONES WIDGET */}
          <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Notificaciones</span>
              </h4>
              <Link href="/portal/notificaciones" className="text-[11px] font-bold text-[#8B5CF6] hover:underline">
                Ver todas →
              </Link>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3 text-center">No tienes notificaciones pendientes.</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 4).map((n: any) => (
                  <div key={n.id} className="p-3 rounded-2xl bg-[#181527] border border-[#26213A] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-[11px]">{n.title}</span>
                      <span className="text-[9px] text-neutral-400">{getTimeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-snug line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BANNER: ¿NECESITAS UN NUEVO PRÉSTAMO? */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-[#1E1238] via-[#2D164D] to-[#E5092F]/30 border border-[#502888]/50 shadow-xl relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-black text-white leading-tight">
                  ¿Necesitas un nuevo préstamo?
                </h4>
                <p className="text-xs text-neutral-300 mt-1 mb-4 leading-relaxed">
                  Solicítalo ahora y sigue cumpliendo tus sueños con FINTECH.
                </p>
                <Link
                  href="/portal/solicitar"
                  className="inline-block py-2.5 px-4 rounded-xl bg-white text-[#1E1238] font-black text-xs hover:bg-neutral-100 active:scale-95 transition-all shadow-md"
                >
                  Solicitar Préstamo →
                </Link>
              </div>
              <div className="text-3xl shrink-0 ml-3">💰</div>
            </div>
          </div>

          {/* TU ASESOR DIRECTO */}
          <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-950/60 text-[#A78BFA] flex items-center justify-center text-lg">
                🎧
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Tu Asesor FINTECH</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">Estamos para ayudarte</p>
              </div>
            </div>
            <a
              href="https://wa.me/573152076489?text=Hola%20FINTECH,%20necesito%20asistencia%20con%20mi%20cuenta"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/30 transition-all flex items-center gap-1.5"
            >
              <span>Contactar</span>
            </a>
          </div>

          {/* TUS DATOS ESTÁN SEGUROS */}
          <div className="rounded-3xl p-4 bg-gradient-to-r from-emerald-950/30 to-[#13111E] border border-emerald-900/30 flex items-center gap-3 text-xs text-neutral-300">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Tus datos están seguros</p>
              <p className="text-[10px] text-neutral-400">En FINTECH cuidamos tu información con cifrado bancario</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

