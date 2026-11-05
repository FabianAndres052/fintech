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
} from 'lucide-react';
import { formatCOP } from '@/lib/calculations';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';

export default function ContabilidadPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [cashBalance, setCashBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAccounting = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/cash');
      const cashRes = await res.json();
      if (cashRes.success) {
        setData(cashRes.summary);
        setCashBalance(cashRes.currentCash);
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
    <div className="flex min-h-screen bg-black text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <Header
          title="Contabilidad & Estados Financieros"
          subtitle="Separación estricta de capital vs intereses, flujo de caja y rentabilidad neta"
          availableCash={cashBalance}
        />

        <main className="flex-1 p-4 sm:p-8 space-y-7 max-w-7xl mx-auto w-full">
          {/* Reglas de Oro Contables Card & Export Buttons */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1 p-4 rounded-2xl bg-neutral-950 border border-red-900/40 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-300 space-y-1">
                <span className="font-bold text-white uppercase tracking-wider">
                  Directriz Financiera Aplicada
                </span>
                <p>
                  1. <strong>La recuperación de capital no es ganancia:</strong> Es el retorno de tus propios fondos prestados a la caja.
                </p>
                <p>
                  2. <strong>Los intereses futuros no son dinero recibido:</strong> Solo se contabiliza como ganancia el interés efectivamente cobrado.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-center">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-red-400" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas Contables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dinero en Caja */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Dinero Disponible en Caja
              </span>
              <p className="text-2xl font-black text-white mt-2">{formatCOP(cashBalance)}</p>
              <p className="text-[10px] text-emerald-400 mt-1">Saldo líquido verificado</p>
            </div>

            {/* Capital Recuperado */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                Capital Recuperado
              </span>
              <p className="text-2xl font-black text-indigo-300 mt-2">
                {formatCOP(d.total_capital_collected)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Amortización retornada al fondo</p>
            </div>

            {/* Ganancia Bruta (Intereses Cobrados) */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Intereses Cobrados (Bruto)
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-2">{formatCOP(grossProfit)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Interés neto liquidado</p>
            </div>

            {/* Utilidad Neta Real */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">
                Utilidad Neta (Interés - Gastos)
              </span>
              <p
                className={`text-2xl font-black mt-2 ${
                  netProfit >= 0 ? 'text-teal-300' : 'text-rose-400'
                }`}
              >
                {formatCOP(netProfit)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Gastos restados: {formatCOP(d.total_expenses)}
              </p>
            </div>
          </div>

          {/* Balance General / Desglose de Fondos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estado de Flujo de Efectivo */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Estado de Flujo de Fondos</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Aportes de Capital Inyectados (+)</span>
                  <span className="font-bold text-emerald-400">
                    +{formatCOP(d.total_capital_injected)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Retiros de Capital Propietario (-)</span>
                  <span className="font-bold text-rose-400">
                    -{formatCOP(d.total_capital_withdrawn)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Desembolsos en Préstamos Otorgados (-)</span>
                  <span className="font-bold text-amber-400">
                    -{formatCOP(d.total_disbursed)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Retorno de Capital por Cuotas (+)</span>
                  <span className="font-bold text-indigo-300">
                    +{formatCOP(d.total_capital_collected)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Intereses Cobrados (+)</span>
                  <span className="font-bold text-emerald-400">
                    +{formatCOP(d.total_interest_collected)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Gastos Operativos Deductibles (-)</span>
                  <span className="font-bold text-rose-400">
                    -{formatCOP(d.total_expenses)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 text-sm font-extrabold text-white">
                  <span>SALDO LÍQUIDO EN CAJA:</span>
                  <span className="text-emerald-400">{formatCOP(cashBalance)}</span>
                </div>
              </div>
            </div>

            {/* Separación de Cartera & Rentabilidad */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  <span>Estructura de Retorno y Liquidez</span>
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  La estructura de ingresos se segrega automáticamente en cada pago: el componente de
                  capital regresa al fondo rotatorio para seguir prestando, mientras que los intereses
                  se consolidan en tu balance de utilidad libre de riesgo.
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Ratio de Ganancia Realizada</span>
                      <span className="font-bold text-emerald-400">
                        {d.total_capital_collected > 0
                          ? `${Math.round(
                              (Number(d.total_interest_collected) /
                                (Number(d.total_capital_collected) +
                                  Number(d.total_interest_collected))) *
                                100
                            )}% del total cobrado`
                          : '0%'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-indigo-500 h-full"
                        style={{
                          width: `${
                            d.total_capital_collected > 0
                              ? (Number(d.total_capital_collected) /
                                  (Number(d.total_capital_collected) +
                                    Number(d.total_interest_collected))) *
                                100
                              : 80
                          }%`,
                        }}
                        title="Capital"
                      />
                      <div
                        className="bg-emerald-400 h-full"
                        style={{
                          width: `${
                            d.total_capital_collected > 0
                              ? (Number(d.total_interest_collected) /
                                  (Number(d.total_capital_collected) +
                                    Number(d.total_interest_collected))) *
                                100
                              : 20
                          }%`,
                        }}
                        title="Interés"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Capital
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Interés
                        (Ganancia)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 mt-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-400">Patrimonio Total Estimado:</span>
                <span className="font-extrabold text-white">{formatCOP(netCapitalInFund)}</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
