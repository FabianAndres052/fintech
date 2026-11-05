'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import PaymentModal from '@/components/PaymentModal';
import NewLoanModal from '@/components/NewLoanModal';
import {
  CalendarDays,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Phone,
  DollarSign,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportUtils';

function CuotasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'todas';

  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [availableCash, setAvailableCash] = useState(0);

  // Modales
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<number | undefined>(undefined);
  const [selectedAmount, setSelectedAmount] = useState<number | undefined>(undefined);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | undefined>(undefined);
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);

  const fetchInstallments = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      let url = `/api/installments?filter=${filter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInstallments(data.installments);
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
    fetchInstallments();
  }, [filter, search]);

  const handlePay = (loanId: number, amount?: number, installmentId?: number) => {
    setSelectedLoanId(loanId);
    setSelectedAmount(amount);
    setSelectedInstallmentId(installmentId);
    setIsPaymentOpen(true);
  };

  const handleRemindWhatsApp = (inst: any) => {
    const cleanPhone = (inst.client_phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
    const text =
      `*RECORDATORIO DE PAGO - FINTECH*\n` +
      `--------------------------------\n` +
      `Hola *${inst.client_name}*,\n` +
      `Le recordamos que la cuota *#${inst.installment_number}* de su préstamo *${inst.loan_code}* por valor de *${formatCOP(inst.balance)}* venció el *${formatDate(inst.due_date)}*.\n\n` +
      `Le agradecemos gestionar su abono para mantener su historial crediticio al día. ¡Muchas gracias!`;

    const url = phoneParam
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportExcel = () => {
    const data = installments.map((i) => ({
      Prestamo: i.loan_code,
      Cuota_Numero: i.installment_number,
      Cliente: i.client_name,
      Telefono: i.client_phone,
      Fecha_Vencimiento: i.due_date,
      Valor_Cuota: i.total_amount,
      Abonado: i.paid_amount,
      Saldo_Restante: i.balance,
      Estado: i.status,
      Dias_Mora: i.days_overdue > 0 && i.status !== 'PAGADA' ? i.days_overdue : 0,
    }));
    exportToExcel(data, 'Cronograma_Cuotas_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-black text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <Header
          title="Cronograma de Cuotas & Cobranza"
          subtitle="Vencimientos diarios, semanales, quincenales y gestión de cobros en mora"
          availableCash={availableCash}
          onNewLoan={() => setIsNewLoanOpen(true)}
          onNewPayment={() => {
            setSelectedLoanId(undefined);
            setIsPaymentOpen(true);
          }}
        />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilter('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'todas'
                    ? 'bg-red-700 text-white font-bold shadow-md shadow-red-950/50'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Todas las Cuotas
              </button>
              <button
                onClick={() => setFilter('mora')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'mora'
                    ? 'bg-red-950/60 border border-red-700 text-red-300 font-bold'
                    : 'bg-neutral-900 text-red-400 hover:text-red-300 border border-red-900/30'
                }`}
              >
                En Mora (Vencidas)
              </button>
              <button
                onClick={() => setFilter('hoy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'hoy'
                    ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Vencen Hoy
              </button>
              <button
                onClick={() => setFilter('semana')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'semana'
                    ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Próximos 7 Días
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar préstamo o cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Installments Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Préstamo</th>
                    <th className="py-3 px-4">Cuota</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Fecha Vencimiento</th>
                    <th className="py-3 px-4">Valor Programado</th>
                    <th className="py-3 px-4">Saldo Cuota</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {installments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        {loading ? 'Cargando cuotas...' : 'No hay cuotas en este criterio de búsqueda.'}
                      </td>
                    </tr>
                  ) : (
                    installments.map((inst) => {
                      const isOverdue =
                        inst.days_overdue > 0 &&
                        (inst.status === 'PENDIENTE' || inst.status === 'PARCIAL' || inst.status === 'VENCIDA');

                      return (
                        <tr key={inst.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {inst.loan_code}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-300">
                            #{inst.installment_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-white">{inst.client_name}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{inst.client_phone}</span>
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p
                              className={`font-semibold ${
                                isOverdue ? 'text-rose-400' : 'text-slate-200'
                              }`}
                            >
                              {formatDate(inst.due_date)}
                            </p>
                            {isOverdue && (
                              <p className="text-[10px] text-rose-400 font-bold">
                                {inst.days_overdue} días en mora
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {formatCOP(inst.total_amount)}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-teal-300">
                            {formatCOP(inst.balance)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inst.status === 'PAGADA'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : isOverdue
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : inst.status === 'PARCIAL'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {inst.status === 'PAGADA' ? 'PAGADA' : isOverdue ? 'EN MORA' : inst.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {inst.status !== 'PAGADA' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {isOverdue && (
                                  <button
                                    onClick={() => handleRemindWhatsApp(inst)}
                                    className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                    title="Enviar recordatorio por WhatsApp"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePay(inst.loan_id, Number(inst.balance), inst.id)}
                                  className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                  Cobrar
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-400 flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Al día
                              </span>
                            )}
                          </td>
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

      <MobileNav />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedLoanId(undefined);
          setSelectedAmount(undefined);
          setSelectedInstallmentId(undefined);
        }}
        onSuccess={fetchInstallments}
        defaultLoanId={selectedLoanId}
        defaultAmount={selectedAmount}
        defaultInstallmentId={selectedInstallmentId}
      />

      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => setIsNewLoanOpen(false)}
        onSuccess={fetchInstallments}
        availableCash={availableCash}
      />
    </div>
  );
}

export default function CuotasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-xs text-slate-400">
          Cargando cronograma...
        </div>
      }
    >
      <CuotasContent />
    </Suspense>
  );
}
