'use client';

import { useState, useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  MessageCircle,
  Download,
  FileText,
  Clock,
  User,
  Phone,
  FileCheck,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/calculations';
import { toPng, toBlob } from 'html-to-image';
import jsPDF from 'jspdf';

export interface ReceiptItem {
  loanId: number;
  loanCode: string;
  installmentId?: number | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  remainingInstallments?: number | null;
  amountPaid: number;
  capitalPaid?: number;
  interestPaid?: number;
  remainingBalance: number;
  totalAccumulatedPaid?: number;
  dueDate?: string | null;
  isFreeDebt?: boolean;
  notes?: string | null;
}

export interface ReceiptData {
  id?: number;
  receipt_code?: string;
  paymentCode?: string;
  client_id?: number;
  client_name?: string;
  clientName?: string;
  client_document?: string;
  clientDocument?: string;
  client_phone?: string;
  clientPhone?: string;
  loan_code?: string;
  loanCode?: string;
  receipt_type?: 'INDIVIDUAL' | 'CONSOLIDADO';
  is_consolidated?: number | boolean;
  receipt_date?: string;
  paymentDate?: string;
  total_amount?: number;
  amountPaid?: number;
  capital_paid?: number;
  capitalPaid?: number;
  interest_paid?: number;
  interestPaid?: number;
  remaining_balance?: number;
  newLoanBalance?: number;
  payment_method?: string;
  paymentMethod?: string;
  notes?: string;
  whatsapp_sent?: number | boolean;
  whatsapp_sent_at?: string;
  created_at?: string;
  items?: ReceiptItem[];
  summary?: any;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt?: ReceiptData | null;
  data?: ReceiptData | null;
  onReceiptUpdated?: () => void;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  data,
  onReceiptUpdated,
}: ReceiptModalProps) {
  const r = receipt || data;
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState<boolean>(() => {
    return Boolean(r?.whatsapp_sent);
  });
  const [updatingSent, setUpdatingSent] = useState(false);

  if (!isOpen || !r) return null;

  // Normalizar campos para compatibilidad completa
  const code = r.receipt_code || r.paymentCode || 'REC-000000';
  const clientName = r.client_name || r.clientName || 'Cliente FINTECH';
  const clientDoc = r.client_document || r.clientDocument || 'N/A';
  const clientPhone = r.client_phone || r.clientPhone || '+57 300 123 4561';
  const payDate = r.receipt_date || r.paymentDate || new Date().toISOString();
  const totalAmount = Number(r.total_amount ?? r.amountPaid ?? 0);
  const payMethod = r.payment_method || r.paymentMethod || 'TRANSFERENCIA';
  const isConsolidated = Boolean(r.is_consolidated || r.receipt_type === 'CONSOLIDADO');

  // Normalizar lista de ítems
  let items: ReceiptItem[] = [];
  if (Array.isArray(r.items) && r.items.length > 0) {
    items = r.items;
  } else {
    items = [
      {
        loanId: 0,
        loanCode: r.loan_code || r.loanCode || 'PRE',
        installmentNumber: null,
        totalInstallments: null,
        remainingInstallments: null,
        amountPaid: totalAmount,
        capitalPaid: Number(r.capital_paid ?? r.capitalPaid ?? 0),
        interestPaid: Number(r.interest_paid ?? r.interestPaid ?? 0),
        remainingBalance: Number(r.remaining_balance ?? r.newLoanBalance ?? 0),
        notes: r.notes,
      },
    ];
  }

  // Resumen global
  const totalRemaining =
    r.summary?.totalBalanceRemaining ??
    (items.length === 1 ? items[0].remainingBalance : items.reduce((sum, it) => sum + (it.remainingBalance || 0), 0));

  const totalAccumulated =
    items.reduce((sum, it) => sum + (it.totalAccumulatedPaid || 0), 0) || totalAmount;

  // Generador de texto para WhatsApp
  const generateWhatsAppMessage = () => {
    let msg = `*COMPROBANTE DE RECAUDO — FINTECH*\n`;
    msg += `-------------------------------------------\n`;
    msg += `📄 *Recibo:* ${code}\n`;
    msg += `👤 *Cliente:* ${clientName}\n`;
    msg += `🪪 *Cédula:* ${clientDoc}\n`;
    msg += `📅 *Fecha:* ${formatDate(payDate)}\n`;
    msg += `💳 *Método:* ${payMethod}\n`;
    msg += `-------------------------------------------\n`;

    if (isConsolidated) {
      msg += `📋 *DETALLE DE CRÉDITOS CONSOLIDADOS:*\n\n`;
      items.forEach((it, idx) => {
        msg += `*${idx + 1}. Crédito:* ${it.loanCode}\n`;
        if (it.isFreeDebt) {
          msg += `   • Concepto: Abono libre a deuda congelada\n`;
        } else {
          msg += `   • Cuota pagada: #${it.installmentNumber || 'N/A'}${
            it.totalInstallments ? ` de ${it.totalInstallments}` : ''
          }\n`;
          if (it.remainingInstallments !== null && it.remainingInstallments !== undefined) {
            msg += `   • Cuotas pendientes: ${it.remainingInstallments}\n`;
          }
        }
        msg += `   • Valor pagado: ${formatCOP(it.amountPaid)}\n`;
        msg += `   • Saldo restante de este crédito: ${formatCOP(it.remainingBalance)}\n\n`;
      });
    } else {
      const it = items[0];
      msg += `📌 *Crédito:* ${it.loanCode}\n`;
      if (it.isFreeDebt) {
        msg += `   • Concepto: Abono libre a capital / deuda congelada\n`;
      } else {
        msg += `   • Cuota pagada: #${it.installmentNumber || 'N/A'}${
          it.totalInstallments ? ` de ${it.totalInstallments}` : ''
        }\n`;
        if (it.remainingInstallments !== null && it.remainingInstallments !== undefined) {
          msg += `   • Cuotas pendientes: ${it.remainingInstallments}\n`;
        }
      }
      msg += `   • Total acumulado abonado: ${formatCOP(it.totalAccumulatedPaid || totalAccumulated)}\n`;
      msg += `   • Saldo restante de este crédito: ${formatCOP(it.remainingBalance)}\n`;
    }

    msg += `-------------------------------------------\n`;
    msg += `💰 *TOTAL RECIBIDO:* ${formatCOP(totalAmount)}\n`;
    msg += `📉 *SALDO TOTAL PENDIENTE:* ${formatCOP(totalRemaining)}\n`;
    msg += `-------------------------------------------\n`;
    msg += `_¡Muchas gracias por su pago y puntualidad!_\n`;
    msg += `*FINTECH* — Tu negocio, en control`;

    return msg;
  };

  // Descargar imagen PNG nítida
  const handleDownloadPng = async () => {
    if (!ticketRef.current) return;
    setDownloadingPng(true);
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Calidad ultra alta para retina y teléfonos
        backgroundColor: '#0B0B12',
      });
      const link = document.createElement('a');
      link.download = `RECIBO_${code}_${clientName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('No se pudo generar la imagen PNG del recibo. Intente nuevamente.');
    } finally {
      setDownloadingPng(false);
    }
  };

  // Descargar PDF formal
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, isConsolidated ? 210 : 170],
      });

      // Fondo oscuro elegante
      doc.setFillColor(11, 11, 18);
      doc.rect(0, 0, 100, isConsolidated ? 210 : 170, 'F');

      // Header
      doc.setTextColor(229, 9, 47); // Rojo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('FINTECH', 50, 12, { align: 'center' });

      doc.setTextColor(167, 139, 250); // Lila
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('TU NEGOCIO, EN CONTROL', 50, 17, { align: 'center' });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(isConsolidated ? 'RECIBO CONSOLIDADO DE PAGO' : 'COMPROBANTE OFICIAL DE RECAUDO', 50, 23, {
        align: 'center',
      });

      // Línea divisoria
      doc.setDrawColor(45, 37, 69);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(10, 26, 90, 26);

      // Datos del recibo
      let y = 32;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 175);
      doc.text('N° de Recibo:', 10, y);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(code, 90, y, { align: 'right' });

      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 175);
      doc.text('Fecha y Hora:', 10, y);
      doc.setTextColor(255, 255, 255);
      doc.text(formatDate(payDate), 90, y, { align: 'right' });

      y += 5;
      doc.setTextColor(160, 160, 175);
      doc.text('Cliente:', 10, y);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(clientName, 90, y, { align: 'right' });

      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 175);
      doc.text('Documento / CC:', 10, y);
      doc.setTextColor(255, 255, 255);
      doc.text(clientDoc, 90, y, { align: 'right' });

      y += 5;
      doc.setTextColor(160, 160, 175);
      doc.text('Teléfono:', 10, y);
      doc.setTextColor(255, 255, 255);
      doc.text(clientPhone, 90, y, { align: 'right' });

      y += 5;
      doc.setTextColor(160, 160, 175);
      doc.text('Método:', 10, y);
      doc.setTextColor(255, 255, 255);
      doc.text(payMethod, 90, y, { align: 'right' });

      y += 4;
      doc.line(10, y, 90, y);
      y += 6;

      // Desglose de ítems
      doc.setFontSize(8);
      doc.setTextColor(167, 139, 250);
      doc.setFont('helvetica', 'bold');
      doc.text('DESGLOSE DE CRÉDITOS:', 10, y);
      y += 5;

      items.forEach((it) => {
        doc.setFillColor(22, 20, 35);
        doc.roundedRect(10, y, 80, 16, 2, 2, 'F');

        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(it.loanCode, 13, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 160, 175);
        const concept = it.isFreeDebt
          ? 'Abono libre a deuda'
          : `Cuota #${it.installmentNumber || 'N/A'}${it.totalInstallments ? ` de ${it.totalInstallments}` : ''} (${
              it.remainingInstallments ?? 0
            } rest.)`;
        doc.text(concept, 13, y + 9);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(229, 9, 47);
        doc.text(formatCOP(it.amountPaid), 87, y + 4.5, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 160, 175);
        doc.text(`Saldo: ${formatCOP(it.remainingBalance)}`, 87, y + 9, { align: 'right' });

        y += 19;
      });

      // Totales
      y += 2;
      doc.line(10, y, 90, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL RECIBIDO:', 10, y);
      doc.setTextColor(229, 9, 47);
      doc.setFontSize(11);
      doc.text(formatCOP(totalAmount), 90, y, { align: 'right' });

      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 175);
      doc.text('Saldo Total Pendiente:', 10, y);
      doc.setTextColor(167, 139, 250);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCOP(totalRemaining), 90, y, { align: 'right' });

      y += 10;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 140);
      doc.text('Comprobante oficial expedido por FINTECH', 50, y, { align: 'center' });
      y += 4;
      doc.text('¡Gracias por su puntualidad y confianza!', 50, y, { align: 'center' });

      doc.save(`RECIBO_${code}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Compartir por WhatsApp con imagen real si el dispositivo lo soporta
  const handleWhatsApp = async () => {
    setSharingWhatsApp(true);
    const msg = generateWhatsAppMessage();
    const phoneClean = (clientPhone || '').replace(/[^\d]/g, '');

    try {
      // Intentar Web Share con archivo PNG si el dispositivo lo permite
      if (ticketRef.current && navigator.canShare) {
        try {
          const blob = await toBlob(ticketRef.current, {
            cacheBust: true,
            pixelRatio: 2.5,
            backgroundColor: '#0B0B12',
          });
          if (blob) {
            const file = new File([blob], `Recibo_${code}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `Recibo de Pago ${code}`,
                text: msg,
              });
              setSharingWhatsApp(false);
              return;
            }
          }
        } catch (shareErr) {
          console.warn('WebShare with file fallback to standard URL:', shareErr);
        }
      }

      // Redirección directa a WhatsApp
      let waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      if (phoneClean && phoneClean.length >= 10) {
        waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`;
      }
      window.open(waUrl, '_blank');
    } finally {
      setSharingWhatsApp(false);
    }
  };

  // Marcar como enviado por WhatsApp en la BD (solo cuando la administradora confirma)
  const handleConfirmSent = async () => {
    if (!r.id) {
      setWhatsappSent(true);
      return;
    }
    setUpdatingSent(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: r.id, whatsapp_sent: !whatsappSent }),
      });
      if (res.ok) {
        setWhatsappSent(!whatsappSent);
        if (onReceiptUpdated) onReceiptUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingSent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/85 backdrop-blur-md overflow-hidden p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0B0B12] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[94dvh] sm:max-h-[90vh] text-neutral-100 animate-in slide-in-from-bottom duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-[#221D33] flex items-center justify-between bg-[#0B0B12]/95 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-purple-950/40">
              {isConsolidated ? <Layers className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                {isConsolidated ? 'Recibo Consolidado' : 'Comprobante de Pago'}
              </span>
              <p className="text-[10px] text-neutral-400">Verificado & Registrado en Sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 touch-scroll">
          {/* TICKET VISUAL - RENDERIZABLE A PNG */}
          <div
            ref={ticketRef}
            id="printable-receipt"
            className="p-5 sm:p-6 bg-[#0E0D16] rounded-3xl border border-[#2D2545] text-neutral-100 space-y-4 shadow-xl relative overflow-hidden"
            style={{ minWidth: '320px' }}
          >
            {/* Fondo con acento financiero sutil */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#8B5CF6]/15 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#E5092F]/10 via-transparent to-transparent pointer-events-none rounded-bl-3xl" />

            {/* Encabezado FINTECH */}
            <div className="text-center pb-3 border-b border-dashed border-[#2D2545] relative">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  FIN<span className="text-[#E5092F]">TECH</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] text-[9px] font-bold uppercase tracking-wider">
                  Oficial
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
                TU NEGOCIO, EN CONTROL
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181528] border border-[#3B3058] text-[#A78BFA] text-xs font-mono font-bold shadow-inner">
                <span>{code}</span>
              </div>
            </div>

            {/* Datos del Cliente y Fecha */}
            <div className="bg-[#141222] p-3.5 rounded-2xl border border-[#2D2545]/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8B5CF6]" /> Fecha & Hora:
                </span>
                <span className="font-semibold text-neutral-200">{formatDate(payDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#8B5CF6]" /> Cliente:
                </span>
                <span className="font-bold text-white text-right">{clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#8B5CF6]" /> Documento / CC:
                </span>
                <span className="font-mono text-neutral-300">{clientDoc}</span>
              </div>
              {clientPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#8B5CF6]" /> Teléfono:
                  </span>
                  <span className="font-mono text-neutral-300">{clientPhone}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-[#231E33]">
                <span className="text-neutral-400">Medio de Pago:</span>
                <span className="font-semibold text-[#A78BFA]">{payMethod}</span>
              </div>
            </div>

            {/* Desglose de Obligaciones / Cuotas Pagadas */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-[#A78BFA] uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-[#E5092F]" />
                  {isConsolidated ? `Créditos Consolidados (${items.length})` : 'Detalle de la Obligación'}
                </span>
                <span className="text-[10px] text-neutral-400">Desglose Individual</span>
              </div>

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#141222] border border-[#2D2545] space-y-1.5 text-xs relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-white text-[13px] tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E5092F]" />
                        {it.loanCode}
                      </span>
                      <span className="font-black text-white text-sm">
                        {formatCOP(it.amountPaid)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-neutral-400">
                      <span>Concepto:</span>
                      <span className="font-medium text-neutral-200">
                        {it.isFreeDebt
                          ? 'Abono libre a deuda congelada'
                          : `Cuota #${it.installmentNumber || '1'}${
                              it.totalInstallments ? ` de ${it.totalInstallments}` : ''
                            }`}
                      </span>
                    </div>

                    {!it.isFreeDebt && it.remainingInstallments !== null && (
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>Cuotas restantes:</span>
                        <span className="font-bold text-[#A78BFA]">
                          {it.remainingInstallments} {it.remainingInstallments === 1 ? 'cuota' : 'cuotas'}
                        </span>
                      </div>
                    )}

                    {it.dueDate && (
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>Fecha Vencimiento:</span>
                        <span className="text-neutral-300">{formatDate(it.dueDate)}</span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-[#231E33] flex justify-between text-[11px]">
                      <span className="text-neutral-400">Saldo restante crédito:</span>
                      <span className="font-bold text-neutral-200">{formatCOP(it.remainingBalance)}</span>
                    </div>

                    {it.totalAccumulatedPaid && it.totalAccumulatedPaid > 0 && (
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>Total abonado acumulado:</span>
                        <span className="text-neutral-300">{formatCOP(it.totalAccumulatedPaid)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gran Total y Saldo Global */}
            <div className="pt-2 border-t border-dashed border-[#2D2545] space-y-2">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1E1220] via-[#1F101A] to-[#141222] border border-[#E5092F]/40 flex justify-between items-center shadow-lg">
                <div>
                  <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider block">
                    TOTAL RECIBIDO
                  </span>
                  <span className="text-[10px] text-neutral-400">Valor cancelado en esta fecha</span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formatCOP(totalAmount)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#161224] border border-[#8B5CF6]/30 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wide block">
                    SALDO TOTAL PENDIENTE
                  </span>
                  <span className="text-[9px] text-neutral-400">Total acumulado de cartera</span>
                </div>
                <span className="text-base font-black text-[#A78BFA]">
                  {formatCOP(totalRemaining)}
                </span>
              </div>
            </div>

            {/* Sello de Seguridad y Pie de Página */}
            <div className="pt-3 border-t border-dashed border-[#2D2545] text-center space-y-1">
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
                <Check className="w-3 h-3" /> Transacción Verificada en Base de Datos
              </div>
              <p className="text-[10px] text-neutral-400 pt-1">
                FINTECH — Administración Financiera de Préstamos
              </p>
              <p className="text-[9px] text-neutral-400 italic">
                ¡Gracias por su confianza y puntualidad!
              </p>
            </div>
          </div>

          {/* Confirmación de Envío por WhatsApp */}
          <div className="mt-4 p-3 rounded-2xl bg-[#12111E] border border-[#2D2545] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  whatsappSent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {whatsappSent ? 'Enviado por WhatsApp' : 'Pendiente de Envío'}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {whatsappSent
                    ? 'Confirmado por la administradora'
                    : 'Marcar sólo cuando confirmes el envío'}
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirmSent}
              disabled={updatingSent}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                whatsappSent
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
              }`}
            >
              {updatingSent ? 'Guardando...' : whatsappSent ? 'Desmarcar' : 'Confirmar Envío'}
            </button>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-[#221D33] bg-[#0B0B12]/98 pb-[max(1rem,env(safe-area-inset-bottom))] grid grid-cols-3 gap-2 no-print">
          {/* Botón Descargar PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={downloadingPng}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl bg-[#1A1828] hover:bg-[#252238] active:scale-95 text-white border border-[#3B3258] transition-all cursor-pointer shadow-md"
            title="Descargar imagen PNG para guardar o compartir"
          >
            <Download className="w-4 h-4 text-[#A78BFA]" />
            <span className="text-[11px] font-bold">
              {downloadingPng ? 'Generando...' : 'Descargar PNG'}
            </span>
          </button>

          {/* Botón WhatsApp */}
          <button
            onClick={handleWhatsApp}
            disabled={sharingWhatsApp}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] hover:brightness-110 active:scale-95 text-white font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/60"
            title="Enviar recibo a WhatsApp del cliente"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-[11px]">
              {sharingWhatsApp ? 'Enviando...' : 'WhatsApp'}
            </span>
          </button>

          {/* Botón Descargar PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] active:scale-95 text-white font-bold transition-all cursor-pointer shadow-md shadow-red-950/60"
            title="Descargar documento PDF del recibo"
          >
            <FileText className="w-4 h-4" />
            <span className="text-[11px]">
              {downloadingPdf ? 'Creando...' : 'PDF'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
