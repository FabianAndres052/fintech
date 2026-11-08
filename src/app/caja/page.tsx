'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import CashMovementModal from '@/components/CashMovementModal';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
} from 'lucide-react';
import { FinancialMovement, MovementType } from '@/lib/types';
import { formatCOP, formatDate } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportUtils';

export default function CajaPage() {
  const router = useRouter();
  const [movements, setMovements] = useState<FinancialMovement[]>([]);
  const [currentCash, setCurrentCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [search, setSearch] = useState<string>('');
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);

  const fetchMovements = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      let url = `/api/cash?limit=250`;
      if (typeFilter !== 'TODOS') {
        url += `&type=${typeFilter}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setMovements(data.movements);
        setCurrentCash(data.currentCash);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [typeFilter, search]);

  const handleExportExcel = () => {
    const data = movements.map((m) => ({
      Codigo: m.movement_code,
      Tipo: m.type,
      Categoria: m.category,
      Concepto: m.description,
      Monto: m.amount,
      Componente_Capital: m.capital_component,
      Componente_Interes: m.interest_component,
      Medio_Pago: m.payment_method,
      Saldo_Tras_Movimiento: m.balance_after,
      Fecha: m.created_at,
    }));
    exportToExcel(data, 'Libro_Mayor_Caja_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Libro Mayor de Caja & Flujo de Efectivo"
          subtitle="Control de entradas, salidas, aportes de capital y gastos operativos"
          availableCash={currentCash}
          onCashMovement={() => setIsCashModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Main Cash Balance Banner */}
          <div className="bg-[#121118] rounded-3xl p-6 border border-[#2D2545] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-[#8B5CF6]">
                  Fondo Disponible en Bóveda / Caja
                </span>
                <p className="text-3xl sm:text-4xl font-black text-white mt-1">
                  {formatCOP(currentCash)}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Saldo actualizado en tiempo real tras cada desembolso, cobro o gasto.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsCashModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white transition-all cursor-pointer shadow-lg shadow-red-950/60 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nuevo Movimiento de Caja</span>
                </button>
              </div>
            </div>

            <div className="absolute right-0 top-0 w-64 h-64 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Todos', value: 'TODOS' },
                { label: 'Cobros', value: 'COBRO_CUOTA' },
                { label: 'Desembolsos', value: 'DESEMBOLSO_PRESTAMO' },
                { label: 'Aportes', value: 'APORTE_CAPITAL' },
                { label: 'Retiros', value: 'RETIRO_CAPITAL' },
                { label: 'Gastos', value: 'GASTO' },
                { label: 'Ingresos Extra', value: 'INGRESO' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    typeFilter === f.value
                      ? 'bg-red-700 text-white font-bold shadow-md shadow-red-950/50'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar código o detalle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
              </div>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Movements Ledger Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Tipo de Movimiento</th>
                    <th className="py-3 px-4">Concepto / Detalle</th>
                    <th className="py-3 px-4">Impacto</th>
                    <th className="py-3 px-4">Medio</th>
                    <th className="py-3 px-4">Saldo en Caja Tras Operación</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        {loading ? 'Cargando libro de caja...' : 'No se registraron movimientos.'}
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const isPositive =
                        m.type === 'COBRO_CUOTA' ||
                        m.type === 'APORTE_CAPITAL' ||
                        m.type === 'INGRESO';

                      return (
                        <tr key={m.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400 font-semibold">
                            {m.movement_code}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.type === 'COBRO_CUOTA'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : m.type === 'APORTE_CAPITAL'
                                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                                    : m.type === 'DESEMBOLSO_PRESTAMO'
                                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}
                            >
                              {m.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 max-w-sm">{m.description}</td>
                          <td
                            className={`py-3 px-4 font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                          >
                            {isPositive ? '+' : '-'} {formatCOP(m.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{m.payment_method}</td>
                          <td className="py-3 px-4 font-extrabold text-white">
                            {formatCOP(m.balance_after)}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{formatDate(m.created_at)}</td>
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

      <CashMovementModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        onSuccess={fetchMovements}
        currentCash={currentCash}
      />
    </div>
  );
}
