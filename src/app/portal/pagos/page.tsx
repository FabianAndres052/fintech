'use client';

import React, { useState, useEffect } from 'react';
import ReceiptModal from '@/components/ReceiptModal';

export default function PortalPagosPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/portal/payments')
      .then((res) => res.json())
      .then((data) => {
        if (data.payments) setPayments(data.payments);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenReceipt = async (payment: any) => {
    const code = payment.receipt_code || payment.payment_code;
    try {
      const res = await fetch(`/api/portal/receipts?code=${code}`);
      const data = await res.json();
      if (data.receipts && data.receipts.length > 0) {
        setSelectedReceipt(data.receipts[0]);
      } else {
        // Fallback receipt
        setSelectedReceipt({
          receipt_code: code,
          receipt_date: payment.payment_date,
          total_amount: Number(payment.amount_paid),
          client_name: payment.client_name || 'Cliente',
          client_phone: payment.phone || '',
          client_document: payment.document_number || '',
          items: [
            {
              loanCode: payment.loan_code,
              installmentNumber: payment.installment_number,
              amountPaid: Number(payment.amount_paid),
              remainingBalance: 0,
              paymentMethod: payment.payment_method,
            },
          ],
        });
      }
    } catch {
      alert('No se pudo cargar el comprobante.');
    }
  };

  const filtered = payments.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.payment_code && p.payment_code.toLowerCase().includes(term)) ||
      (p.loan_code && p.loan_code.toLowerCase().includes(term)) ||
      (p.payment_method && p.payment_method.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando historial de pagos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Mis Pagos</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Historial detallado de todas las cuotas y abonos realizados con sus comprobantes oficiales.
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o crédito..."
          className="bg-[#13111E] border border-[#26213A] rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6] w-full sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-10 text-center text-neutral-400">
          <p className="text-xs">No se encontraron pagos registrados.</p>
        </div>
      ) : (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181527] text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-[#26213A]">
                <tr>
                  <th className="py-4 px-4">Comprobante</th>
                  <th className="py-4 px-4">Crédito</th>
                  <th className="py-4 px-4">Concepto</th>
                  <th className="py-4 px-4">Medio</th>
                  <th className="py-4 px-4">Fecha</th>
                  <th className="py-4 px-4">Valor Pagado</th>
                  <th className="py-4 px-4">Estado</th>
                  <th className="py-4 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#231E33]">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1A172A]/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#A78BFA]">
                      {p.payment_code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{p.loan_code}</td>
                    <td className="py-3.5 px-4 text-neutral-300">
                      {p.installment_number ? `Cuota #${p.installment_number}` : 'Abono libre a capital'}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 font-semibold">{p.payment_method}</td>
                    <td className="py-3.5 px-4 text-neutral-400">{formatDate(p.payment_date)}</td>
                    <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                      {formatCOP(p.amount_paid)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Confirmado
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenReceipt(p)}
                        className="py-1.5 px-3 rounded-xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6] text-[#C4B5FD] hover:text-white font-bold text-[10px] transition-all cursor-pointer shadow-sm"
                      >
                        Ver Ticket PNG
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <ReceiptModal
          isOpen={Boolean(selectedReceipt)}
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
