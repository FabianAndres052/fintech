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
  receipt?: ReceiptData | null;
  data?: ReceiptData | null;
}

export default function ReceiptModal({ isOpen, onClose, receipt, data }: ReceiptModalProps) {
  const r = receipt || data;
  if (!isOpen || !r) return null;

  const handlePrint = () => {
    window.print();
  };

  const getReceiptText = () => {
    return (
      `*COMPROBANTE OFICIAL DE PAGO*\n` +
      `--------------------------------\n` +
      `*Recibo:* ${r.paymentCode}\n` +
      `*Cliente:* ${r.clientName}\n` +
      `*Cédula:* ${r.clientDocument}\n` +
      `*Préstamo:* ${r.loanCode}\n` +
      `*Monto Pagado:* ${formatCOP(r.amountPaid)}\n` +
      `*Capital amortizado:* ${formatCOP(r.capitalPaid)}\n` +
      `*Interés cubierto:* ${formatCOP(r.interestPaid)}\n` +
      `*Saldo Restante:* ${formatCOP(r.newLoanBalance)}\n` +
      `*Medio de Pago:* ${r.paymentMethod}\n` +
      `*Fecha:* ${formatDate(r.paymentDate)}\n` +
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
        title: `Comprobante de Pago ${r.paymentCode}`,
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Información del comprobante copiada al portapapeles.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md overflow-hidden p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0E0D14] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] text-neutral-100 animate-in slide-in-from-bottom duration-200 overflow-hidden">
        {/* Receipt Header */}
        <div className="shrink-0 p-4 border-b border-[#221D33] flex items-center justify-between bg-[#0E0D14]/95 no-print">
          <span className="text-xs font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#8B5CF6]" /> Comprobante Oficial de Pago
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 touch-scroll">
          <div id="printable-receipt" className="p-5 bg-[#14121F] rounded-2xl border border-[#2D2545] text-neutral-200 space-y-4">
            <div className="text-center pb-3 border-b border-dashed border-[#2D2545]">
              <h3 className="text-lg font-black text-white tracking-wider">FINTECH</h3>
              <p className="text-[11px] text-neutral-400">NIT: 901.849.201-4 | Tu negocio, en control</p>
              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] text-xs font-mono font-bold">
                {r.paymentCode}
              </div>
            </div>

            {/* Details list */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Fecha y Hora:</span>
                <span className="font-medium text-white">{formatDate(r.paymentDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Cliente:</span>
                <span className="font-bold text-white text-right">{r.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Documento / Cédula:</span>
                <span className="font-mono text-neutral-300">{r.clientDocument}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Obligación / Préstamo:</span>
                <span className="font-medium text-[#A78BFA] text-right">{r.loanCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Método de Pago:</span>
                <span className="font-medium text-neutral-300">{r.paymentMethod}</span>
              </div>
              {r.notes && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Detalle / Nota:</span>
                  <span className="text-neutral-300 text-right">{r.notes}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#2D2545] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Distribución Capital:</span>
                  <span className="text-neutral-200">{formatCOP(r.capitalPaid)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Distribución Intereses:</span>
                  <span className="text-neutral-200">{formatCOP(r.interestPaid)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-[#2D2545]">
                  <span className="font-bold text-white">VALOR PAGADO:</span>
                  <span className="font-black text-white text-base">{formatCOP(r.amountPaid)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1B1226] border border-[#8B5CF6]/30 flex justify-between items-center mt-3">
                <span className="text-[11px] text-neutral-300 font-semibold">Saldo Restante:</span>
                <span className="text-sm font-extrabold text-[#A78BFA]">{formatCOP(r.newLoanBalance)}</span>
              </div>
            </div>

            <p className="text-center text-[10px] text-neutral-400 pt-2 border-t border-dashed border-[#2D2545]">
              Comprobante expedido por FINTECH. ¡Gracias por su puntualidad!
            </p>
          </div>
        </div>

        {/* Action buttons footer */}
        <div className="shrink-0 p-4 border-t border-[#221D33] bg-[#0E0D14]/98 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-2 no-print">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[#128C7E] hover:bg-[#075E54] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[#181622] hover:bg-[#252038] text-white text-xs font-semibold border border-[#2D2545] transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#8B5CF6]" />
            <span>Compartir</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white text-xs font-bold shadow-md shadow-red-950/60 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
