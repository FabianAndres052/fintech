'use client';

import { PlusCircle, Receipt, Wallet, Bell, Sparkles } from 'lucide-react';
import { formatCOP } from '@/lib/calculations';

interface HeaderProps {
  title: string;
  subtitle?: string;
  availableCash?: number;
  onNewLoan?: () => void;
  onNewPayment?: () => void;
  onCashMovement?: () => void;
}

export default function Header({
  title,
  subtitle,
  availableCash = 0,
  onNewLoan,
  onNewPayment,
  onCashMovement,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-neutral-800 px-4 sm:px-8 py-4 transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title area */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
          {subtitle && <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Financial Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Quick Cash Available Badge */}
          <div
            onClick={onCashMovement}
            className="flex items-center gap-2 bg-neutral-900/90 hover:bg-neutral-800 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm group"
            title="Haga clic para ver o registrar aportes/retiros de caja"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Caja Disponible</p>
              <p className="text-xs sm:text-sm font-bold text-emerald-400 group-hover:text-emerald-300">
                {formatCOP(availableCash)}
              </p>
            </div>
          </div>

          {/* Quick Action: Registrar Pago */}
          {onNewPayment && (
            <button
              onClick={onNewPayment}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Registrar Pago</span>
            </button>
          )}

          {/* Quick Action: Nuevo Préstamo */}
          {onNewLoan && (
            <button
              onClick={onNewLoan}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-md shadow-red-950/50 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nuevo Préstamo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
