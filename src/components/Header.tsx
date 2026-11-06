'use client';

import { PlusCircle, Receipt, Wallet, Bell, Sparkles } from 'lucide-react';
import { formatCOP } from '@/lib/calculations';
import FintechLogo from './FintechLogo';

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
    <header className="sticky top-0 z-20 bg-[#0B0B0F]/90 backdrop-blur-xl border-b border-[#221D33] px-4 sm:px-8 py-3.5 transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Title area & Mobile Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <FintechLogo size="sm" showText={false} />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                {title}
              </h1>
              {subtitle && <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>

          {/* Mobile notification indicator */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="relative p-2 rounded-xl bg-[#14121F] border border-[#2A243D] text-neutral-300">
              <Bell className="w-4 h-4 text-[#8B5CF6]" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E5092F]" />
            </div>
          </div>
        </div>

        {/* Financial Action Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Quick Cash Available Badge */}
          <div
            onClick={onCashMovement}
            className="flex items-center gap-2 bg-[#14121F] hover:bg-[#1A1828] border border-[#8B5CF6]/30 px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm group active:scale-95"
            title="Haga clic para ver o registrar aportes/retiros de caja"
          >
            <div className="w-6 h-6 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Caja Disponible</p>
              <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#A78BFA]">
                {formatCOP(availableCash)}
              </p>
            </div>
          </div>

          {/* Quick Action: Registrar Pago */}
          {onNewPayment && (
            <button
              onClick={onNewPayment}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#14121F] hover:bg-[#1C1A2B] text-neutral-200 border border-[#2D2545] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Abonar</span>
            </button>
          )}

          {/* Quick Action: Nuevo Préstamo */}
          {onNewLoan && (
            <button
              onClick={onNewLoan}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white transition-all cursor-pointer shadow-lg shadow-red-950/60 active:scale-95"
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
