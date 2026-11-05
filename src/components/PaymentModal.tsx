'use client';

import { useState, useEffect } from 'react';
import { X, Receipt, AlertCircle, CheckCircle2, DollarSign, CreditCard } from 'lucide-react';
import { formatCOP, getLoanLabel } from '@/lib/calculations';
import { Loan } from '@/lib/types';
import ReceiptModal from './ReceiptModal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultLoanId?: number;
  defaultAmount?: number;
  defaultInstallmentId?: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultLoanId,
  defaultAmount,
  defaultInstallmentId,
}: PaymentModalProps) {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    defaultLoanId ? String(defaultLoanId) : ''
  );
  const [amount, setAmount] = useState<string>(
    defaultAmount ? String(defaultAmount) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprobante generado
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Incluir préstamos tanto ACTIVOS como EN_MORA
      fetch('/api/loans')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const payable = data.loans.filter(
              (x: Loan) => x.status === 'ACTIVO' || x.status === 'EN_MORA'
            );
            setActiveLoans(payable);

            if (defaultLoanId) {
              setSelectedLoanId(String(defaultLoanId));
              const l = payable.find((x: Loan) => x.id === defaultLoanId);
              if (defaultAmount) {
                setAmount(String(defaultAmount));
              } else if (l) {
                setAmount(Number(l.payment_per_installment) > 0 ? String(l.payment_per_installment) : '');
              }
            } else if (payable.length > 0 && !selectedLoanId) {
              setSelectedLoanId(String(payable[0].id));
              if (defaultAmount) {
                setAmount(String(defaultAmount));
              } else {
                setAmount(Number(payable[0].payment_per_installment) > 0 ? String(payable[0].payment_per_installment) : '');
              }
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, defaultLoanId, defaultAmount]);

  const selectedLoan = activeLoans.find((l) => String(l.id) === selectedLoanId);

  // Agrupar préstamos por cliente para que el administrador seleccione exactamente a qué crédito abonar
  const clientGroups = Object.values(
    activeLoans.reduce((acc: { [key: string]: { clientName: string; loans: Loan[] } }, loan) => {
      const key = String(loan.client_id || loan.client_name || 'general');
      if (!acc[key]) {
        acc[key] = {
          clientName: loan.client_name || 'Cliente',
          loans: [],
        };
      }
      acc[key].loans.push(loan);
      return acc;
    }, {})
  );

  const handleLoanChange = (loanId: string) => {
    setSelectedLoanId(loanId);
    const l = activeLoans.find((x) => String(x.id) === loanId);
    if (l) {
      setAmount(Number(l.payment_per_installment) > 0 ? String(l.payment_per_installment) : '');
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmount(String(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!selectedLoanId || isNaN(numAmount) || numAmount <= 0) {
      setError('Ingrese un monto válido mayor a 0.');
      return;
    }

    if (selectedLoan && numAmount > Number(selectedLoan.balance_remaining)) {
      setError(
        `El monto ($ ${new Intl.NumberFormat('es-CO').format(numAmount)}) supera el saldo restante del crédito seleccionado ($ ${new Intl.NumberFormat('es-CO').format(selectedLoan.balance_remaining)}).`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: Number(selectedLoanId),
          installment_id: defaultInstallmentId ? Number(defaultInstallmentId) : undefined,
          amount: numAmount,
          payment_method: paymentMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el pago.');
      }

      // Preparar recibo
      setReceiptData({
        paymentCode: data.payment.paymentCode,
        clientName: selectedLoan?.client_name || 'Cliente',
        clientDocument: selectedLoan?.client_document || 'N/A',
        loanCode: `${selectedLoan?.loan_code || 'PRE'} — ${getLoanLabel(selectedLoan)}`,
        amountPaid: data.payment.amountPaid,
        capitalPaid: data.payment.capitalPaid,
        interestPaid: data.payment.interestPaid,
        newLoanBalance: data.payment.newLoanBalance,
        paymentMethod: paymentMethod,
        paymentDate: data.payment.paymentDate,
        notes: notes || `Abono a ${getLoanLabel(selectedLoan)}`,
      });

      setShowReceipt(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-neutral-100">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-black/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shadow-md">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Registrar Recaudo</h3>
                <p className="text-xs text-neutral-400">Abono a cuota, pago parcial o liquidación total</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Selector de préstamo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Préstamo Activo</label>
              {activeLoans.length === 0 ? (
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-amber-300">
                  No hay préstamos activos pendientes de pago.
                </div>
              ) : (
                <select
                  value={selectedLoanId}
                  onChange={(e) => handleLoanChange(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Seleccione el crédito específico al cual abonar...</option>
                  {clientGroups.map((group) => (
                    <optgroup key={group.clientName} label={`${group.clientName} (${group.loans.length} obligación${group.loans.length > 1 ? 'es' : ''})`}>
                      {group.loans.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.loan_code} — {getLoanLabel(l)} | Saldo: {formatCOP(l.balance_remaining)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Tarjeta de estado del crédito seleccionado (datos separados) */}
            {selectedLoan && (
              <div className="p-4 rounded-2xl bg-black/60 border border-emerald-900/50 space-y-2.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      Crédito Destinatario del Abono
                    </span>
                    <p className="font-bold text-white text-sm">
                      {selectedLoan.loan_code} — {getLoanLabel(selectedLoan)}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Cliente: <strong className="text-neutral-200">{selectedLoan.client_name}</strong>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedLoan.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div>
                    <span className="text-neutral-400 text-[11px]">Saldo Pendiente de este Crédito:</span>
                    <p className="font-extrabold text-emerald-400 text-base">
                      {formatCOP(selectedLoan.balance_remaining)}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[11px]">Modalidad del Crédito:</span>
                    <p className="font-bold text-white">
                      {selectedLoan.installments_count > 0
                        ? `${formatCOP(selectedLoan.payment_per_installment)} (${selectedLoan.periodicity.toLowerCase()})`
                        : 'Abonos Libres a Capital (Sin cuotas)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[11px]">Capital Inicial Desembolsado:</span>
                    <p className="text-neutral-300 font-semibold">{formatCOP(selectedLoan.capital_amount)}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[11px]">Total Pactado en este Crédito:</span>
                    <p className="text-neutral-300 font-semibold">{formatCOP(selectedLoan.total_amount)}</p>
                  </div>
                </div>
                {selectedLoan.notes && (
                  <p className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-800/80 italic">
                    {selectedLoan.notes}
                  </p>
                )}
              </div>
            )}

            {/* Monto del abono */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Monto del Abono / Recaudo (COP)</span>
                {selectedLoan && (
                  <span className="text-[11px] text-neutral-400">
                    Máx: {formatCOP(selectedLoan.balance_remaining)}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 85000"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Botones de sugerencia rápida según el tipo de crédito */}
              {selectedLoan && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Number(selectedLoan.payment_per_installment) > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(Number(selectedLoan.payment_per_installment))}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 cursor-pointer"
                      >
                        1 Cuota ({formatCOP(selectedLoan.payment_per_installment)})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickAmount(Number(selectedLoan.payment_per_installment) * 2)
                        }
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 cursor-pointer"
                      >
                        2 Cuotas ({formatCOP(Number(selectedLoan.payment_per_installment) * 2)})
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(200000)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 cursor-pointer"
                      >
                        $ 200.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(400000)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 cursor-pointer"
                      >
                        $ 400.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(700000)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 cursor-pointer"
                      >
                        $ 700.000
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(Number(selectedLoan.balance_remaining))}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/40 text-[11px] text-emerald-400 font-semibold cursor-pointer"
                  >
                    Liquidar Saldo ({formatCOP(selectedLoan.balance_remaining)})
                  </button>
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Canal / Medio de Recaudo</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="NEQUI">Nequi</option>
                <option value="DAVIPLATA">DaviPlata</option>
                <option value="BANCOLOMBIA">Bancolombia</option>
                <option value="OTRO_BANCO">Otros Bancos (PSE)</option>
              </select>
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Nota u Observación (Opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Pago de cuota semanal o referencia de transferencia"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Botones */}
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
                disabled={loading || activeLoans.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                {loading ? (
                  <span>Registrando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Recaudo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Recibo emergente generado */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          onClose();
        }}
        receipt={receiptData}
      />
    </>
  );
}
