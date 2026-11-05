'use client';

import { X, Printer, Share2, CheckCircle2, MessageCircle } from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/calculations';

interface ReceiptData {
  paymentCode: string;
  clientName: string;
  clientDocument: string;
  loanCode: string;
  amountPaid: number;
  capitalPaid: number;
  interestPaid: number;
  newLoanBalance: number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export default function ReceiptModal({ isOpen, onClose, receipt }: ReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const getReceiptText = () => {
    return (
      `*COMPROBANTE OFICIAL DE PAGO*\n` +
      `--------------------------------\n` +
      `*Recibo:* ${receipt.paymentCode}\n` +
      `*Cliente:* ${receipt.clientName}\n` +
      `*Cédula:* ${receipt.clientDocument}\n` +
      `*Préstamo:* ${receipt.loanCode}\n` +
      `*Monto Pagado:* ${formatCOP(receipt.amountPaid)}\n` +
      `*Capital amortizado:* ${formatCOP(receipt.capitalPaid)}\n` +
      `*Interés cubierto:* ${formatCOP(receipt.interestPaid)}\n` +
      `*Saldo Restante:* ${formatCOP(receipt.newLoanBalance)}\n` +
      `*Medio de Pago:* ${receipt.paymentMethod}\n` +
      `*Fecha:* ${formatDate(receipt.paymentDate)}\n` +
      `--------------------------------\n` +
      `_¡Gracias por su puntualidad!_ - *FINTECH*`
    );
  };

  const handleWhatsApp = () => {
    const text = getReceiptText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShare = () => {
    const text = getReceiptText();
    if (navigator.share) {
      navigator.share({
        title: `Comprobante de Pago ${receipt.paymentCode}`,
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Información del comprobante copiada al portapapeles.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-neutral-100">
        {/* Receipt Header (No print action buttons) */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-black/60 no-print">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Comprobante Oficial de Pago
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Voucher Card (Printable Area) */}
        <div id="printable-receipt" className="p-6 bg-black/40 text-neutral-200 space-y-4">
          <div className="text-center pb-3 border-b border-dashed border-neutral-800">
            <h3 className="text-lg font-black text-white tracking-wider">FINTECH</h3>
            <p className="text-[11px] text-neutral-400">NIT: 901.849.201-4 | Tel: +57 300 123 4567</p>
            <p className="text-[11px] text-neutral-400">Plataforma de Préstamos y Finanzas</p>
            <div className="mt-2 inline-block px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              {receipt.paymentCode}
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Fecha y Hora:</span>
              <span className="font-medium text-white">{formatDate(receipt.paymentDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cliente:</span>
              <span className="font-semibold text-white">{receipt.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Documento / Cédula:</span>
              <span className="font-mono text-slate-300">{receipt.clientDocument}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Contrato / Préstamo:</span>
              <span className="font-mono text-emerald-400 font-semibold">{receipt.loanCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Método de Pago:</span>
              <span className="font-medium text-slate-300">{receipt.paymentMethod}</span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between text-sm py-1 font-bold text-white">
                <span>VALOR PAGADO:</span>
                <span className="text-emerald-400 text-base">{formatCOP(receipt.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Distribución Capital:</span>
                <span>{formatCOP(receipt.capitalPaid)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Distribución Intereses:</span>
                <span>{formatCOP(receipt.interestPaid)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-800 flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Saldo Restante Préstamo:</span>
              <span className="text-teal-300">{formatCOP(receipt.newLoanBalance)}</span>
            </div>

            {receipt.notes && (
              <div className="pt-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Nota:</span> {receipt.notes}
              </div>
            )}
          </div>

          <div className="text-center pt-3 border-t border-dashed border-slate-800 text-[10px] text-slate-500">
            Comprobante electrónico válido expedido por el sistema financiero. ¡Gracias por su puntualidad!
          </div>
        </div>

        {/* Receipt Actions Footer */}
        <div className="p-4 bg-black/70 border-t border-neutral-800 flex items-center justify-between gap-2.5 no-print">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
