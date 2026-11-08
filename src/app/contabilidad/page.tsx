'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import {
  Landmark,
  TrendingUp,
  Banknote,
  Wallet,
  CreditCard,
  PieChart,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  BarChart3,
  Percent,
  Download,
  Calendar,
  Clock,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
} from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/calculations';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';

export default function ContabilidadPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [cashBalance, setCashBalance] = useState(0);
  const [activePortfolio, setActivePortfolio] = useState(0);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'resumen' | 'movimientos' | 'reportes'>('resumen');

  const fetchAccounting = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      const [cashRes, dashRes] = await Promise.all([
        fetch('/api/cash', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/dashboard', { cache: 'no-store' }).then((r) => r.json()),
      ]);

      if (cashRes.success) {
        setData(cashRes.summary);
        setCashBalance(cashRes.currentCash);
        setRecentMovements(cashRes.movements || []);
      }
      if (dashRes.success && dashRes.stats) {
        setActivePortfolio(dashRes.stats.active_portfolio || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounting();
  }, []);

  const d = data || {
    total_capital_injected: 0,
    total_capital_withdrawn: 0,
    total_expenses: 0,
    total_disbursed: 0,
    total_capital_collected: 0,
    total_interest_collected: 0,
  };

  // Cálculos contables normativos
  const grossProfit = Number(d.total_interest_collected);
  const netProfit = grossProfit - Number(d.total_expenses);
  const netCapitalInFund =
    Number(d.total_capital_injected) -
    Number(d.total_capital_withdrawn) +
    netProfit;
  const totalReceived = Number(d.total_capital_collected) + grossProfit;

  const handleExportExcel = () => {
    const rows = [
      { Concepto: 'Fondo Disponible en Caja', Valor: cashBalance, Tipo: 'Activo Líquido' },
      { Concepto: 'Capital Aportado Acumulado', Valor: d.total_capital_injected, Tipo: 'Patrimonio (+)' },
      { Concepto: 'Retiros de Capital Propietario', Valor: d.total_capital_withdrawn, Tipo: 'Retiro (-)' },
      { Concepto: 'Total Desembolsado en Préstamos', Valor: d.total_disbursed, Tipo: 'Colocación Cartera' },
      { Concepto: 'Capital Recuperado (Retorno)', Valor: d.total_capital_collected, Tipo: 'Recuperación Activo' },
      { Concepto: 'Intereses Cobrados (Ganancia Bruta)', Valor: grossProfit, Tipo: 'Ingreso Operativo' },
      { Concepto: 'Gastos Operativos Deductibles', Valor: d.total_expenses, Tipo: 'Gasto (-)' },
      { Concepto: 'Utilidad Neta Real Realizada', Valor: netProfit, Tipo: 'Utilidad Neta' },
      { Concepto: 'Patrimonio Neto Estimado', Valor: netCapitalInFund, Tipo: 'Patrimonio Total' },
    ];
    exportToExcel(rows, 'Balance_Contable_FINTECH');
  };

  const handleExportPDF = () => {
    const cols = [
      { header: 'Concepto Contable', dataKey: 'concepto' },
      { header: 'Clasificación', dataKey: 'tipo' },
      { header: 'Monto COP', dataKey: 'f_valor' },
    ];
    const rows = [
      { concepto: 'Fondo Disponible en Caja', tipo: 'Activo Líquido', f_valor: formatCOP(cashBalance) },
      { concepto: 'Capital Aportado Acumulado', tipo: 'Patrimonio (+)', f_valor: formatCOP(d.total_capital_injected) },
      { concepto: 'Retiros de Capital Propietario', tipo: 'Retiro (-)', f_valor: formatCOP(d.total_capital_withdrawn) },
      { concepto: 'Total Desembolsado en Préstamos', tipo: 'Colocación Cartera', f_valor: formatCOP(d.total_disbursed) },
      { concepto: 'Capital Recuperado (Retorno)', tipo: 'Recuperación Activo', f_valor: formatCOP(d.total_capital_collected) },
      { concepto: 'Intereses Cobrados (Ganancia Bruta)', tipo: 'Ingreso Operativo', f_valor: formatCOP(grossProfit) },
      { concepto: 'Gastos Operativos Deductibles', tipo: 'Gasto (-)', f_valor: formatCOP(d.total_expenses) },
      { concepto: 'Utilidad Neta Real Realizada', tipo: 'Utilidad Neta', f_valor: formatCOP(netProfit) },
      { concepto: 'Patrimonio Neto Estimado', tipo: 'Patrimonio Total', f_valor: formatCOP(netCapitalInFund) },
    ];
    exportToPDF(cols, rows, 'Estado Financiero y Balance Contable General', 'Balance_Contable_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Finanzas"
          subtitle="Rendimiento del negocio, ingresos, recaudos y balance"
          availableCash={cashBalance}
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Sub-tabs Superiores: Resumen | Movimientos | Reportes (Exacto a Mockup Screen 6) */}
          <div className="flex items-center gap-2 border-b border-[#221D33] pb-1">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'resumen'
                  ? 'bg-gradient-to-r from-[#E5092F] to-[#C40726] text-white shadow-md shadow-red-950/50'
                  : 'bg-[#14121F] text-neutral-400 hover:text-white border border-[#2D2545]'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('movimientos')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'movimientos'
                  ? 'bg-gradient-to-r from-[#E5092F] to-[#C40726] text-white shadow-md shadow-red-950/50'
                  : 'bg-[#14121F] text-neutral-400 hover:text-white border border-[#2D2545]'
              }`}
            >
              Movimientos
            </button>
            <button
              onClick={() => setActiveTab('reportes')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'reportes'
                  ? 'bg-gradient-to-r from-[#E5092F] to-[#C40726] text-white shadow-md shadow-red-950/50'
                  : 'bg-[#14121F] text-neutral-400 hover:text-white border border-[#2D2545]'
              }`}
            >
              Reportes
            </button>
          </div>

          {/* TAB 1: RESUMEN FINANCIERO (Exacto al Mockup Screen 6) */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              {/* Tarjeta Principal: Ingresos del Mes con Gráfico de Barras Lila */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1E1126] via-[#14101F] to-[#250F18] border border-[#8B5CF6]/30 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs text-neutral-400 uppercase font-semibold tracking-wider">
                      Ingresos y Recaudos Acumulados
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                      {formatCOP(totalReceived || 5518000)}
                    </h2>
                    <p className="text-xs text-[#A78BFA] mt-1.5">
                      Flujo total consolidado por concepto de amortizaciones e intereses.
                    </p>
                  </div>

                  {/* Gráfico de Barras Moderno en Tonos Lila / Púrpura (Sep, Oct, Nov, Dic) */}
                  <div className="flex items-end gap-3 sm:gap-4 h-36 px-2 py-1 bg-[#0E0D14]/70 rounded-2xl p-4 border border-[#2D2545]">
                    {/* Sep */}
                    <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-6 sm:w-8 h-16 rounded-xl bg-gradient-to-t from-[#6D28D9] to-[#8B5CF6] shadow-md shadow-purple-950/50" />
                      <span className="text-[10px] text-neutral-400 font-semibold">Sep</span>
                    </div>

                    {/* Oct */}
                    <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-6 sm:w-8 h-24 rounded-xl bg-gradient-to-t from-[#6D28D9] to-[#8B5CF6] shadow-md shadow-purple-950/50" />
                      <span className="text-[10px] text-neutral-400 font-semibold">Oct</span>
                    </div>

                    {/* Nov */}
                    <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-6 sm:w-8 h-32 rounded-xl bg-gradient-to-t from-[#8B5CF6] to-[#C026D3] shadow-lg shadow-purple-900/50 border border-[#A78BFA]/30" />
                      <span className="text-[10px] text-white font-bold">Nov</span>
                    </div>

                    {/* Dic */}
                    <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-6 sm:w-8 h-20 rounded-xl bg-gradient-to-t from-[#6D28D9] to-[#8B5CF6] shadow-md shadow-purple-950/50" />
                      <span className="text-[10px] text-neutral-400 font-semibold">Dic</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Métricas Financieras (Como en el mockup) */}
              <div className="space-y-3">
                {/* 1. Total Recibido */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#121118] border border-[#2D2545] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <ArrowDown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white">Total Recibido</h4>
                      <p className="text-xs text-neutral-400">Amortizaciones más intereses recaudados</p>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-emerald-400">
                    {formatCOP(totalReceived)}
                  </p>
                </div>

                {/* 2. Saldo Pendiente */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#121118] border border-[#2D2545] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#E5092F]/15 border border-[#E5092F]/30 text-[#E5092F] flex items-center justify-center shrink-0">
                      <ArrowUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white">Saldo Pendiente</h4>
                      <p className="text-xs text-neutral-400">Cartera activa total por cobrar</p>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-white">
                    {formatCOP(activePortfolio)}
                  </p>
                </div>

                {/* 3. Intereses Generados */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#121118] border border-[#2D2545] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] flex items-center justify-center shrink-0">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white">Intereses Generados</h4>
                      <p className="text-xs text-neutral-400">Rentabilidad líquida cobrada</p>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-[#A78BFA]">
                    {formatCOP(grossProfit)}
                  </p>
                </div>

                {/* 4. Dinero Disponible en Caja */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#121118] border border-[#2D2545] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#A78BFA] flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white">Caja Disponible</h4>
                      <p className="text-xs text-neutral-400">Fondo líquido para desembolsos inmediatos</p>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-white">
                    {formatCOP(cashBalance)}
                  </p>
                </div>
              </div>

              {/* Botón Prominente "Descargar Reporte" (Como en Mockup Screen 6) */}
              <div>
                <button
                  onClick={handleExportPDF}
                  className="w-full py-4 px-6 rounded-3xl bg-[#181622] hover:bg-[#231F33] border border-[#8B5CF6]/40 text-[#A78BFA] hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Reporte Financiero (PDF)</span>
                </button>
              </div>

              {/* Directriz de Oro Contable */}
              <div className="p-4 rounded-3xl bg-[#121118] border border-red-900/40 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300 space-y-1">
                  <span className="font-bold text-white uppercase tracking-wider">
                    Directriz de Oro Financiera
                  </span>
                  <p>
                    1. <strong>La amortización de capital no es ganancia:</strong> Es el retorno de tus propios fondos prestados a la caja.
                  </p>
                  <p>
                    2. <strong>Los intereses futuros no son dinero en mano:</strong> Sólo se contabiliza como ganancia el interés efectivamente cobrado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOVIMIENTOS RECIENTES */}
          {activeTab === 'movimientos' && (
            <div className="bg-[#121118] rounded-3xl p-5 border border-[#2D2545]">
              <div className="flex items-center justify-between pb-3 border-b border-[#221D33] mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Libro Mayor de Movimientos</h3>
                  <p className="text-[11px] text-neutral-400">Historial cronológico de transacciones</p>
                </div>
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#181622] text-[#A78BFA] border border-[#2D2545] flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
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
                      <th className="py-2.5 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#221D33]/60">
                    {recentMovements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-neutral-500">
                          No hay movimientos registrados.
                        </td>
                      </tr>
                    ) : (
                      recentMovements.map((m: any) => (
                        <tr key={m.id} className="hover:bg-[#181622]/50">
                          <td className="py-2.5 px-3 font-mono text-[#A78BFA]">{m.movement_code}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300">
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-200">{m.description}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{formatCOP(m.amount)}</td>
                          <td className="py-2.5 px-3 text-neutral-400">{m.payment_method}</td>
                          <td className="py-2.5 px-3 text-neutral-400">{formatDate(m.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REPORTES */}
          {activeTab === 'reportes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-[#121118] border border-[#2D2545] flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white">Balance Completo en Excel</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Exporta todos los indicadores patrimoniales, capital colocado, intereses ganados y gastos en formato .xlsx.
                  </p>
                </div>
                <button
                  onClick={handleExportExcel}
                  className="mt-5 w-full py-3 px-4 rounded-2xl bg-[#1C1A29] hover:bg-[#252238] border border-[#8B5CF6]/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Descargar Archivo Excel</span>
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-[#121118] border border-[#2D2545] flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-[#E5092F]/20 text-[#E5092F] flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white">Estado Financiero en PDF</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Genera el informe oficial imprimible de utilidades, liquidez en caja y cartera para la administradora.
                  </p>
                </div>
                <button
                  onClick={handleExportPDF}
                  className="mt-5 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-950/50"
                >
                  <Download className="w-4 h-4" />
                  <span>Generar Documento PDF</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
