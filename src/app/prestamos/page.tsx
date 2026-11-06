'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import NewLoanModal from '@/components/NewLoanModal';
import PaymentModal from '@/components/PaymentModal';
import {
  CreditCard,
  PlusCircle,
  Search,
  Filter,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Trash2,
  Receipt,
  TrendingUp,
  MessageCircle,
  ChevronRight,
  Wallet,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Loan, Installment, Payment } from '@/lib/types';
import { formatCOP, formatDate, getLoanLabel } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportUtils';

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [availableCash, setAvailableCash] = useState(0);

  // Modales
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<number | undefined>(undefined);

  // Modal de Detalle de Préstamo con Pestañas
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLoanDetail, setSelectedLoanDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial'>('resumen');

  const fetchLoans = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      let url = `/api/loans?status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLoans(data.loans);
      }

      const dashRes = await fetch('/api/dashboard');
      const dashData = await dashRes.json();
      if (dashData.success) {
        setAvailableCash(dashData.stats.available_cash);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [statusFilter, search]);

  const handleOpenDetail = async (id: number) => {
    setDetailLoading(true);
    setActiveTab('resumen');
    setDetailModalOpen(true);
    try {
      const res = await fetch(`/api/loans/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedLoanDetail(data.loan);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenPayment = (loanId: number) => {
    setSelectedLoanForPayment(loanId);
    setIsPaymentOpen(true);
  };

  const handleCancelLoan = async (loanId: number) => {
    if (!confirm('¿Está seguro de anular este préstamo? Se reintegrará el capital desembolsado a la caja.')) return;
    try {
      const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al anular préstamo.');
      alert('Préstamo anulado exitosamente.');
      setDetailModalOpen(false);
      fetchLoans();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportSingleLoanAmortization = (loan: any) => {
    if (!loan || !loan.installments) return;
    const data = loan.installments.map((i: any) => ({
      Cuota: i.installment_number,
      Vencimiento: i.due_date,
      Capital: i.capital_share,
      Interes: i.interest_share,
      Total_Cuota: i.total_amount,
      Abonado: i.paid_amount,
      Saldo_Pendiente: i.balance,
      Estado: i.status,
    }));
    exportToExcel(data, `Cronograma_${loan.loan_code}_${(loan.client_name || 'Cliente').replace(/\s+/g, '_')}`);
  };

  const handleShareLoanWhatsApp = (loan: any) => {
    if (!loan) return;
    const text =
      `*DETALLE DE CRÉDITO - FINTECH*\n` +
      `--------------------------------\n` +
      `*Préstamo:* ${loan.loan_code}\n` +
      `*Cliente:* ${loan.client_name}\n` +
      `*Capital:* ${formatCOP(loan.capital_amount)}\n` +
      `*Interés:* ${loan.interest_rate}% mensual (${formatCOP(loan.interest_amount)})\n` +
      `*Total a Pagar:* ${formatCOP(loan.total_amount)}\n` +
      `*Saldo Actual:* ${formatCOP(loan.balance_remaining)}\n` +
      `*Estado:* ${loan.status}\n` +
      `--------------------------------\n` +
      `_Tu negocio, en control - FINTECH_`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportExcel = () => {
    const data = loans.map((l) => ({
      Codigo: l.loan_code,
      Cliente: l.client_name,
      Documento: l.client_document || 'N/A',
      Capital: l.capital_amount,
      Total_Pactado: l.total_amount,
      Saldo_Pendiente: l.balance_remaining,
      Capital_Recuperado: l.capital_collected,
      Interes_Cobrado: l.interest_collected,
      Cuotas: l.installments_count,
      Periodicidad: l.periodicity,
      Estado: l.status,
    }));
    exportToExcel(data, 'Cartera_Prestamos_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Préstamos"
          subtitle="Seguimiento de obligaciones y cartera individual"
          availableCash={availableCash}
          onNewLoan={() => setIsNewLoanOpen(true)}
          onNewPayment={() => {
            setSelectedLoanForPayment(undefined);
            setIsPaymentOpen(true);
          }}
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Buscador grande */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar código o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6] transition-colors"
              />
            </div>

            {/* Filtros de estado */}
            <div className="flex items-center gap-2 overflow-x-auto touch-scroll pb-1 sm:pb-0">
              {['TODOS', 'ACTIVO', 'EN_MORA', 'COMPLETADO'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-[#E5092F] to-[#C40726] text-white shadow-md shadow-red-950/50'
                      : 'bg-[#14121F] text-neutral-400 hover:text-white border border-[#2D2545]'
                  }`}
                >
                  {status}
                </button>
              ))}

              <button
                onClick={handleExportExcel}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-[#14121F] hover:bg-[#1A1828] text-neutral-300 border border-[#2D2545] transition-colors"
                title="Exportar a Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={() => setIsNewLoanOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/60 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Nuevo Préstamo</span>
              </button>
            </div>
          </div>

          {/* LISTADO DE CRÉDITOS EN TARJETAS MODERNAS */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-xs text-neutral-400">Cargando préstamos...</div>
            ) : loans.length === 0 ? (
              <div className="p-12 text-center bg-[#121118] rounded-3xl border border-[#2D2545]">
                <CreditCard className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">No se encontraron préstamos</p>
                <p className="text-xs text-neutral-400 mt-1">Crea un nuevo préstamo o ajusta el filtro.</p>
              </div>
            ) : (
              loans.map((loan) => (
                <div
                  key={loan.id}
                  onClick={() => handleOpenDetail(loan.id)}
                  className="p-4 sm:p-5 rounded-3xl bg-[#121118] hover:bg-[#181622] border border-[#2D2545] hover:border-[#8B5CF6]/40 transition-all cursor-pointer shadow-md group active:scale-[0.99] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Icon Card Pill */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#E5092F]/20 to-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] shrink-0 shadow-md">
                      <CreditCard className="w-5 h-5" />
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#A78BFA]">{loan.loan_code}</span>
                        <h4 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-[#A78BFA] transition-colors">
                          {loan.client_name}
                        </h4>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            loan.status === 'ACTIVO'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : loan.status === 'COMPLETADO'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400 mt-1">
                        <span className="text-[#A78BFA] font-medium">{getLoanLabel(loan)}</span>
                        <span>· Capital: <strong className="text-white font-semibold">{formatCOP(loan.capital_amount)}</strong></span>
                        {loan.installments_count > 0 && (
                          <span>· {loan.installments_count} cuotas de {formatCOP(loan.payment_per_installment)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#221D33]">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-neutral-400 block uppercase font-medium">Saldo Pendiente</span>
                      <p className="text-base sm:text-lg font-black text-white">{formatCOP(loan.balance_remaining)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {(loan.status === 'ACTIVO' || loan.status === 'EN_MORA') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPayment(loan.id);
                          }}
                          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white font-bold text-xs shadow-md shadow-red-950/60 transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Abonar</span>
                        </button>
                      )}
                      <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      <MobileNav />

      {/* MODAL DETALLE DEL PRÉSTAMO (Exacto al Mockup Screen 4) */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md overflow-hidden p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl bg-[#0E0D14] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[90vh] text-neutral-100 animate-in slide-in-from-bottom duration-200 overflow-hidden">
            {/* Header Fijo */}
            <div className="shrink-0 px-5 py-4 border-b border-[#221D33] bg-[#0E0D14]/95 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-bold shadow-md shadow-purple-950/40">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Detalle del Préstamo</h3>
                  <p className="text-[11px] text-neutral-400">
                    {selectedLoanDetail?.loan_code} · {selectedLoanDetail?.client_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con Scroll Interno */}
            {detailLoading ? (
              <div className="p-12 text-center text-xs text-neutral-400">Cargando detalles...</div>
            ) : selectedLoanDetail ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 touch-scroll">
                  {/* Client Chip (Como en Screen 4) */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#14121F] border border-[#2D2545]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white font-bold text-xs shadow-md">
                        {selectedLoanDetail.client_name?.substring(0, 2).toUpperCase() || 'CR'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedLoanDetail.client_name}</h4>
                        <p className="text-xs text-neutral-400">
                          {selectedLoanDetail.loan_code} · {getLoanLabel(selectedLoanDetail)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold ${
                        selectedLoanDetail.status === 'ACTIVO'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {selectedLoanDetail.status}
                    </span>
                  </div>

                  {/* Large Card: Saldo Pendiente (Como en Screen 4) */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1C1126] via-[#14121F] to-[#250F18] border border-[#8B5CF6]/30 relative overflow-hidden shadow-xl">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-xs text-[#A78BFA] font-bold uppercase tracking-wider">
                        Saldo Pendiente
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA]">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-white mt-1">
                      {formatCOP(selectedLoanDetail.balance_remaining)}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Monto restante por cobrar para saldar esta obligación.
                    </p>
                  </div>

                  {/* Sub-tabs: Resumen | Historial (Como en Screen 4) */}
                  <div className="flex border-b border-[#221D33] text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveTab('resumen')}
                      className={`pb-3 px-4 relative transition-colors ${
                        activeTab === 'resumen' ? 'text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>Resumen</span>
                      {activeTab === 'resumen' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E5092F] shadow-[0_0_8px_#E5092F]" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('historial')}
                      className={`pb-3 px-4 relative transition-colors ${
                        activeTab === 'historial' ? 'text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>Historial de Abonos ({selectedLoanDetail.payments?.length || 0})</span>
                      {activeTab === 'historial' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E5092F] shadow-[0_0_8px_#E5092F]" />
                      )}
                    </button>
                  </div>

                  {/* TAB 1: RESUMEN */}
                  {activeTab === 'resumen' && (
                    <div className="space-y-4">
                      {/* Grid de 4 Métricas Clave */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-[#14121F] border border-[#2D2545]">
                          <span className="text-[10px] text-neutral-400 block font-medium">Capital Inicial</span>
                          <p className="text-base font-bold text-white mt-0.5">
                            {formatCOP(selectedLoanDetail.capital_amount)}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#14121F] border border-[#2D2545]">
                          <span className="text-[10px] text-neutral-400 block font-medium">Intereses Acordados</span>
                          <p className="text-base font-bold text-[#A78BFA] mt-0.5">
                            {formatCOP(selectedLoanDetail.interest_amount)}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#14121F] border border-[#2D2545]">
                          <span className="text-[10px] text-neutral-400 block font-medium">Número de Cuotas</span>
                          <p className="text-base font-bold text-white mt-0.5">
                            {selectedLoanDetail.installments_count > 0 ? selectedLoanDetail.installments_count : 'Abono libre'}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#14121F] border border-[#2D2545]">
                          <span className="text-[10px] text-neutral-400 block font-medium">Total Acordado</span>
                          <p className="text-base font-bold text-white mt-0.5">
                            {formatCOP(selectedLoanDetail.total_amount)}
                          </p>
                        </div>
                      </div>

                      {/* Porcentaje Pagado Ring / Barra */}
                      {(() => {
                        const total = Number(selectedLoanDetail.total_amount) || 1;
                        const remaining = Number(selectedLoanDetail.balance_remaining) || 0;
                        const paid = Math.max(0, total - remaining);
                        const pct = Math.min(100, Math.round((paid / total) * 100));

                        return (
                          <div className="p-4 rounded-2xl bg-[#14121F] border border-[#2D2545] flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs text-neutral-400 font-semibold block">Progreso de Amortización</span>
                              <p className="text-sm font-bold text-white mt-0.5">
                                Recaudado: <span className="text-emerald-400">{formatCOP(paid)}</span> de {formatCOP(total)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-white">{pct}%</span>
                              <span className="text-xs text-neutral-400">Pagado</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Cronograma de Cuotas (Si tiene cuotas) */}
                      {selectedLoanDetail.installments && selectedLoanDetail.installments.length > 0 && (
                        <div className="rounded-2xl border border-[#2D2545] overflow-hidden bg-[#14121F]">
                          <div className="p-3 border-b border-[#2D2545] flex items-center justify-between">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              Cronograma de Cuotas
                            </span>
                            <button
                              type="button"
                              onClick={() => handleExportSingleLoanAmortization(selectedLoanDetail)}
                              className="text-[11px] text-[#A78BFA] hover:text-white flex items-center gap-1 font-semibold"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Descargar Excel</span>
                            </button>
                          </div>
                          <div className="overflow-x-auto max-h-56 touch-scroll">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#181622] text-neutral-400 sticky top-0 border-b border-[#2D2545]">
                                <tr>
                                  <th className="py-2 px-3">#</th>
                                  <th className="py-2 px-3">Vencimiento</th>
                                  <th className="py-2 px-3">Cuota</th>
                                  <th className="py-2 px-3">Abonado</th>
                                  <th className="py-2 px-3">Saldo</th>
                                  <th className="py-2 px-3">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#221D33]/60">
                                {selectedLoanDetail.installments.map((inst: any) => (
                                  <tr key={inst.id} className="hover:bg-[#181622]/50">
                                    <td className="py-2 px-3 font-semibold text-neutral-300">#{inst.installment_number}</td>
                                    <td className="py-2 px-3 text-neutral-300">{formatDate(inst.due_date)}</td>
                                    <td className="py-2 px-3 font-bold text-white">{formatCOP(inst.total_amount)}</td>
                                    <td className="py-2 px-3 text-emerald-400">{formatCOP(inst.paid_amount)}</td>
                                    <td className="py-2 px-3 text-neutral-300">{formatCOP(inst.balance)}</td>
                                    <td className="py-2 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          inst.status === 'PAGADA'
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : inst.status === 'PARCIAL'
                                            ? 'bg-amber-500/15 text-amber-400'
                                            : inst.status === 'VENCIDA'
                                            ? 'bg-red-500/15 text-red-400'
                                            : 'bg-neutral-800 text-neutral-400'
                                        }`}
                                      >
                                        {inst.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: HISTORIAL DE ABONOS */}
                  {activeTab === 'historial' && (
                    <div className="space-y-2">
                      {!selectedLoanDetail.payments || selectedLoanDetail.payments.length === 0 ? (
                        <div className="p-8 text-center text-xs text-neutral-400 bg-[#14121F] rounded-2xl border border-[#2D2545]">
                          No se han registrado abonos todavía para este crédito.
                        </div>
                      ) : (
                        selectedLoanDetail.payments.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-2xl bg-[#14121F] border border-[#2D2545] flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#A78BFA] font-bold">{p.payment_code}</span>
                                <span className="text-neutral-400">· {p.payment_method}</span>
                              </div>
                              <span className="text-[11px] text-neutral-400 mt-0.5 block">
                                Fecha: {formatDate(p.payment_date)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-white text-sm">{formatCOP(p.amount_paid)}</span>
                              <span className="text-[10px] text-emerald-400 block">
                                (Cap: {formatCOP(p.capital_paid)} | Int: {formatCOP(p.interest_paid)})
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Fijo con Botón Rojo Prominente "Realizar Pago" (Exacto al Mockup) */}
                <div className="shrink-0 p-4 border-t border-[#221D33] bg-[#0E0D14]/98 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleShareLoanWhatsApp(selectedLoanDetail)}
                    className="p-3.5 rounded-2xl bg-[#181622] hover:bg-[#221F30] border border-[#2D2545] text-white flex items-center justify-center transition-colors"
                    title="Compartir por WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailModalOpen(false)}
                    className="py-3.5 px-4 rounded-2xl text-xs font-semibold bg-[#181622] hover:bg-neutral-800 text-neutral-300 transition-colors"
                  >
                    Cerrar
                  </button>

                  {(selectedLoanDetail.status === 'ACTIVO' || selectedLoanDetail.status === 'EN_MORA') && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenPayment(selectedLoanDetail.id);
                      }}
                      className="flex-1 py-3.5 px-5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/70 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Realizar Pago</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* New Loan & Payment modals */}
      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => setIsNewLoanOpen(false)}
        onSuccess={fetchLoans}
        availableCash={availableCash}
      />
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={fetchLoans}
        defaultLoanId={selectedLoanForPayment}
      />
    </div>
  );
}
