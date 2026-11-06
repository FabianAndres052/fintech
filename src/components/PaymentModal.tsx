'use client';

import { useState, useEffect } from 'react';
import { X, Receipt, AlertCircle, CheckCircle2, DollarSign, CreditCard, Calendar, Wallet } from 'lucide-react';
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
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFERENCIA');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprobante generado
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (isOpen) {
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

  // Agrupar préstamos por cliente para que la administradora elija con exactitud
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
      setError('Por favor ingrese un monto válido mayor a 0.');
      return;
    }

    if (selectedLoan && numAmount > Number(selectedLoan.balance_remaining)) {
      setError(
        `El monto ($ ${new Intl.NumberFormat('es-CO').format(numAmount)}) supera el saldo restante ($ ${new Intl.NumberFormat('es-CO').format(selectedLoan.balance_remaining)}).`
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
          payment_date: paymentDate,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el pago.');
      }

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
        paymentDate: data.payment.paymentDate || paymentDate,
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
      <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md overflow-hidden p-0 sm:p-4">
        <div className="w-full sm:max-w-lg bg-[#0E0D14] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] text-neutral-100 animate-in slide-in-from-bottom duration-200 overflow-hidden">
          {/* Header Fijo */}
          <div className="shrink-0 px-5 py-4 border-b border-[#221D33] bg-[#0E0D14]/95 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-bold shadow-md shadow-purple-950/40">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Registrar Pago</h3>
                <p className="text-[11px] text-neutral-400">Abono directo a la obligación seleccionada</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulario con Scroll Interno Suave */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 touch-scroll">
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Selector de Crédito */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Seleccionar Crédito a Abonar</label>
                {activeLoans.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-amber-300">
                    No hay obligaciones pendientes de pago.
                  </div>
                ) : (
                  <select
                    value={selectedLoanId}
                    onChange={(e) => handleLoanChange(e.target.value)}
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-3 text-sm text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                    required
                  >
                    <option value="">Seleccione el crédito específico...</option>
                    {clientGroups.map((group) => (
                      <optgroup key={group.clientName} label={`${group.clientName} (${group.loans.length} crédito${group.loans.length > 1 ? 's' : ''})`}>
                        {group.loans.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.client_name} — {getLoanLabel(l)} | Saldo: {formatCOP(l.balance_remaining)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>

              {/* Tarjeta de Resumen del Crédito Seleccionado */}
              {selectedLoan && (
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#1B1226] via-[#14121F] to-[#1F111E] border border-[#8B5CF6]/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2D2545]/60">
                    <div>
                      <span className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider block">
                        {selectedLoan.client_name}
                      </span>
                      <p className="font-bold text-white text-sm">
                        {getLoanLabel(selectedLoan)}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA]">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div>
                      <span className="text-neutral-400 text-[11px] block">Saldo Pendiente:</span>
                      <p className="font-black text-white text-base sm:text-lg">
                        {formatCOP(selectedLoan.balance_remaining)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-400 text-[11px] block">Valor Cuota Normal:</span>
                      <p className="font-bold text-[#A78BFA] text-sm">
                        {Number(selectedLoan.payment_per_installment) > 0
                          ? formatCOP(selectedLoan.payment_per_installment)
                          : 'Abono libre'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Campo Valor del Pago */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Valor del Pago (COP)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="87.000"
                    min="1"
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl pl-8 pr-4 py-3 text-base font-bold text-white placeholder-neutral-600 focus:outline-none focus:border-[#E5092F]"
                    required
                  />
                </div>

                {/* Botones de sugerencia rápida */}
                {selectedLoan && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Number(selectedLoan.payment_per_installment) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(Number(selectedLoan.payment_per_installment))}
                        className="px-2.5 py-1 rounded-xl text-xs bg-[#1A1828] hover:bg-[#252038] text-[#A78BFA] border border-[#8B5CF6]/30 transition-colors"
                      >
                        1 Cuota: {formatCOP(selectedLoan.payment_per_installment)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(Number(selectedLoan.balance_remaining))}
                      className="px-2.5 py-1 rounded-xl text-xs bg-[#24131A] hover:bg-[#331822] text-[#E5092F] border border-[#E5092F]/30 transition-colors"
                    >
                      Total: {formatCOP(selectedLoan.balance_remaining)}
                    </button>
                  </div>
                )}
              </div>

              {/* Fecha de Pago y Método de Pago en 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Fecha de Pago</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="TRANSFERENCIA">Transferencia / Nequi / Bancolombia</option>
                    <option value="EFECTIVO">Efectivo (Ingresa a Caja)</option>
                    <option value="OTRO">Otro Método</option>
                  </select>
                </div>
              </div>

              {/* Observaciones (opcional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400">Observación (Opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Abono recibido por Nequi"
                  className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>

            {/* Footer Fijo con Botón de Confirmación Siempre Accesible */}
            <div className="shrink-0 p-4 border-t border-[#221D33] bg-[#0E0D14]/98 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 px-4 rounded-2xl text-xs font-semibold bg-[#181622] hover:bg-neutral-800 text-neutral-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedLoanId}
                className="flex-[2] py-3.5 px-5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/70 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Registrando...</span>
                ) : (
                  <>
                    <span>Confirmar Pago</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Comprobante / Recibo */}
      {showReceipt && receiptData && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            onClose();
          }}
          data={receiptData}
        />
      )}
    </>
  );
}
