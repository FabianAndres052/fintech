'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReceiptModal from '@/components/ReceiptModal';

export default function PortalPagarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [selectedInstId, setSelectedInstId] = useState<number | null>(null);
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
          const activeWithPending = data.loans.filter(
            (l: any) => l.status === 'ACTIVO' && l.periodicity !== 'LIBRE' && Number(l.balance_remaining) > 0
          );
          setLoans(activeWithPending);

          const paramLoanId = searchParams.get('loanId');
          const paramInstId = searchParams.get('instId');

          if (paramLoanId && activeWithPending.some((l: any) => l.id === Number(paramLoanId))) {
            setSelectedLoanId(Number(paramLoanId));
            if (paramInstId) setSelectedInstId(Number(paramInstId));
          } else if (activeWithPending.length > 0) {
            setSelectedLoanId(activeWithPending[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams]);

  const selectedLoan = loans.find((l) => l.id === selectedLoanId);
  const pendingInstallments = selectedLoan?.installments?.filter(
    (i: any) => i.status === 'PENDIENTE' || i.status === 'PARCIAL' || i.status === 'VENCIDA'
  ) || [];

  const selectedInstallment = pendingInstallments.find((i: any) => i.id === selectedInstId) || pendingInstallments[0];

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handlePay = async () => {
    if (!selectedLoan || !selectedInstallment) return;
    setError(null);
    setProcessing(true);

    try {
      if (paymentMethod === 'BOLD') {
        // Iniciar pago con Bold
        const resInit = await fetch('/api/portal/payments/bold/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loan_id: selectedLoan.id,
            installment_id: selectedInstallment.id,
            amount: Number(selectedInstallment.balance),
            payment_type: 'CUOTA',
          }),
        });

        const initData = await resInit.json();
        if (!resInit.ok) throw new Error(initData.error || 'Error al iniciar Bold');

        // Confirmar webhook de Bold (simulación sandbox automática segura)
        const webhookRes = await fetch('/api/webhooks/bold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: initData.orderId,
            status: 'APPROVED',
            transaction_id: `TX-BOLD-${Date.now()}`,
            payment_method_type: 'PSE_NEQUI',
          }),
        });

        const webhookData = await webhookRes.json();
        if (!webhookRes.ok) throw new Error(webhookData.error || 'Error procesando webhook de pago');

        // Obtener el recibo recién creado
        const code = webhookData.data?.paymentCode;
        if (code) {
          const recRes = await fetch(`/api/portal/receipts?code=${code}`);
          const recData = await recRes.json();
          if (recData.receipts && recData.receipts.length > 0) {
            setSuccessReceipt(recData.receipts[0]);
          }
        }
      } else {
        // Reportar transferencia vía WhatsApp al administrador
        const amountStr = formatCOP(Number(selectedInstallment.balance));
        const msg = `¡Hola FINTECH! He realizado el pago de la cuota #${selectedInstallment.installment_number} del crédito ${selectedLoan.loan_code} por valor de ${amountStr}. Adjunto comprobante de transferencia bancaria para su validación.`;
        window.open(`https://wa.me/573152076489?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando módulo de pagos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Pagar Cuota</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Paga tus cuotas en línea mediante PSE, Nequi, tarjetas o transferencia directa.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
          {error}
        </div>
      )}

      {loans.length === 0 ? (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-8 text-center text-neutral-400">
          <p className="text-sm font-semibold text-emerald-400">¡Estás al día!</p>
          <p className="text-xs mt-1">No tienes cuotas pendientes por pagar en este momento.</p>
        </div>
      ) : (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* 1. Seleccionar Crédito */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              1. Selecciona el Crédito
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loans.map((loan) => (
                <button
                  key={loan.id}
                  type="button"
                  onClick={() => {
                    setSelectedLoanId(loan.id);
                    setSelectedInstId(null);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedLoanId === loan.id
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-lg shadow-purple-950/40'
                      : 'bg-[#181527] border-[#26213A] text-neutral-300 hover:border-[#8B5CF6]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-white">{loan.loan_code}</span>
                    <span className="text-[10px] font-bold text-emerald-400">{loan.status}</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Saldo: <strong className="text-white">{formatCOP(loan.balance_remaining)}</strong>
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Seleccionar Cuota */}
          {selectedLoan && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                2. Selecciona la Cuota a Pagar
              </label>

              {pendingInstallments.length === 0 ? (
                <p className="text-xs text-emerald-400">Todas las cuotas de este crédito están pagadas.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {pendingInstallments.map((inst: any) => {
                    const isSelected = (selectedInstallment?.id === inst.id);
                    return (
                      <div
                        key={inst.id}
                        onClick={() => setSelectedInstId(inst.id)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] shadow-md'
                            : 'bg-[#181527] border-[#26213A] hover:bg-[#1E1A33]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#8B5CF6] bg-[#8B5CF6]' : 'border-neutral-500'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block">
                              Cuota #{inst.installment_number}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              Vence: {formatDate(inst.due_date)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-white block">
                            {formatCOP(inst.balance)}
                          </span>
                          <span className={`text-[9px] font-bold ${inst.status === 'VENCIDA' ? 'text-red-400' : 'text-amber-400'}`}>
                            {inst.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Método de Pago */}
          {selectedInstallment && (
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

              {/* Info Bank Details if Transfer */}
              {paymentMethod === 'TRANSFERENCIA' && (
                <div className="mt-3 p-4 rounded-2xl bg-[#1A172A] border border-[#2D2746] text-xs space-y-1 text-neutral-300">
                  <p className="font-bold text-white text-[11px] uppercase tracking-wide">Datos para Transferir:</p>
                  <p>• <strong>Banco:</strong> Bancolombia (Ahorros # 123-456789-01)</p>
                  <p>• <strong>Llave Bre-B:</strong> Celular 315 207 6489</p>
                  <p>• <strong>Titular:</strong> FINTECH S.A.S.</p>
                  <p className="text-[10px] text-amber-300 pt-1">
                    Al confirmar, se abrirá WhatsApp para que envíes tu comprobante directamente al asesor.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. Resumen y Botón Pagar */}
          {selectedInstallment && (
            <div className="pt-4 border-t border-[#231E33] space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Total a pagar:</span>
                <span className="text-2xl font-black text-emerald-400">
                  {formatCOP(selectedInstallment.balance)}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePay}
                disabled={processing}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#9D76F8] hover:to-[#8B5CF6] active:scale-[0.98] text-white font-extrabold text-sm transition-all shadow-xl shadow-purple-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Procesando pago seguro...</span>
                  </>
                ) : (
                  <span>
                    {paymentMethod === 'BOLD'
                      ? `Pagar ${formatCOP(selectedInstallment.balance)} con Bold`
                      : 'Confirmar y Enviar Comprobante por WhatsApp'}
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
