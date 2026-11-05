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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-neutral-100">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-700/40 flex items-center justify-center text-red-400 font-bold shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Movimiento de Caja</h3>
              <p className="text-xs text-neutral-400">Aportes, retiros y gastos operativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Saldo actual */}
          <div className="p-3 rounded-2xl bg-black/60 border border-neutral-800 flex justify-between items-center text-xs">
            <span className="text-neutral-400">Saldo Actual en Caja:</span>
            <span className="text-sm font-extrabold text-emerald-400">{formatCOP(currentCash)}</span>
          </div>

          {/* Tipo de movimiento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Tipo de Operación</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('APORTE_CAPITAL');
                  setCategory('APORTE_CAPITAL');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  type === 'APORTE_CAPITAL'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                <span>Aporte Capital</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('RETIRO_CAPITAL');
                  setCategory('RETIRO_CAPITAL');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  type === 'RETIRO_CAPITAL'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4 text-amber-400" />
                <span>Retiro Capital</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('GASTO');
                  setCategory('GASTO_OPERATIVO');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  type === 'GASTO'
                    ? 'bg-red-950/40 border-red-800/40 text-red-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4 text-red-400" />
                <span>Gasto Operativo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('INGRESO');
                  setCategory('INGRESO_EXTRA');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  type === 'INGRESO'
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4 text-neutral-300" />
                <span>Ingreso Extra</span>
              </button>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Monto (COP)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 1000000"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-red-600"
              required
            />
            {amount && <p className="text-[11px] text-neutral-400">{formatCOP(amount)}</p>}
          </div>

          {/* Método */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Medio</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-red-600"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="NEQUI">Nequi</option>
              <option value="DAVIPLATA">DaviPlata</option>
              <option value="BANCOLOMBIA">Bancolombia</option>
            </select>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Concepto / Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Inyección de capital para apertura de préstamos"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-red-600"
              required
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-lg shadow-red-950/50 disabled:opacity-50"
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
