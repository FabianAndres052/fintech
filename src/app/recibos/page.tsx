'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import PaymentModal from '@/components/PaymentModal';
import {
  FileText,
  Search,
  Filter,
  Download,
  MessageCircle,
  Layers,
  CheckCircle2,
  Clock,
  User,
  PlusCircle,
  Eye,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Printer,
  Sparkles,
  DollarSign,
  Receipt,
  X,
} from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/calculations';

export default function RecibosPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'CONSOLIDADO'>('ALL');
  const [whatsappFilter, setWhatsappFilter] = useState<'ALL' | 'SENT' | 'PENDING'>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modales
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConsolidateModalOpen, setIsConsolidateModalOpen] = useState(false);

  // Estados modal consolidado
  const [selectedConsolidateClient, setSelectedConsolidateClient] = useState<string>('1');
  const [clientPayments, setClientPayments] = useState<any[]>([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);
  const [consolidating, setConsolidating] = useState(false);
  const [consolidateError, setConsolidateError] = useState<string | null>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      let url = '/api/receipts?limit=150';
      if (clientFilter !== 'ALL') url += `&clientId=${clientFilter}`;
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
      if (dateFilter) url += `&date=${dateFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReceipts(data.receipts);
      }

      const clientRes = await fetch('/api/clients');
      const clientData = await clientRes.json();
      if (clientData.success) {
        setClients(clientData.clients);
      }
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [typeFilter, clientFilter, dateFilter]);

  // Cargar pagos del cliente para consolidación
  useEffect(() => {
    if (isConsolidateModalOpen && selectedConsolidateClient) {
      fetch(`/api/payments?clientId=${selectedConsolidateClient}&limit=30`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setClientPayments(d.payments || []);
            // Pre-seleccionar los primeros pagos si existen
            const pIds = (d.payments || []).slice(0, 3).map((p: any) => p.id);
            setSelectedPaymentIds(pIds);
          }
        })
        .catch(console.error);
    }
  }, [isConsolidateModalOpen, selectedConsolidateClient]);

  // Manejador para crear recibo consolidado
  const handleCreateConsolidated = async () => {
    if (selectedPaymentIds.length < 2) {
      setConsolidateError('Seleccione al menos 2 pagos para generar un recibo consolidado.');
      return;
    }
    setConsolidating(true);
    setConsolidateError(null);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Number(selectedConsolidateClient),
          payment_ids: selectedPaymentIds,
          notes: 'Recibo consolidado generado desde el módulo de Recibos',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar recibo consolidado');

      setIsConsolidateModalOpen(false);
      await fetchReceipts();
      setSelectedReceipt(data.receipt);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      setConsolidateError(err.message);
    } finally {
      setConsolidating(false);
    }
  };

  // Filtrado en memoria por texto de búsqueda y estado WhatsApp
  const filteredReceipts = receipts.filter((r) => {
    if (whatsappFilter === 'SENT' && !r.whatsapp_sent) return false;
    if (whatsappFilter === 'PENDING' && r.whatsapp_sent) return false;

    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.receipt_code?.toLowerCase().includes(term) ||
      r.client_name?.toLowerCase().includes(term) ||
      r.client_document?.toLowerCase().includes(term) ||
      r.notes?.toLowerCase().includes(term) ||
      (Array.isArray(r.items) && r.items.some((it) => it.loanCode?.toLowerCase().includes(term)))
    );
  });

  // Métricas
  const totalAmountSum = filteredReceipts.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
  const totalConsolidatedCount = filteredReceipts.filter((r) => r.is_consolidated || r.receipt_type === 'CONSOLIDADO').length;
  const totalSentWhatsApp = filteredReceipts.filter((r) => Boolean(r.whatsapp_sent)).length;

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Recibos"
          subtitle="Comprobantes oficiales y tickets en imagen PNG"
          onNewPayment={() => setIsPaymentModalOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 pt-6">
          {/* Top Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-[#E5092F]/10 text-[#E5092F] border border-[#E5092F]/20">
                  <Receipt className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Recibos & Comprobantes
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] font-mono">
                      PNG • WhatsApp
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400">
                    Historial de comprobantes oficiales con tickets descargables en formato imagen y envío directo a WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConsolidateModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#1A1828] hover:bg-[#252238] border border-[#3B3258] text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <Layers className="w-4 h-4 text-[#A78BFA]" />
                <span>Generar Consolidado</span>
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white text-xs font-bold shadow-lg shadow-red-950/50 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Pago</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Recibos */}
            <div className="p-4 rounded-3xl bg-[#12111D] border border-[#262038] space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Total Recibos</span>
                <FileText className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {filteredReceipts.length}
              </p>
              <p className="text-[10px] text-neutral-400">Comprobantes en base de datos</p>
            </div>

            {/* Total Recaudado */}
            <div className="p-4 rounded-3xl bg-[#12111D] border border-[#262038] space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Total Recaudado</span>
                <DollarSign className="w-4 h-4 text-[#E5092F]" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-[#E5092F]">
                {formatCOP(totalAmountSum)}
              </p>
              <p className="text-[10px] text-neutral-400">Valor respaldado con tickets</p>
            </div>

            {/* Consolidados */}
            <div className="p-4 rounded-3xl bg-[#12111D] border border-[#262038] space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Consolidados</span>
                <Layers className="w-4 h-4 text-[#A78BFA]" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-[#A78BFA]">
                {totalConsolidatedCount}
              </p>
              <p className="text-[10px] text-neutral-400">Pagos múltiples agrupados</p>
            </div>

            {/* Enviados WhatsApp */}
            <div className="p-4 rounded-3xl bg-[#12111D] border border-[#262038] space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>WhatsApp Enviados</span>
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">
                {totalSentWhatsApp} <span className="text-xs text-neutral-400 font-normal">/ {filteredReceipts.length}</span>
              </p>
              <p className="text-[10px] text-neutral-400">Confirmados por administradora</p>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="p-4 rounded-3xl bg-[#12111D] border border-[#262038] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Buscador de texto */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, recibo, crédito o cédula..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#181626] border border-[#2D2545] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />
              </div>

              {/* Filtro por Cliente */}
              <div>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full bg-[#181626] border border-[#2D2545] rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                >
                  <option value="ALL">Todos los Clientes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Tipo */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full bg-[#181626] border border-[#2D2545] rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                >
                  <option value="ALL">Tipo: Todos</option>
                  <option value="INDIVIDUAL">Solo Individuales</option>
                  <option value="CONSOLIDADO">Solo Consolidados</option>
                </select>
              </div>

              {/* Filtro por Estado WhatsApp */}
              <div>
                <select
                  value={whatsappFilter}
                  onChange={(e) => setWhatsappFilter(e.target.value as any)}
                  className="w-full bg-[#181626] border border-[#2D2545] rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                >
                  <option value="ALL">WhatsApp: Todos</option>
                  <option value="SENT">Enviados por WhatsApp</option>
                  <option value="PENDING">Pendientes de Envío</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Recibos */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto" />
                <p className="text-xs text-neutral-400 font-medium">Cargando comprobantes oficiales...</p>
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#12111D] border border-[#262038] rounded-3xl p-8">
                <FileText className="w-12 h-12 text-neutral-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No se encontraron recibos</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  No hay comprobantes que coincidan con los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReceipts.map((r) => {
                  const isConsolidated = Boolean(r.is_consolidated || r.receipt_type === 'CONSOLIDADO');
                  const items = Array.isArray(r.items) ? r.items : [];
                  const totalAmt = Number(r.total_amount || 0);

                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-3xl bg-[#12111E] border border-[#262038] hover:border-[#8B5CF6]/50 transition-all space-y-4 flex flex-col justify-between group shadow-lg"
                    >
                      {/* Header de la tarjeta */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-[#1B182B] border border-[#3A3156] text-[#A78BFA]">
                            {r.receipt_code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isConsolidated
                                ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA]'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {isConsolidated ? `Consolidado (${items.length})` : 'Individual'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-[#A78BFA] transition-colors">
                            {r.client_name}
                          </h4>
                          <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-[#8B5CF6]" />
                            {formatDate(r.receipt_date || r.created_at || '')}
                          </p>
                        </div>

                        {/* Desglose rápido de créditos incluidos */}
                        <div className="p-3 rounded-2xl bg-[#181626] border border-[#231E33] space-y-1.5 text-xs">
                          {items.slice(0, 3).map((it, idx) => {
                            const noteMatch = it.notes ? it.notes.match(/cuota\s*#?\s*(\d+)/i) : null;
                            const instNum = it.installmentNumber ?? it.installment_number ?? (noteMatch ? noteMatch[1] : null);

                            return (
                              <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span className="text-neutral-300 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5092F]" />
                                  {it.loanCode}
                                  {!it.isFreeDebt && instNum && (
                                    <span className="text-[#A78BFA] font-bold text-[10px]">
                                      (Cuota #{instNum})
                                    </span>
                                  )}
                                </span>
                                <span className="font-bold text-white">{formatCOP(it.amountPaid)}</span>
                              </div>
                            );
                          })}
                          {items.length > 3 && (
                            <p className="text-[10px] text-[#A78BFA] italic text-right">
                              +{items.length - 3} créditos más...
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer de la tarjeta con Total y Acciones */}
                      <div className="space-y-3 pt-2 border-t border-[#231E33]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-400 font-medium">Total Recibido:</span>
                          <span className="text-base font-black text-white">{formatCOP(totalAmt)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-400">Estado WhatsApp:</span>
                          {r.whatsapp_sent ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-400">
                              <Clock className="w-3.5 h-3.5" /> Pendiente
                            </span>
                          )}
                        </div>

                        {/* Botones de acción rápida */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              setSelectedReceipt(r);
                              setIsReceiptModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#1F1C30] hover:bg-[#2B2742] text-white text-xs font-bold border border-[#3A3258] transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#A78BFA]" />
                            <span>Ver Ticket</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedReceipt(r);
                              setIsReceiptModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/40"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />

      {/* Modal Visor del Ticket / Comprobante (PNG + WhatsApp + PDF) */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
        onReceiptUpdated={fetchReceipts}
      />

      {/* Modal Registrar Pago */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          fetchReceipts();
        }}
      />

      {/* Modal para Crear Recibo Consolidado */}
      {isConsolidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#0E0D16] border border-[#2D2545] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-neutral-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#231E33]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Generar Recibo Consolidado</h3>
                  <p className="text-[11px] text-neutral-400">
                    Agrupa varios pagos en un único comprobante sin alterar saldos en la base de datos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConsolidateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {consolidateError && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{consolidateError}</span>
              </div>
            )}

            {/* Selección de Cliente */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Cliente a Consolidar</label>
              <select
                value={selectedConsolidateClient}
                onChange={(e) => setSelectedConsolidateClient(e.target.value)}
                className="w-full bg-[#181626] border border-[#2D2545] rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.document_number})
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Pagos Registrados del Cliente */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span>Seleccionar Pagos ({selectedPaymentIds.length} seleccionados)</span>
                <span className="text-[10px] text-neutral-400">Marque mínimo 2</span>
              </label>

              {clientPayments.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">
                  No hay pagos registrados para este cliente.
                </p>
              ) : (
                clientPayments.map((p) => {
                  const isChecked = selectedPaymentIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                        isChecked
                          ? 'bg-[#1D1830] border-[#8B5CF6] text-white shadow-md'
                          : 'bg-[#141222] border-[#262038] text-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPaymentIds([...selectedPaymentIds, p.id]);
                            } else {
                              setSelectedPaymentIds(selectedPaymentIds.filter((id) => id !== p.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-[#8B5CF6] accent-[#8B5CF6] cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            {p.loan_code}
                            <span className="font-mono text-[10px] text-[#A78BFA]">({p.payment_code})</span>
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {formatDate(p.payment_date || p.created_at)}
                            {p.installment_number && ` • Cuota #${p.installment_number}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-extrabold text-white text-sm">{formatCOP(p.amount_paid)}</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer con Total y Botón Generar */}
            <div className="pt-3 border-t border-[#231E33] space-y-3">
              <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-[#141222] border border-[#262038]">
                <span className="text-neutral-400">Total Consolidado:</span>
                <span className="text-base font-black text-white">
                  {formatCOP(
                    clientPayments
                      .filter((p) => selectedPaymentIds.includes(p.id))
                      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
                  )}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsConsolidateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateConsolidated}
                  disabled={consolidating || selectedPaymentIds.length < 2}
                  className="flex-2 py-2.5 rounded-2xl bg-gradient-to-r from-[#E5092F] to-[#8B5CF6] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-purple-950/50 disabled:opacity-50 cursor-pointer"
                >
                  {consolidating ? 'Generando Recibo...' : 'Crear Recibo Consolidado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

