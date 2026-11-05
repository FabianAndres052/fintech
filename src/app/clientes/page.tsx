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
} from 'lucide-react';
import { Client } from '@/lib/types';
import { formatCOP, formatDate, getLoanLabel } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportUtils';
import NewLoanModal from '@/components/NewLoanModal';
import PaymentModal from '@/components/PaymentModal';

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

      // Obtener saldo de caja
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
      Documento: `${c.document_type} ${c.document_number}`,
      Nombres: c.first_name,
      Apellidos: c.last_name,
      Teléfono: c.phone,
      Dirección: c.address,
      Ciudad: c.city || 'Colombia',
      Ocupación: c.occupation || 'N/A',
      Préstamos_Activos: c.active_loans_count || 0,
      Saldo_Pendiente: c.current_balance || 0,
      Estado: c.status,
    }));
    exportToExcel(exportData, 'Clientes_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-black text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <Header
          title="Gestión de Clientes"
          subtitle="Directorio general, historial crediticio y saldos pendientes"
          availableCash={availableCash}
          onNewLoan={() => setIsNewLoanOpen(true)}
          onNewPayment={() => setIsPaymentOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {['TODOS', 'ACTIVO', 'BLOQUEADO', 'INACTIVO'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-red-700 text-white font-bold shadow-md shadow-red-950/50'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cédula, nombre o teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
              </div>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-md shadow-red-950/50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Nuevo Cliente</span>
              </button>
            </div>
          </div>

          {/* Table / List */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4">Préstamos Activos</th>
                    <th className="py-3 px-4">Saldo Pendiente</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {clients.filter((c) => (statusFilter === 'TODOS' ? true : c.status === statusFilter)).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        {loading ? 'Cargando clientes...' : 'No se encontraron clientes registrados en este filtro.'}
                      </td>
                    </tr>
                  ) : (
                    clients
                      .filter((c) => (statusFilter === 'TODOS' ? true : c.status === statusFilter))
                      .map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {c.first_name ? c.first_name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <p className="font-bold text-white">
                                {c.first_name} {c.last_name || ''}
                              </p>
                              {c.address ? (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.address}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {c.document_number ? (
                            <>
                              <span className="text-[10px] text-slate-400 mr-1">{c.document_type || 'CC'}</span>
                              {c.document_number}
                            </>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Sin documento</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 space-y-0.5">
                          {c.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{c.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Sin teléfono</span>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[140px]">{c.email}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">
                          {c.active_loans_count || 0}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          {formatCOP(c.current_balance || 0)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'ACTIVO'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : c.status === 'BLOQUEADO'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(c.active_loans_count || 0) > 0 && (
                              <button
                                onClick={() => handleOpenDetail(c.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-emerald-500/20"
                                title="Ver créditos individuales y abonar"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Abonar</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenDetail(c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Ver Perfil e Historial Crediticio"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {c.status !== 'BLOQUEADO' && (
                              <button
                                onClick={() => handleLoanForClient(c.id)}
                                className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                title="Nuevo Préstamo para este cliente"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar cliente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeactivate(c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Inactivar cliente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />

      {/* Modal Crear / Editar Cliente */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-neutral-100">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-700/40 flex items-center justify-center text-red-400 font-bold shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {editingClient ? 'Editar Información de Cliente' : 'Registrar Nuevo Cliente'}
                  </h3>
                  <p className="text-xs text-neutral-400">Datos personales y de contacto</p>
                </div>
              </div>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClient} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Tipo Doc.</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="NIT">NIT</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Número de Cédula / Documento (Opcional)</label>
                  <input
                    type="text"
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    placeholder="Ej: 1020304050 (opcional)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nombre Completo o Razón Social <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Ej: Carlos Rueda o Kike"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Apellidos (Opcional)</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Ej: Gómez (opcional)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Teléfono / WhatsApp (Opcional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ej: 300 123 4567 (opcional)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@correo.com (opcional)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Dirección Residencial (Opcional)</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej: Calle 45 # 12-34 (opcional)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Notas de Referencia</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ej: Recomendado por Carlos / Negocio propio"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Estado del Cliente</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVO">ACTIVO (Habilitado para créditos)</option>
                    <option value="BLOQUEADO">BLOQUEADO (Sin nuevos créditos)</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-md shadow-red-950/50 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Cliente con Historial de Préstamos y Pagos */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-neutral-100">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-black/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-700/40 flex items-center justify-center text-red-400 font-bold shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>
                      {selectedClientDetail?.client?.first_name} {selectedClientDetail?.client?.last_name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        selectedClientDetail?.client?.status === 'ACTIVO'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : selectedClientDetail?.client?.status === 'BLOQUEADO'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {selectedClientDetail?.client?.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedClientDetail?.client?.document_type} {selectedClientDetail?.client?.document_number} · Tel: {selectedClientDetail?.client?.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Cargando perfil e historial...</div>
            ) : selectedClientDetail?.client ? (
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Datos de contacto */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Dirección</span>
                    <p className="font-semibold text-white">{selectedClientDetail.client.address || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Ciudad</span>
                    <p className="font-semibold text-white">{selectedClientDetail.client.city || 'Colombia'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Correo</span>
                    <p className="font-semibold text-slate-300">{selectedClientDetail.client.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Notas / Ref.</span>
                    <p className="font-semibold text-slate-300">{selectedClientDetail.client.notes || 'Ninguna'}</p>
                  </div>
                </div>

                {/* Historial de Préstamos Separados */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Créditos Independientes del Cliente ({selectedClientDetail.loans?.length || 0})</span>
                    <span className="text-[11px] text-emerald-400 font-normal">
                      Cada crédito maneja su propio saldo, historial y abonos separados
                    </span>
                  </h4>
                  <div className="rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Obligación / Detalle</th>
                          <th className="py-2.5 px-3">Capital</th>
                          <th className="py-2.5 px-3">Total Pactado</th>
                          <th className="py-2.5 px-3">Saldo Pendiente</th>
                          <th className="py-2.5 px-3">Modalidad</th>
                          <th className="py-2.5 px-3">Estado</th>
                          <th className="py-2.5 px-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {!selectedClientDetail.loans || selectedClientDetail.loans.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-slate-500">
                              Este cliente no tiene préstamos registrados.
                            </td>
                          </tr>
                        ) : (
                          selectedClientDetail.loans.map((l: any) => (
                            <tr key={l.id} className="hover:bg-slate-900/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{l.loan_code}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-white block">{getLoanLabel(l)}</span>
                                <span className="text-[10px] text-slate-400">Desembolso: {formatDate(l.disbursement_date)}</span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white">{formatCOP(l.capital_amount)}</td>
                              <td className="py-2.5 px-3 text-slate-300">{formatCOP(l.total_amount)}</td>
                              <td className="py-2.5 px-3 font-bold text-emerald-400">{formatCOP(l.balance_remaining)}</td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {l.installments_count > 0 ? `${l.installments_count} cuotas (${l.periodicity})` : 'Abonos Libres'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    l.status === 'ACTIVO'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : l.status === 'COMPLETADO'
                                      ? 'bg-teal-500/20 text-teal-300'
                                      : l.status === 'EN_MORA'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {l.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {(l.status === 'ACTIVO' || l.status === 'EN_MORA') ? (
                                  <button
                                    onClick={() => {
                                      setSelectedLoanIdForPayment(l.id);
                                      setIsPaymentOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                                    title={`Abonar exclusivamente a ${l.loan_code}`}
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Abonar a este Crédito</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-500 font-semibold">Liquidado</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Historial de Pagos */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5">
                    Historial de Pagos y Recaudos ({selectedClientDetail.payments?.length || 0})
                  </h4>
                  <div className="rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Recibo</th>
                          <th className="py-2 px-3">Préstamo</th>
                          <th className="py-2 px-3">Monto Pagado</th>
                          <th className="py-2 px-3">Capital Amortizado</th>
                          <th className="py-2 px-3">Interés Cobrado</th>
                          <th className="py-2 px-3">Medio</th>
                          <th className="py-2 px-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {!selectedClientDetail.payments || selectedClientDetail.payments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-500">
                              No hay pagos registrados para este cliente.
                            </td>
                          </tr>
                        ) : (
                          selectedClientDetail.payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-900/80">
                              <td className="py-2 px-3 font-mono font-bold text-emerald-400">{p.payment_code}</td>
                              <td className="py-2 px-3 font-mono text-slate-300">{p.loan_code}</td>
                              <td className="py-2 px-3 font-bold text-white">{formatCOP(p.amount_paid)}</td>
                              <td className="py-2 px-3 text-indigo-300">{formatCOP(p.capital_paid)}</td>
                              <td className="py-2 px-3 text-emerald-400">{formatCOP(p.interest_paid)}</td>
                              <td className="py-2 px-3 text-slate-400">{p.payment_method}</td>
                              <td className="py-2 px-3 text-slate-400">{formatDate(p.payment_date)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer modal acciones */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>

                  {selectedClientDetail.client.status !== 'BLOQUEADO' && (
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleLoanForClient(selectedClientDetail.client.id);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-950/50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Nuevo Préstamo para este Cliente</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
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
    </div>
  );
}
