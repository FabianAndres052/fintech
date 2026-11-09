'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PortalCreditsPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/portal/credits')
      .then((res) => res.json())
      .then((data) => {
        if (data.loans) setLoans(data.loans);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando tus créditos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Mis Créditos</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Consulta el estado, saldo, historial de cuotas y condiciones de cada uno de tus préstamos.
          </p>
        </div>
        <Link
          href="/portal/solicitar"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/60"
        >
          <span>+ Solicitar Nuevo Préstamo</span>
        </Link>
      </div>

      {loans.length === 0 ? (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-10 text-center">
          <p className="text-sm text-neutral-400">No tienes préstamos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {loans.map((loan) => {
            const isLibre = loan.periodicity === 'LIBRE';
            return (
              <div
                key={loan.id}
                className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 hover:border-[#8B5CF6]/50 transition-all shadow-xl"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  {/* Info Header */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                          loan.status === 'ACTIVO'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : loan.status === 'COMPLETADO'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                        }`}
                      >
                        {loan.status}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Obligación {loan.loan_code}
                      </h3>
                      {isLibre && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-[#C4B5FD] border border-purple-800/40">
                          Modalidad Abono Libre
                        </span>
                      )}
                    </div>

                    {/* Financial Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#181527] p-4 rounded-2xl border border-[#26213A]">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                          Capital Prestado
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-neutral-200">
                          {formatCOP(loan.capital_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                          Total Acordado
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-white">
                          {formatCOP(loan.total_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                          Total Abonado
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                          {formatCOP(loan.paid_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#E5092F] uppercase block">
                          Saldo Pendiente
                        </span>
                        <span className="text-sm sm:text-base font-black text-[#E5092F]">
                          {formatCOP(loan.balance_remaining)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-400">
                      <span>
                        Desembolso: <strong className="text-white">{formatDate(loan.disbursement_date)}</strong>
                      </span>
                      {!isLibre && (
                        <span>
                          Frecuencia: <strong className="text-white">{loan.periodicity}</strong>
                        </span>
                      )}
                      {!isLibre && (
                        <span>
                          Total Cuotas: <strong className="text-white">{loan.installments_count}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Progress & Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-4 w-full lg:w-48 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#231E33]">
                    {/* Progress Percentage */}
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-[#1A172A] border-2 border-[#8B5CF6] flex flex-col items-center justify-center mx-auto shadow-lg shadow-purple-950/40">
                        <span className="text-sm font-black text-white">{loan.progress_percentage}%</span>
                        <span className="text-[8px] font-semibold text-neutral-400 uppercase">Pagado</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 w-full max-w-[160px]">
                      {loan.status === 'ACTIVO' && !isLibre && (
                        <Link
                          href={`/portal/pagar?loanId=${loan.id}`}
                          className="w-full py-2 px-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-bold text-center transition-all shadow-md shadow-purple-950/60"
                        >
                          Pagar Cuota
                        </Link>
                      )}
                      {loan.status === 'ACTIVO' && (
                        <Link
                          href={`/portal/abonar?loanId=${loan.id}`}
                          className="w-full py-2 px-3 rounded-xl bg-[#1C182E] hover:bg-[#25203D] border border-[#8B5CF6]/40 active:scale-95 text-[#C4B5FD] text-xs font-bold text-center transition-all"
                        >
                          $ Abonar
                        </Link>
                      )}
                      <button
                        onClick={() => setSelectedLoan(selectedLoan?.id === loan.id ? null : loan)}
                        className="w-full py-1.5 px-3 rounded-xl text-neutral-300 hover:text-white text-xs font-bold text-center hover:bg-[#1A172A] transition-colors"
                      >
                        {selectedLoan?.id === loan.id ? 'Ocultar Cronograma ▲' : 'Ver Cronograma ▼'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SCHEDULE / INSTALLMENTS ACCORDION TABLE */}
                {selectedLoan?.id === loan.id && (
                  <div className="mt-6 pt-6 border-t border-[#231E33] space-y-4">
                    <h4 className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider">
                      Cronograma de Cuotas — {loan.loan_code}
                    </h4>

                    {(!loan.installments || loan.installments.length === 0) ? (
                      <p className="text-xs text-neutral-500">Este crédito no tiene cuotas fijas programadas (abono libre a capital).</p>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-[#26213A]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#181527] text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-[#26213A]">
                            <tr>
                              <th className="py-3 px-3.5"># Cuota</th>
                              <th className="py-3 px-3.5">Vencimiento</th>
                              <th className="py-3 px-3.5">Valor Cuota</th>
                              <th className="py-3 px-3.5">Pagado</th>
                              <th className="py-3 px-3.5">Saldo</th>
                              <th className="py-3 px-3.5">Estado</th>
                              <th className="py-3 px-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#231E33]">
                            {loan.installments.map((inst: any) => {
                              const isPaid = inst.status === 'PAGADA';
                              return (
                                <tr key={inst.id} className="hover:bg-[#1A172A]/60 transition-colors">
                                  <td className="py-3 px-3.5 font-bold text-white">
                                    Cuota {inst.installment_number}
                                  </td>
                                  <td className="py-3 px-3.5 text-neutral-300">
                                    {formatDate(inst.due_date)}
                                  </td>
                                  <td className="py-3 px-3.5 font-bold text-white">
                                    {formatCOP(inst.total_amount)}
                                  </td>
                                  <td className="py-3 px-3.5 text-emerald-400 font-semibold">
                                    {formatCOP(inst.paid_amount)}
                                  </td>
                                  <td className="py-3 px-3.5 font-bold text-neutral-200">
                                    {formatCOP(inst.balance)}
                                  </td>
                                  <td className="py-3 px-3.5">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                        isPaid
                                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                          : inst.status === 'VENCIDA'
                                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                      }`}
                                    >
                                      {inst.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3.5 text-right">
                                    {!isPaid && (
                                      <Link
                                        href={`/portal/pagar?loanId=${loan.id}&instId=${inst.id}`}
                                        className="inline-block py-1 px-3 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[10px] font-bold shadow"
                                      >
                                        Pagar
                                      </Link>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
