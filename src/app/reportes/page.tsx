'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import {
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  CreditCard,
  Receipt,
  AlertTriangle,
  Users,
  Wallet,
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatCOP, formatDate } from '@/lib/calculations';

export default function ReportesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableCash, setAvailableCash] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) router.push('/login');
      });

    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAvailableCash(data.stats.available_cash);
      });
  }, []);

  // 1. Reporte de Cartera de Préstamos
  const handleExportLoans = async (type: 'excel' | 'pdf') => {
    setLoading(true);
    try {
      const res = await fetch('/api/loans?status=TODOS');
      const data = await res.json();
      const loans = data.loans || [];

      if (type === 'excel') {
        const rows = loans.map((l: any) => ({
          Codigo: l.loan_code,
          Cliente: l.client_name,
          Documento: l.client_document,
          Capital: l.capital_amount,
          Tasa: `${l.interest_rate}%`,
          Interes_Total: l.interest_amount,
          Total: l.total_amount,
          Saldo_Pendiente: l.balance_remaining,
          Capital_Recuperado: l.capital_collected,
          Interes_Cobrado: l.interest_collected,
          Estado: l.status,
          Desembolso: l.disbursement_date,
        }));
        exportToExcel(rows, 'Reporte_General_Cartera_FINTECH');
      } else {
        const cols = [
          { header: 'Código', dataKey: 'loan_code' },
          { header: 'Cliente', dataKey: 'client_name' },
          { header: 'Documento', dataKey: 'client_document' },
          { header: 'Capital', dataKey: 'f_capital' },
          { header: 'Total Pactado', dataKey: 'f_total' },
          { header: 'Saldo Restante', dataKey: 'f_balance' },
          { header: 'Estado', dataKey: 'status' },
        ];
        const formatted = loans.map((l: any) => ({
          ...l,
          f_capital: formatCOP(l.capital_amount),
          f_total: formatCOP(l.total_amount),
          f_balance: formatCOP(l.balance_remaining),
        }));
        exportToPDF(cols, formatted, 'Reporte General de Cartera de Préstamos', 'Reporte_Cartera_FINTECH');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Reporte de Recaudos y Pagos
  const handleExportPayments = async (type: 'excel' | 'pdf') => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments?limit=500');
      const data = await res.json();
      const payments = data.payments || [];

      if (type === 'excel') {
        const rows = payments.map((p: any) => ({
          Recibo: p.payment_code,
          Prestamo: p.loan_code,
          Cliente: p.client_name,
          Documento: p.client_document,
          Total_Pagado: p.amount_paid,
          Capital_Amortizado: p.capital_paid,
          Interes_Ganado: p.interest_paid,
          Medio: p.payment_method,
          Fecha: p.payment_date,
        }));
        exportToExcel(rows, 'Reporte_Recaudos_Pagos');
      } else {
        const cols = [
          { header: 'Recibo', dataKey: 'payment_code' },
          { header: 'Préstamo', dataKey: 'loan_code' },
          { header: 'Cliente', dataKey: 'client_name' },
          { header: 'Total Cobrado', dataKey: 'f_amount' },
          { header: 'Capital', dataKey: 'f_capital' },
          { header: 'Interés Realizado', dataKey: 'f_interest' },
          { header: 'Medio', dataKey: 'payment_method' },
        ];
        const formatted = payments.map((p: any) => ({
          ...p,
          f_amount: formatCOP(p.amount_paid),
          f_capital: formatCOP(p.capital_paid),
          f_interest: formatCOP(p.interest_paid),
        }));
        exportToPDF(cols, formatted, 'Reporte Oficial de Recaudos y Pagos Realizados', 'Reporte_Recaudos_Pagos');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Reporte de Cuotas en Mora
  const handleExportOverdue = async (type: 'excel' | 'pdf') => {
    setLoading(true);
    try {
      const res = await fetch('/api/installments?filter=mora');
      const data = await res.json();
      const installments = data.installments || [];

      if (type === 'excel') {
        const rows = installments.map((i: any) => ({
          Prestamo: i.loan_code,
          Cuota: i.installment_number,
          Cliente: i.client_name,
          Telefono: i.client_phone,
          Fecha_Vencimiento: i.due_date,
          Dias_Mora: i.days_overdue,
          Saldo_Vencido: i.balance,
        }));
        exportToExcel(rows, 'Reporte_Cartera_Mora');
      } else {
        const cols = [
          { header: 'Préstamo', dataKey: 'loan_code' },
          { header: 'Cuota', dataKey: 'installment_number' },
          { header: 'Cliente', dataKey: 'client_name' },
          { header: 'Teléfono', dataKey: 'client_phone' },
          { header: 'Venció', dataKey: 'f_date' },
          { header: 'Días Mora', dataKey: 'days_overdue' },
          { header: 'Saldo Vencido', dataKey: 'f_balance' },
        ];
        const formatted = installments.map((i: any) => ({
          ...i,
          f_date: formatDate(i.due_date),
          f_balance: formatCOP(i.balance),
        }));
        exportToPDF(cols, formatted, 'Reporte de Cobranza de Cuotas en Mora', 'Reporte_Cuotas_Mora');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Reporte de Clientes
  const handleExportClients = async (type: 'excel' | 'pdf') => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      const clients = data.clients || [];

      if (type === 'excel') {
        const rows = clients.map((c: any) => ({
          Documento: `${c.document_type} ${c.document_number}`,
          Nombre: `${c.first_name} ${c.last_name}`,
          Telefono: c.phone,
          Email: c.email || '',
          Direccion: c.address,
          Ciudad: c.city,
          Prestamos_Activos: c.active_loans_count,
          Saldo_Pendiente: c.current_balance,
          Estado: c.status,
        }));
        exportToExcel(rows, 'Directorio_Clientes');
      } else {
        const cols = [
          { header: 'Documento', dataKey: 'document_number' },
          { header: 'Nombre', dataKey: 'full_name' },
          { header: 'Teléfono', dataKey: 'phone' },
          { header: 'Dirección', dataKey: 'address' },
          { header: 'Préstamos Activos', dataKey: 'active_loans_count' },
          { header: 'Saldo Pendiente', dataKey: 'f_balance' },
        ];
        const formatted = clients.map((c: any) => ({
          ...c,
          full_name: `${c.first_name} ${c.last_name}`,
          f_balance: formatCOP(c.current_balance),
        }));
        exportToPDF(cols, formatted, 'Directorio Oficial de Clientes', 'Directorio_Clientes');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Centro de Reportes Financieros"
          subtitle="Generación y exportación de reportes ejecutivos en formato Excel y PDF"
          availableCash={availableCash}
        />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Cartera General */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reporte General de Cartera</h3>
                    <p className="text-xs text-slate-400">
                      Todos los créditos otorgados, saldos, amortización y estado
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Informe integral de colocación de préstamos, desglose de capital desembolsado,
                  intereses acordados, montos recuperados y cartera pendiente de cobro.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleExportLoans('excel')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportLoans('pdf')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF Oficial</span>
                </button>
              </div>
            </div>

            {/* 2. Recaudos & Cobros */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reporte de Recaudos y Pagos</h3>
                    <p className="text-xs text-slate-400">
                      Separación estricta de capital retornado vs interés cobrado
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Detalle cronológico de pagos recibidos, canal de cobro (Efectivo, Nequi, etc.),
                  distribución exacta de capital y utilidad real cobrada.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleExportPayments('excel')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportPayments('pdf')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF Oficial</span>
                </button>
              </div>
            </div>

            {/* 3. Cobranza & Cartera en Mora */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reporte de Cartera en Mora</h3>
                    <p className="text-xs text-slate-400">Cuotas vencidas y días de atraso</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Listado para gestión de cobranza telefónica o domiciliaria con número de teléfono,
                  días de retraso, cuotas adeudadas y montos totales en mora.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleExportOverdue('excel')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportOverdue('pdf')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-slate-950 transition-colors cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF Oficial</span>
                </button>
              </div>
            </div>

            {/* 4. Directorio de Clientes */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Directorio de Clientes</h3>
                    <p className="text-xs text-slate-400">Base de datos de titulares de crédito</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Listado completo con nombres, cédulas, teléfonos, direcciones residenciales,
                  créditos vigentes y saldos totales adeudados.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleExportClients('excel')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportClients('pdf')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-slate-950 transition-colors cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF Oficial</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
