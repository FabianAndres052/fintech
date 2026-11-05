
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
} from 'lucide-react';
import { Loan, Installment, Payment } from '@/lib/types';
import { formatCOP, formatDate } from '@/lib/calculations';
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

  // Modal de Detalle de Préstamo con Amortización
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLoanDetail, setSelectedLoanDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

      // Obtener saldo en caja
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
      `*Cuotas:* ${loan.installments_count} ${loan.periodicity?.toLowerCase()}s de ${formatCOP(loan.payment_per_installment)}\n` +
      `*Saldo Actual:* ${formatCOP(loan.balance_remaining)}\n` +
      `*Estado:* ${loan.status}\n` +
      `--------------------------------\n` +
      `_Comuníquese con nosotros para cualquier consulta o soporte._`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportExcel = () => {
    const data = loans.map((l) => ({
      Codigo: l.loan_code,
      Cliente: l.client_name,
      Documento: l.client_document,
      Capital: l.capital_amount,
      Tasa_Interes: `${l.interest_rate}%`,
      Interes_Total: l.interest_amount,
      Total_Pactado: l.total_amount,
      Saldo_Pendiente: l.balance_remaining,
      Capital_Recuperado: l.capital_collected,
      Interes_Cobrado: l.interest_collected,
      Cuotas: l.installments_count,
      Periodicidad: l.periodicity,
      Valor_Cuota: l.payment_per_installment,
      Fecha_Desembolso: l.disbursement_date,
      Fecha_Culminacion: l.end_date,
      Estado: l.status,
    }));
    exportToExcel(data, 'Cartera_Prestamos_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-black text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <Header
          title="Cartera de Préstamos"
          subtitle="Contratos de crédito, cronogramas de amortización y seguimiento"
          availableCash={availableCash}
          onNewLoan={() => setIsNewLoanOpen(true)}
          onNewPayment={() => {
            setSelectedLoanForPayment(undefined);
            setIsPaymentOpen(true);
          }}
        />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {['TODOS', 'ACTIVO', 'EN_MORA', 'COMPLETADO', 'CANCELADO'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-red-700 text-white font-bold shadow-md shadow-red-950/50'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar código o cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
              </div>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={() => setIsNewLoanOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-md shadow-red-950/50"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Prestar</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Capital Prestado</th>
                    <th className="py-3 px-4">Cuota Periódica</th>
                    <th className="py-3 px-4">Saldo Pendiente</th>
                    <th className="py-3 px-4">Retorno (Cap / Int)</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        {loading ? 'Cargando préstamos...' : 'No se encontraron préstamos en este estado.'}
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {loan.loan_code}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{loan.client_name}</p>
                          <p className="text-[11px] text-slate-400">CC: {loan.client_document}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{formatCOP(loan.capital_amount)}</p>
                          <p className="text-[10px] text-emerald-400">
                            +{loan.interest_rate}% ({formatCOP(loan.interest_amount)})
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">
                            {loan.installments_count > 0 ? formatCOP(loan.payment_per_installment) : 'Abonos Libres'}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {loan.installments_count > 0
                              ? `${loan.installments_count} cuotas ${loan.periodicity.toLowerCase()}s`
                              : 'Deuda sin cuotas programadas'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-teal-300">
                          {formatCOP(loan.balance_remaining)}
                        </td>
                        <td className="py-3.5 px-4 text-[11px]">
                          <span className="text-slate-300">Cap: {formatCOP(loan.capital_collected)}</span>
                          <br />
                          <span className="text-emerald-400">
                            Int: {formatCOP(loan.interest_collected)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              loan.status === 'ACTIVO'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : loan.status === 'COMPLETADO'
                                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                                : loan.status === 'EN_MORA'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDetail(loan.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Ver Amortización y Detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {loan.status === 'ACTIVO' && (
                              <button
                                onClick={() => handleOpenPayment(loan.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Cobrar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />

      {/* Modal de Detalle de Préstamo & Tabla de Amortización */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Préstamo {selectedLoanDetail?.loan_code}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        selectedLoanDetail?.status === 'ACTIVO'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {selectedLoanDetail?.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cliente: {selectedLoanDetail?.client_name} (CC: {selectedLoanDetail?.client_document})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Cargando cronograma...</div>
            ) : selectedLoanDetail ? (
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Resumen numérico */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400">Capital Prestado</span>
                    <p className="text-sm font-bold text-white">
                      {formatCOP(selectedLoanDetail.capital_amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Interés ({selectedLoanDetail.interest_rate}%)</span>
                    <p className="text-sm font-bold text-emerald-400">
                      {formatCOP(selectedLoanDetail.interest_amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Total a Pagar</span>
                    <p className="text-sm font-bold text-teal-300">
                      {formatCOP(selectedLoanDetail.total_amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Saldo Restante</span>
                    <p className="text-sm font-black text-emerald-400">
                      {formatCOP(selectedLoanDetail.balance_remaining)}
                    </p>
                  </div>
                </div>

                {/* Tabla de Amortización */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Cronograma de Cuotas & Amortización</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {selectedLoanDetail.installments?.length} cuotas programadas
                    </span>
                  </h4>
                  <div className="rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Vencimiento</th>
                          <th className="py-2.5 px-3">Capital</th>
                          <th className="py-2.5 px-3">Interés</th>
                          <th className="py-2.5 px-3">Valor Cuota</th>
                          <th className="py-2.5 px-3">Abonado</th>
                          <th className="py-2.5 px-3">Saldo</th>
                          <th className="py-2.5 px-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {selectedLoanDetail.installments?.map((inst: Installment) => (
                          <tr key={inst.id} className="hover:bg-slate-900/80">
                            <td className="py-2 px-3 font-semibold text-slate-300">
                              {inst.installment_number}
                            </td>
                            <td className="py-2 px-3 text-slate-300">{formatDate(inst.due_date)}</td>
                            <td className="py-2 px-3 text-slate-400">{formatCOP(inst.capital_share)}</td>
                            <td className="py-2 px-3 text-emerald-400">
                              {formatCOP(inst.interest_share)}
                            </td>
                            <td className="py-2 px-3 font-bold text-white">
                              {formatCOP(inst.total_amount)}
                            </td>
                            <td className="py-2 px-3 text-emerald-300">{formatCOP(inst.paid_amount)}</td>
                            <td className="py-2 px-3 font-semibold text-slate-200">
                              {formatCOP(inst.balance)}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inst.status === 'PAGADA'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : inst.status === 'PARCIAL'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : inst.status === 'VENCIDA'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-slate-800 text-slate-400'
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

                {/* Historial de Pagos Registrados */}
                {selectedLoanDetail.payments && selectedLoanDetail.payments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                      Recaudos Registrados ({selectedLoanDetail.payments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedLoanDetail.payments.map((p: Payment) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-mono text-emerald-400 font-bold">{p.payment_code}</span>
                            <span className="text-slate-400 ml-2">
                              {formatDate(p.payment_date)} · {p.payment_method}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white">{formatCOP(p.amount_paid)}</span>
                            <span className="text-[10px] text-slate-400 block">
                              (Cap: {formatCOP(p.capital_paid)} | Int: {formatCOP(p.interest_paid)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer modal acciones */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportSingleLoanAmortization(selectedLoanDetail)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exportar Cronograma</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareLoanWhatsApp(selectedLoanDetail)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {selectedLoanDetail.status === 'ACTIVO' &&
                    (!selectedLoanDetail.payments || selectedLoanDetail.payments.length === 0) && (
                      <button
                        onClick={() => handleCancelLoan(selectedLoanDetail.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer mr-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Anular</span>
                      </button>
                    )}

                    <button
                      onClick={() => setDetailModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                    {(selectedLoanDetail.status === 'ACTIVO' || selectedLoanDetail.status === 'EN_MORA') && (
                      <button
                        onClick={() => {
                          setDetailModalOpen(false);
                          handleOpenPayment(selectedLoanDetail.id);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                      >
                        Abonar a este Préstamo
                      </button>
                    )}
                  </div>
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
