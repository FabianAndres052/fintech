'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Eye,
  PlusCircle,
  Receipt,
  ChevronRight,
  Filter,
  Wallet,
} from 'lucide-react';
import { Client } from '@/lib/types';
import { formatCOP, formatDate, getLoanLabel } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportUtils';
import NewLoanModal from '@/components/NewLoanModal';
import PaymentModal from '@/components/PaymentModal';
import ReceiptModal from '@/components/ReceiptModal';
import Link from 'next/link';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availableCash, setAvailableCash] = useState(0);

  // Modales
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [selectedClientIdForLoan, setSelectedClientIdForLoan] = useState<number | undefined>(undefined);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedLoanIdForPayment, setSelectedLoanIdForPayment] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Modal de Detalle de Cliente con Historial
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClientDetail, setSelectedClientDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const handleOpenReceiptTicket = async (p: any) => {
    try {
      const res = await fetch(`/api/receipts?code=${encodeURIComponent(p.payment_code)}`);
      const data = await res.json();
      if (data.success && data.receipts?.length > 0) {
        setSelectedReceipt(data.receipts[0]);
        setIsReceiptOpen(true);
        return;
      }
    } catch {}
    setSelectedReceipt({
      paymentCode: p.payment_code,
      clientName: selectedClientDetail?.client
        ? `${selectedClientDetail.client.first_name} ${selectedClientDetail.client.last_name}`
        : 'Cliente',
      clientDocument: selectedClientDetail?.client?.document_number || 'N/A',
      clientPhone: selectedClientDetail?.client?.phone || '+57 300 123 4561',
      loanCode: p.loan_code,
      amountPaid: p.amount_paid,
      capitalPaid: p.capital_paid,
      interestPaid: p.interest_paid,
      paymentMethod: p.payment_method,
      paymentDate: p.payment_date,
      notes: p.notes,
    });
    setIsReceiptOpen(true);
  };

  // Formulario cliente
  const [formData, setFormData] = useState({
    document_type: 'CC',
    document_number: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Colombia',
    occupation: '',
    monthly_income: '',
    notes: '',
    status: 'ACTIVO',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
      }

      const dashRes = await fetch('/api/dashboard');
      const dashData = await dashRes.json();
      if (dashData.success) {
        setAvailableCash(dashData.stats.available_cash);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormData({
      document_type: 'CC',
      document_number: '',
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      address: '',
      city: 'Colombia',
      occupation: '',
      monthly_income: '',
      notes: '',
      status: 'ACTIVO',
    });
    setFormError(null);
    setIsClientModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      document_type: client.document_type || 'CC',
      document_number: client.document_number || '',
      first_name: client.first_name,
      last_name: client.last_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || 'Colombia',
      occupation: client.occupation || '',
      monthly_income: client.monthly_income ? String(client.monthly_income) : '',
      notes: client.notes || '',
      status: client.status || 'ACTIVO',
    });
    setFormError(null);
    setIsClientModalOpen(true);
  };

  const handleOpenDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedClientDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLoanForClient = (clientId: number) => {
    setSelectedClientIdForLoan(clientId);
    setIsNewLoanOpen(true);
  };

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar cliente.');
      }

      setIsClientModalOpen(false);
      fetchClients();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('¿Está seguro de que desea inactivar este cliente?')) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al inactivar');
      fetchClients();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportExcel = () => {
    const exportData = clients.map((c) => ({
      ID: c.id,
      Documento: `${c.document_type || 'CC'} ${c.document_number || 'N/A'}`,
      Nombres: c.first_name,
      Apellidos: c.last_name || '',
      Teléfono: c.phone || 'N/A',
      Dirección: c.address || 'N/A',
      Ciudad: c.city || 'Colombia',
      Préstamos_Activos: c.active_loans_count || 0,
      Saldo_Pendiente: c.current_balance || 0,
      Estado: c.status,
    }));
    exportToExcel(exportData, 'Clientes_FINTECH');
  };

  // Obtener iniciales para el avatar
  const getInitials = (firstName: string, lastName?: string | null) => {
    const f = firstName?.trim() ? firstName.trim()[0] : 'C';
    const l = lastName?.trim() ? lastName.trim()[0] : (firstName?.trim().split(' ')[1]?.[0] || '');
    return `${f}${l}`.toUpperCase();
  };

  const filteredClients = clients.filter((c) =>
    statusFilter === 'TODOS' ? true : c.status === statusFilter
  );

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Clientes"
          subtitle="Directorio de clientes y cartera por prestatario"
          availableCash={availableCash}
          onNewLoan={() => setIsNewLoanOpen(true)}
          onNewPayment={() => setIsPaymentOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Action & Search Bar (Exacto al Mockup: Buscador + Filtros) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Buscador grande con icono */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6] transition-colors"
              />
            </div>

            {/* Filtros de estado */}
            <div className="flex items-center gap-2 overflow-x-auto touch-scroll pb-1 sm:pb-0">
              {['TODOS', 'ACTIVO', 'BLOQUEADO'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-gradient-to-r from-[#E5092F] to-[#C40726] text-white shadow-md shadow-red-950/50'
                      : 'bg-[#14121F] text-neutral-400 hover:text-white border border-[#2D2545]'
                  }`}
                >
                  {st}
                </button>
              ))}

              <button
                onClick={handleExportExcel}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-[#14121F] hover:bg-[#1A1828] text-neutral-300 border border-[#2D2545] transition-colors"
                title="Exportar a Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/60 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Nuevo Cliente</span>
              </button>
            </div>
          </div>

          {/* VISTA DE TARJETAS MÓVILES (Exacto al Mockup Screen 3: Clientes) */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-xs text-neutral-400">Cargando directorio de clientes...</div>
            ) : filteredClients.length === 0 ? (
              <div className="p-12 text-center bg-[#121118] rounded-3xl border border-[#2D2545]">
                <Users className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">No se encontraron clientes</p>
                <p className="text-xs text-neutral-400 mt-1">Crea un nuevo cliente o ajusta el filtro de búsqueda.</p>
              </div>
            ) : (
              filteredClients.map((c, index) => {
                const initials = getInitials(c.first_name, c.last_name);
                // Colores degradados alternados para el avatar como en el mockup
                const avatarGradients = [
                  'from-[#8B5CF6] to-[#6D28D9]',
                  'from-[#3B82F6] to-[#1D4ED8]',
                  'from-[#10B981] to-[#047857]',
                  'from-[#EC4899] to-[#BE185D]',
                ];
                const grad = avatarGradients[index % avatarGradients.length];

                return (
                  <div
                    key={c.id}
                    onClick={() => handleOpenDetail(c.id)}
                    className="p-4 rounded-3xl bg-[#121118] hover:bg-[#181622] border border-[#2D2545] hover:border-[#8B5CF6]/40 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-md group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar Initials Pill */}
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${grad} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md`}
                      >
                        {initials}
                      </div>

                      {/* Client Info */}
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-[#A78BFA] transition-colors">
                            {c.first_name} {c.last_name || ''}
                          </h4>
                          {c.status !== 'ACTIVO' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {c.status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A78BFA] mt-0.5 truncate">
                          {c.active_loans_count ? `${c.active_loans_count} crédito(s) activo(s)` : 'Sin créditos activos'} · Saldo: <strong className="text-white font-bold">{formatCOP(c.current_balance || 0)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* TOTAL CLIENTES PILL (Como en el mockup) */}
          <div className="p-4 rounded-2xl bg-[#121118]/80 border border-[#2D2545] flex items-center justify-between text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8B5CF6]" />
              <span className="font-semibold">Total Clientes Registrados:</span>
            </div>
            <span className="font-black text-white text-sm px-3 py-1 rounded-xl bg-[#1C1A29] border border-[#8B5CF6]/30">
              {clients.length}
            </span>
          </div>
        </main>
      </div>

      <MobileNav />

      {/* MODAL CREAR / EDITAR CLIENTE (Con Scroll y Header/Footer Fijos) */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md overflow-hidden p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-[#0E0D14] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] text-neutral-100 animate-in slide-in-from-bottom duration-200 overflow-hidden">
            {/* Header Fijo */}
            <div className="shrink-0 px-5 py-4 border-b border-[#221D33] bg-[#0E0D14]/95 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-bold shadow-md shadow-purple-950/40">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Sólo el nombre es obligatorio</p>
                </div>
              </div>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario con Scroll Interno Suave */}
            <form onSubmit={handleSubmitClient} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 touch-scroll">
                {formError && (
                  <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Nombre Obligatorio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-200">
                    Nombre Completo o Razón Social <span className="text-[#E5092F] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Ej: Carlos Rueda o Kike"
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-3 text-sm font-semibold text-white focus:outline-none focus:border-[#8B5CF6]"
                    required
                  />
                </div>

                {/* Documento (Opcional) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Tipo Doc.</label>
                    <select
                      value={formData.document_type}
                      onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                      className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="NIT">NIT</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-neutral-300">Cédula / Documento (Opcional)</label>
                    <input
                      type="text"
                      value={formData.document_number}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                      placeholder="Ej: 1020304050"
                      className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                {/* Teléfono y Correo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Teléfono / WhatsApp (Opcional)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ej: 300 123 4567"
                      className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Correo (Opcional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="cliente@correo.com"
                      className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                {/* Dirección y Notas */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Dirección Residencial (Opcional)</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ej: Calle 45 # 12-34"
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Notas u Observación (Opcional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ej: Negocio propio / Recomendado"
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Footer Fijo */}
              <div className="shrink-0 p-4 border-t border-[#221D33] bg-[#0E0D14]/98 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-2xl text-xs font-semibold bg-[#181622] hover:bg-neutral-800 text-neutral-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3 px-5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/70 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE CLIENTE CON OBLIGACIONES SEPARADAS */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md overflow-hidden p-0 sm:p-4">
          <div className="w-full sm:max-w-4xl bg-[#0E0D14] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[90vh] text-neutral-100 animate-in slide-in-from-bottom duration-200 overflow-hidden">
            {/* Header Fijo */}
            <div className="shrink-0 px-5 py-4 border-b border-[#221D33] bg-[#0E0D14]/95 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white font-bold shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>
                      {selectedClientDetail?.client?.first_name} {selectedClientDetail?.client?.last_name || ''}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                      {selectedClientDetail?.client?.status}
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {selectedClientDetail?.client?.document_type} {selectedClientDetail?.client?.document_number || 'Sin C.C.'} · Tel: {selectedClientDetail?.client?.phone || 'Sin teléfono'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con Scroll Interno */}
            {detailLoading ? (
              <div className="p-12 text-center text-xs text-neutral-400">Cargando perfil e historial...</div>
            ) : selectedClientDetail?.client ? (
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5 touch-scroll">
                {/* Tarjetas de Información de Contacto */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#14121F] p-3.5 rounded-2xl border border-[#2D2545] text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Dirección</span>
                    <p className="font-semibold text-white truncate">{selectedClientDetail.client.address || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Ciudad</span>
                    <p className="font-semibold text-white">{selectedClientDetail.client.city || 'Colombia'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Teléfono</span>
                    <p className="font-semibold text-[#A78BFA]">{selectedClientDetail.client.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Notas</span>
                    <p className="font-semibold text-neutral-300 truncate">{selectedClientDetail.client.notes || 'Ninguna'}</p>
                  </div>
                </div>

                {/* Créditos Separados del Cliente */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Obligaciones y Créditos ({selectedClientDetail.loans?.length || 0})</span>
                    <span className="text-[11px] text-[#A78BFA] font-normal">
                      Abono independiente por cada crédito
                    </span>
                  </h4>

                  <div className="space-y-3">
                    {!selectedClientDetail.loans || selectedClientDetail.loans.length === 0 ? (
                      <div className="p-6 text-center text-xs text-neutral-400 bg-[#14121F] rounded-2xl border border-[#2D2545]">
                        Este cliente no tiene créditos registrados.
                      </div>
                    ) : (
                      selectedClientDetail.loans.map((l: any) => (
                        <div
                          key={l.id}
                          className="p-4 rounded-2xl bg-[#14121F] border border-[#2D2545] hover:border-[#8B5CF6]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#A78BFA] text-xs">{l.loan_code}</span>
                              <span className="font-bold text-white text-sm">{getLoanLabel(l)}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  l.status === 'ACTIVO'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : l.status === 'COMPLETADO'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}
                              >
                                {l.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400 mt-1.5">
                              <span>Capital: <strong className="text-neutral-200">{formatCOP(l.capital_amount)}</strong></span>
                              <span>Total: <strong className="text-neutral-200">{formatCOP(l.total_amount)}</strong></span>
                              <span>Desembolso: {formatDate(l.disbursement_date)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#221D33]">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-neutral-400 block">Saldo Pendiente</span>
                              <p className="text-base font-black text-white">{formatCOP(l.balance_remaining)}</p>
                            </div>

                            {(l.status === 'ACTIVO' || l.status === 'EN_MORA') && (
                              <button
                                onClick={() => {
                                  setSelectedLoanIdForPayment(l.id);
                                  setIsPaymentOpen(true);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-red-950/50 transition-all active:scale-95"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Abonar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Historial de Pagos y Abonos */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Historial de Abonos Recibidos ({selectedClientDetail.payments?.length || 0})
                    </h4>
                    {selectedClientDetail?.client?.id && (
                      <Link
                        href={`/recibos?clientId=${selectedClientDetail.client.id}`}
                        className="text-[11px] font-bold text-[#A78BFA] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <span>Ver en Módulo de Recibos</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="rounded-2xl border border-[#2D2545] overflow-hidden bg-[#14121F]">
                    <div className="overflow-x-auto touch-scroll">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#181622] text-neutral-400 border-b border-[#2D2545]">
                          <tr>
                            <th className="py-2.5 px-3">Recibo</th>
                            <th className="py-2.5 px-3">Obligación</th>
                            <th className="py-2.5 px-3">Valor Pagado</th>
                            <th className="py-2.5 px-3">Medio</th>
                            <th className="py-2.5 px-3">Fecha</th>
                            <th className="py-2.5 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#221D33]/60">
                          {!selectedClientDetail.payments || selectedClientDetail.payments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-neutral-500">
                                No hay abonos registrados para este cliente.
                              </td>
                            </tr>
                          ) : (
                            selectedClientDetail.payments.map((p: any) => (
                              <tr key={p.id} className="hover:bg-[#181622]/50">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#A78BFA]">{p.payment_code}</td>
                                <td className="py-2.5 px-3 text-neutral-300">{p.loan_code}</td>
                                <td className="py-2.5 px-3 font-bold text-white">{formatCOP(p.amount_paid)}</td>
                                <td className="py-2.5 px-3 text-neutral-400">{p.payment_method}</td>
                                <td className="py-2.5 px-3 text-neutral-400">{formatDate(p.payment_date)}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleOpenReceiptTicket(p)}
                                    className="px-2.5 py-1 rounded-lg bg-[#252238] hover:bg-[#342F50] text-[#A78BFA] hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                                  >
                                    Ver Ticket PNG
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Footer Fijo Modal */}
            <div className="shrink-0 p-4 border-t border-[#221D33] bg-[#0E0D14]/98 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              {selectedClientDetail?.client?.status !== 'BLOQUEADO' && (
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleLoanForClient(selectedClientDetail.client.id);
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#1C1A29] hover:bg-[#252238] border border-[#8B5CF6]/40 text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Nuevo Préstamo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Loan & Payment modals */}
      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => {
          setIsNewLoanOpen(false);
          setSelectedClientIdForLoan(undefined);
        }}
        onSuccess={fetchClients}
        availableCash={availableCash}
        defaultClientId={selectedClientIdForLoan}
      />
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedLoanIdForPayment(undefined);
        }}
        onSuccess={() => {
          fetchClients();
          if (selectedClientDetail?.client?.id) {
            handleOpenDetail(selectedClientDetail.client.id);
          }
        }}
        defaultLoanId={selectedLoanIdForPayment}
      />
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
      />
    </div>
  );
}
