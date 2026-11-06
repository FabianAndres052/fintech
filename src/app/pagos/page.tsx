'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import PaymentModal from '@/components/PaymentModal';
import ReceiptModal from '@/components/ReceiptModal';
import {
  Receipt,
  Search,
  FileSpreadsheet,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Banknote,
  PlusCircle,
} from 'lucide-react';
import { Payment } from '@/lib/types';
import { formatCOP, formatDate } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportUtils';

export default function PagosPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availableCash, setAvailableCash] = useState(0);

  // Modales
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchPayments = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/payments?limit=200');
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
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
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.payment_code?.toLowerCase().includes(term) ||
      p.client_name?.toLowerCase().includes(term) ||
      p.client_document?.toLowerCase().includes(term) ||
      p.loan_code?.toLowerCase().includes(term)
    );
  });

  const totalCollected = filteredPayments.reduce((acc, p) => acc + Number(p.amount_paid), 0);
  const totalCapital = filteredPayments.reduce((acc, p) => acc + Number(p.capital_paid), 0);
  const totalInterest = filteredPayments.reduce((acc, p) => acc + Number(p.interest_paid), 0);

  const handleOpenReceipt = (p: Payment) => {
    setSelectedReceipt({
      paymentCode: p.payment_code,
      clientName: p.client_name || 'Cliente',
      clientDocument: p.client_document || 'N/A',
      loanCode: p.loan_code || 'PRE',
      amountPaid: p.amount_paid,
      capitalPaid: p.capital_paid,
      interestPaid: p.interest_paid,
      newLoanBalance: 0,
      paymentMethod: p.payment_method,
      paymentDate: p.payment_date,
      notes: p.notes,
    });
    setIsReceiptOpen(true);
  };

  const handleExportExcel = () => {
    const data = filteredPayments.map((p) => ({
      Recibo: p.payment_code,
      Préstamo: p.loan_code,
      Cliente: p.client_name,
      Documento: p.client_document,
      Valor_Pagado: p.amount_paid,
      Capital_Amortizado: p.capital_paid,
      Interes_Ganado: p.interest_paid,
      Medio_Pago: p.payment_method,
      Fecha: p.payment_date,
      Nota: p.notes || '',
    }));
    exportToExcel(data, 'Historial_Recaudos_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Historial de Pagos & Recaudos"
          subtitle="Registro de transacciones, recibos oficiales y separación de capital vs intereses"
          availableCash={availableCash}
          onNewPayment={() => setIsPaymentOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-[#121118] rounded-3xl p-4 sm:p-5 border border-[#2D2545]">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Total Recaudado (Selección)
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {formatCOP(totalCollected)}
              </p>
              <span className="text-[10px] text-[#A78BFA]">
                {filteredPayments.length} transacciones registradas
              </span>
            </div>

            <div className="bg-[#121118] rounded-3xl p-4 sm:p-5 border border-[#2D2545]">
              <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                Capital Retornado
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {formatCOP(totalCapital)}
              </p>
              <span className="text-[10px] text-neutral-400">Recuperación de dinero prestado</span>
            </div>

            <div className="bg-[#121118] rounded-3xl p-4 sm:p-5 border border-[#2D2545]">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Intereses Ganados (Ganancia Real)
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                {formatCOP(totalInterest)}
              </p>
              <span className="text-[10px] text-neutral-400">Utilidad realizada de cartera</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar recibo, cliente, cédula o préstamo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl pl-10 pr-3 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-[#14121F] hover:bg-[#1A1828] text-neutral-300 border border-[#2D2545] transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={() => setIsPaymentOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white shadow-lg shadow-red-950/60 transition-all cursor-pointer active:scale-95"
              >
                <Receipt className="w-4 h-4" />
                <span>Registrar Pago</span>
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-[#121118] rounded-3xl border border-[#2D2545] overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181622] text-neutral-400 border-b border-[#2D2545] uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Recibo</th>
                    <th className="py-3 px-4">Préstamo</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Total Pagado</th>
                    <th className="py-3 px-4">Capital</th>
                    <th className="py-3 px-4">Interés Ganado</th>
                    <th className="py-3 px-4">Medio</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#221D33]/60 bg-[#121118]">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-500">
                        {loading ? 'Cargando pagos...' : 'No hay pagos registrados en el sistema.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {p.payment_code}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{p.loan_code}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-white">{p.client_name}</p>
                          <p className="text-[10px] text-slate-400">CC: {p.client_document}</p>
                        </td>
                        <td className="py-3 px-4 font-black text-white">{formatCOP(p.amount_paid)}</td>
                        <td className="py-3 px-4 font-semibold text-indigo-300">
                          {formatCOP(p.capital_paid)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-400">
                          {formatCOP(p.interest_paid)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-medium text-slate-300">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{formatDate(p.payment_date)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReceipt(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ver e Imprimir Comprobante"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
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

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={fetchPayments}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receipt={selectedReceipt}
      />
    </div>
  );
}
