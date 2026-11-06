'use client';

import { useState } from 'react';
import { X, Wallet, AlertCircle, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatCOP } from '@/lib/calculations';
import { MovementType } from '@/lib/types';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentCash?: number;
}

export default function CashMovementModal({
  isOpen,
  onClose,
  onSuccess,
  currentCash = 0,
}: CashMovementModalProps) {
  const [type, setType] = useState<MovementType>('APORTE_CAPITAL');
  const [category, setCategory] = useState<string>('CAPITAL');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingrese un monto válido mayor a 0.');
      return;
    }

    if ((type === 'RETIRO_CAPITAL' || type === 'GASTO') && numAmount > currentCash) {
      setError(
        `Fondos insuficientes en caja ($ ${new Intl.NumberFormat('es-CO').format(currentCash)} COP) para esta salida.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          amount: numAmount,
          payment_method: paymentMethod,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar movimiento de caja.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md overflow-hidden p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0E0D14] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] text-neutral-100 animate-in slide-from-bottom duration-200 overflow-hidden">
        {/* Header Fijo */}
        <div className="shrink-0 px-5 py-4 border-b border-[#221D33] bg-[#0E0D14]/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-bold shadow-md shadow-purple-950/40">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Movimiento de Caja</h3>
              <p className="text-[11px] text-neutral-400">Aportes, retiros y gastos del negocio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario con Scroll Interno */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 touch-scroll">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Saldo actual de caja */}
            <div className="p-3.5 rounded-2xl bg-[#14121F] border border-[#8B5CF6]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-semibold">Caja Disponible Actual</span>
                <p className="text-base font-black text-white">{formatCOP(currentCash)}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            {/* Tipo de Movimiento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Tipo de Operación</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('APORTE_CAPITAL');
                    setCategory('CAPITAL');
                  }}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    type === 'APORTE_CAPITAL'
                      ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-md'
                      : 'bg-[#14121F] border-[#2D2545] text-neutral-400'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4 text-[#A78BFA]" />
                  <span>Aporte (Ingreso)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('RETIRO_CAPITAL');
                    setCategory('RETIRO');
                  }}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    type === 'RETIRO_CAPITAL'
                      ? 'bg-[#E5092F]/20 border-[#E5092F] text-white shadow-md'
                      : 'bg-[#14121F] border-[#2D2545] text-neutral-400'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4 text-[#E5092F]" />
                  <span>Retiro (Salida)</span>
                </button>
              </div>
            </div>

            {/* Monto */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Valor (COP)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 1.000.000"
                  className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl pl-8 pr-4 py-3 text-base font-bold text-white focus:outline-none focus:border-[#8B5CF6]"
                  required
                />
              </div>
              {amount && <p className="text-[11px] text-[#A78BFA]">{formatCOP(amount)}</p>}
            </div>

            {/* Método */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Canal / Medio</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="EFECTIVO">Efectivo Físico</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="NEQUI">Nequi</option>
                <option value="BANCOLOMBIA">Bancolombia</option>
                <option value="DAVIPLATA">DaviPlata</option>
              </select>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Concepto / Detalle</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Aporte inicial de capital para préstamos"
                className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                required
              />
            </div>
          </div>

          {/* Footer Fijo */}
          <div className="shrink-0 p-4 border-t border-[#221D33] bg-[#0E0D14]/98 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/70 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplicar Movimiento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
