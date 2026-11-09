'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReceiptModal from '@/components/ReceiptModal';

export default function PortalAbonarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'BOLD' | 'TRANSFERENCIA'>('BOLD');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/portal/credits')
      .then((res) => res.json())
      .then((data) => {
        if (data.loans) {
          const active = data.loans.filter((l: any) => l.status === 'ACTIVO' && Number(l.balance_remaining) > 0);
          setLoans(active);

          const paramLoanId = searchParams.get('loanId');
          if (paramLoanId && active.some((l: any) => l.id === Number(paramLoanId))) {
            setSelectedLoanId(Number(paramLoanId));
          } else if (active.length > 0) {
            setSelectedLoanId(active[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams]);

  const selectedLoan = loans.find((l) => l.id === selectedLoanId);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleAbono = async () => {
    if (!selectedLoan) return;
    const numAmount = parseFloat(amount.replace(/\D/g, ''));
    if (!numAmount || numAmount <= 0) {
      setError('Ingresa un valor válido a abonar.');
      return;
    }
    if (numAmount > Number(selectedLoan.balance_remaining)) {
      setError(`El valor a abonar no puede exceder el saldo restante (${formatCOP(selectedLoan.balance_remaining)}).`);
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      if (paymentMethod === 'BOLD') {
        const resInit = await fetch('/api/portal/payments/bold/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loan_id: selectedLoan.id,
            amount: numAmount,
            payment_type: 'ABONO',
          }),
        });

        const initData = await resInit.json();
        if (!resInit.ok) throw new Error(initData.error || 'Error al iniciar Bold');

        // Confirmar webhook Bold (simulación sandbox)
        const webhookRes = await fetch('/api/webhooks/bold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: initData.orderId,
            status: 'APPROVED',
            transaction_id: `TX-BOLD-ABONO-${Date.now()}`,
            payment_method_type: 'PSE_NEQUI',
          }),
        });

        const webhookData = await webhookRes.json();
        if (!webhookRes.ok) throw new Error(webhookData.error || 'Error procesando webhook de abono');

        const code = webhookData.data?.paymentCode;
        if (code) {
          const recRes = await fetch(`/api/portal/receipts?code=${code}`);
          const recData = await recRes.json();
          if (recData.receipts && recData.receipts.length > 0) {
            setSuccessReceipt(recData.receipts[0]);
          }
        }
      } else {
        const amountStr = formatCOP(numAmount);
        const msg = `¡Hola FINTECH! He realizado un abono de ${amountStr} a mi crédito ${selectedLoan.loan_code}. Adjunto comprobante de transferencia bancaria.`;
        window.open(`https://wa.me/573152076489?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el abono.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando abonos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Realizar Abono Libre</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Abona la cantidad que desees directamente al capital de tu deuda y reduce tus intereses.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
          {error}
        </div>
      )}

      {loans.length === 0 ? (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-8 text-center text-neutral-400">
          <p className="text-sm font-semibold text-emerald-400">¡No tienes deudas activas!</p>
          <p className="text-xs mt-1">Todos tus créditos se encuentran totalmente saldados.</p>
        </div>
      ) : (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* 1. Seleccionar Crédito */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              1. Selecciona la Obligación a la que Deseas Abonar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loans.map((loan) => (
                <button
                  key={loan.id}
                  type="button"
                  onClick={() => setSelectedLoanId(loan.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedLoanId === loan.id
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-lg'
                      : 'bg-[#181527] border-[#26213A] text-neutral-300 hover:border-[#8B5CF6]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-white">{loan.loan_code}</span>
                    <span className="text-[10px] font-bold text-emerald-400">{loan.status}</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Saldo actual: <strong className="text-[#E5092F]">{formatCOP(loan.balance_remaining)}</strong>
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Valor a Abonar */}
          {selectedLoan && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                2. Valor a Abonar ($ COP)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setAmount(raw ? Number(raw).toLocaleString('es-CO') : '');
                  }}
                  placeholder="Ej: 100.000"
                  className="w-full bg-[#1A172A] border border-[#2D2746] rounded-2xl pl-8 pr-4 py-3.5 text-base font-black text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Saldo pendiente de este crédito: <strong className="text-white">{formatCOP(selectedLoan.balance_remaining)}</strong>
              </p>
            </div>
          )}

          {/* 3. Medio de Pago */}
          {selectedLoan && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                3. Medio de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BOLD')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'BOLD'
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-lg'
                      : 'bg-[#181527] border-[#26213A] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="font-extrabold text-xs text-white">Bold Online</span>
                  </div>
                  <p className="text-[10px] text-neutral-400">PSE, Nequi, Daviplata, Tarjetas</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFERENCIA')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'TRANSFERENCIA'
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-lg'
                      : 'bg-[#181527] border-[#26213A] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span className="font-extrabold text-xs text-white">Transferencia / Bre-B</span>
                  </div>
                  <p className="text-[10px] text-neutral-400">Bancolombia, Llave Bre-B</p>
                </button>
              </div>
            </div>
          )}

          {/* 4. Botón Abonar */}
          {selectedLoan && (
            <div className="pt-4 border-t border-[#231E33]">
              <button
                type="button"
                onClick={handleAbono}
                disabled={processing || !amount}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#9D76F8] hover:to-[#8B5CF6] active:scale-[0.98] text-white font-extrabold text-sm transition-all shadow-xl shadow-purple-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Procesando abono...</span>
                  </>
                ) : (
                  <span>
                    {paymentMethod === 'BOLD' ? `Abonar $${amount || '0'} con Bold` : 'Abonar por Transferencia'}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recibo generado automáticamente */}
      {successReceipt && (
        <ReceiptModal
          isOpen={Boolean(successReceipt)}
          receipt={successReceipt}
          onClose={() => {
            setSuccessReceipt(null);
            router.push('/portal/recibos');
          }}
        />
      )}
    </div>
  );
}
