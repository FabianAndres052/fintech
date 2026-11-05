'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Calculator, AlertCircle, CheckCircle2, Calendar, User, DollarSign, Clock } from 'lucide-react';
import { calculateLoan, formatCOP, formatDate } from '@/lib/calculations';
import { Client, Periodicity } from '@/lib/types';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableCash?: number;
  defaultClientId?: number;
}

export default function NewLoanModal({ isOpen, onClose, onSuccess, availableCash = 0, defaultClientId }: NewLoanModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    defaultClientId ? String(defaultClientId) : ''
  );
  const [capital, setCapital] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [installmentsCount, setInstallmentsCount] = useState<number>(20);
  const [periodicity, setPeriodicity] = useState<Periodicity>('SEMANAL');
  const [disbursementDate, setDisbursementDate] = useState<string>('2026-01-01');
  const [startDate, setStartDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [notes, setNotes] = useState<string>('');
  const [isHistorical, setIsHistorical] = useState<boolean>(false);
  const [paidInstallmentsCount, setPaidInstallmentsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAmortization, setShowAmortization] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDisbursementDate(new Date().toISOString().substring(0, 10));
    }
  }, []);

  // Cargar clientes activos
  useEffect(() => {
    if (isOpen) {
      fetch('/api/clients')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setClients(data.clients.filter((c: Client) => c.status !== 'BLOQUEADO'));
            if (defaultClientId) {
              setSelectedClientId(String(defaultClientId));
            } else if (data.clients.length > 0 && !selectedClientId) {
              setSelectedClientId(String(data.clients[0].id));
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, defaultClientId]);

  // Cálculo en tiempo real de amortización y cuotas
  const calculation = useMemo(() => {
    return calculateLoan({
      capital: Number(capital),
      interestRate: Number(interestRate),
      installmentsCount: Number(installmentsCount),
      periodicity,
      disbursementDate,
      firstPaymentDate: startDate || undefined,
    });
  }, [capital, interestRate, installmentsCount, periodicity, disbursementDate, startDate]);

  // Restricción de cuotas según capital
  const maxAllowedInstallments = capital < 1000000 ? 20 : 28;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedClientId) {
      setError('Debe seleccionar un cliente.');
      return;
    }

    if (!calculation.isValid) {
      setError(calculation.validationError || 'Parámetros del préstamo inválidos.');
      return;
    }

    if (!isHistorical && capital > availableCash) {
      setError(
        `Saldo insuficiente en caja ($ ${new Intl.NumberFormat('es-CO').format(availableCash)} COP) para prestar $ ${new Intl.NumberFormat('es-CO').format(capital)} COP.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Number(selectedClientId),
          capital_amount: capital,
          interest_rate: interestRate,
          installments_count: installmentsCount,
          periodicity,
          disbursement_date: disbursementDate,
          start_date: startDate || undefined,
          payment_method: paymentMethod,
          notes,
          is_historical: isHistorical,
          affect_cash: !isHistorical,
          paid_installments_count: isHistorical ? paidInstallmentsCount : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear préstamo.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-neutral-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700/20 border border-red-700/40 flex items-center justify-center text-red-500 font-bold shadow-md">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Nuevo Préstamo</h3>
              <p className="text-xs text-neutral-400">Interés mensual proporcional al plazo y cronograma de amortización</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cliente */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-400" />
                <span>Cliente Destinatario</span>
              </label>
              {clients.length === 0 ? (
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-amber-300">
                  No hay clientes registrados aún. Por favor registre primero un cliente en el módulo Clientes.
                </div>
              ) : (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  required
                >
                  <option value="">Seleccione un cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name || ''}{c.document_number ? ` — ${c.document_type || 'CC'}: ${c.document_number}` : ''}{c.phone ? ` (${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Capital */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-red-400" />
                  <span>Capital a Prestar (COP)</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-normal">Min: $100K - Max: $10M</span>
              </label>
              <input
                type="number"
                min="100000"
                max="10000000"
                step="50000"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-red-600"
                required
              />
              <p className="text-[11px] text-neutral-400 font-medium">{formatCOP(capital)}</p>
            </div>

            {/* Tasa de interés mensual */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Tasa de Interés Mensual (%)</span>
                <span className="text-[11px] text-red-400 font-semibold">{interestRate}% mensual</span>
              </label>
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-600"
                required
              />
            </div>

            {/* Número de cuotas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Número de Cuotas</span>
                <span className="text-[11px] text-neutral-400">
                  Máx permitido: {maxAllowedInstallments}
                </span>
              </label>
              <input
                type="number"
                min="1"
                max={maxAllowedInstallments}
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-600"
                required
              />
            </div>

            {/* Periodicidad */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <span>Periodicidad de Pago</span>
              </label>
              <select
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value as Periodicity)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-600"
              >
                <option value="SEMANAL">Semanal (cada 7 días - 4 semanas/mes)</option>
                <option value="QUINCENAL">Quincenal (cada 15 días - 2 quincenas/mes)</option>
                <option value="MENSUAL">Mensual (cada 30 días - 1 mes/cuota)</option>
              </select>
            </div>

            {/* Fecha desembolso */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                <span>Fecha de Desembolso</span>
              </label>
              <input
                type="date"
                value={disbursementDate}
                onChange={(e) => setDisbursementDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-600"
                required
              />
            </div>

            {/* Medio de desembolso */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Medio de Desembolso (Entrega)</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-600"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="NEQUI">Nequi</option>
                <option value="DAVIPLATA">DaviPlata</option>
                <option value="BANCOLOMBIA">Bancolombia</option>
              </select>
            </div>
          </div>

          {/* Opción de Préstamo Anterior (Otorgado antes de tener la App) */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHistorical}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsHistorical(checked);
                  if (!checked) setPaidInstallmentsCount(0);
                }}
                className="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-neutral-950 border-neutral-700 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  ¿Es un préstamo anterior (ya otorgado antes de tener la app)?
                </span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">
                  Activarlo te permite registrar préstamos que ya hiciste en el pasado: <strong>no descontará dinero de tu caja actual</strong> y podrás indicar qué fecha tenía y cuántas cuotas ya te pagó el cliente.
                </span>
              </div>
            </label>

            {isHistorical && (
              <div className="pt-3 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-200 block">
                    Cuotas que el cliente ya te pagó antes de hoy (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={installmentsCount}
                    value={paidInstallmentsCount}
                    onChange={(e) =>
                      setPaidInstallmentsCount(Math.min(installmentsCount, Math.max(0, Number(e.target.value))))
                    }
                    placeholder="0"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                  <span className="text-[10px] text-neutral-400 block">
                    {paidInstallmentsCount > 0
                      ? `Se marcarán ${paidInstallmentsCount} cuotas como PAGADAS automáticamente.`
                      : '0 cuotas pagadas (todas quedarán pendientes en el calendario según sus fechas).'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/60 border border-neutral-800 flex flex-col justify-center">
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                    Saldo restante por cobrar
                  </span>
                  <p className="text-emerald-400 font-bold text-base mt-0.5">
                    {formatCOP(
                      Math.max(
                        0,
                        calculation.totalAmount - calculation.paymentPerInstallment * paidInstallmentsCount
                      )
                    )}
                  </p>
                  <span className="text-[10px] text-neutral-500">
                    {installmentsCount - paidInstallmentsCount} cuotas pendientes
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Resumen Financiero en Vivo */}
          <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Resumen de la Operación
              </h4>
              <span className="text-[11px] font-semibold text-neutral-400">
                Duración: <strong className="text-white">{calculation.durationMonths} meses</strong> ({installmentsCount} cuotas {periodicity.toLowerCase()}s)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium">Capital</span>
                <p className="text-sm font-bold text-white mt-0.5">{formatCOP(capital)}</p>
              </div>
              <div className="bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium">Interés Mensual</span>
                <p className="text-sm font-semibold text-neutral-200 mt-0.5">
                  {formatCOP(calculation.monthlyInterest)}
                </p>
              </div>
              <div className="bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium">Duración</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {calculation.durationMonths} {calculation.durationMonths === 1 ? 'mes' : 'meses'}
                </p>
              </div>
              <div className="bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-red-400 block font-medium">Intereses Totales</span>
                <p className="text-sm font-bold text-red-400 mt-0.5">
                  {formatCOP(calculation.interestAmount)}
                </p>
              </div>
              <div className="bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-300 block font-medium">Total a Pagar</span>
                <p className="text-sm font-black text-white mt-0.5">{formatCOP(calculation.totalAmount)}</p>
              </div>
              <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30">
                <span className="text-[10px] text-emerald-300 block font-bold">Valor Cuota</span>
                <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                  {formatCOP(calculation.paymentPerInstallment)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-neutral-400">
                Desde: {formatDate(calculation.startDate)} hasta {formatDate(calculation.endDate)}
              </span>
              <button
                type="button"
                onClick={() => setShowAmortization(!showAmortization)}
                className="text-xs text-red-400 hover:text-red-300 font-medium underline cursor-pointer"
              >
                {showAmortization ? 'Ocultar cronograma' : 'Ver tabla de amortización'}
              </button>
            </div>

            {/* Tabla de amortización desplegable */}
            {showAmortization && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 text-neutral-400 sticky top-0 border-b border-neutral-800">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Fecha Venc.</th>
                      <th className="py-2 px-3">Abono Capital</th>
                      <th className="py-2 px-3">Interés</th>
                      <th className="py-2 px-3">Cuota Total</th>
                      <th className="py-2 px-3">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 bg-neutral-950">
                    {calculation.schedule.map((inst) => (
                      <tr key={inst.installmentNumber} className="hover:bg-neutral-900/60">
                        <td className="py-1.5 px-3 font-semibold text-neutral-300">
                          {inst.installmentNumber}
                        </td>
                        <td className="py-1.5 px-3 text-neutral-400">{formatDate(inst.dueDate)}</td>
                        <td className="py-1.5 px-3 text-neutral-300">{formatCOP(inst.capitalShare)}</td>
                        <td className="py-1.5 px-3 text-neutral-300">{formatCOP(inst.interestShare)}</td>
                        <td className="py-1.5 px-3 font-bold text-white">{formatCOP(inst.totalAmount)}</td>
                        <td className="py-1.5 px-3 text-neutral-400">{formatCOP(inst.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !calculation.isValid || clients.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-lg shadow-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isHistorical ? 'Guardar Préstamo Anterior' : 'Confirmar y Desembolsar'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
