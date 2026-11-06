'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Mail,
  User,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Lock,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Database,
  History,
  Shield,
} from 'lucide-react';
import { formatDate, formatCOP } from '@/lib/calculations';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import FintechLogo from '@/components/FintechLogo';

interface AdminAccount {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  is_active: number;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admin_mgmt' | 'audit' | 'overview'>('admin_mgmt');

  // Administradores
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [targetUsername, setTargetUsername] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetName, setTargetName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Auditoría
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchLog, setSearchLog] = useState('');
  const [filterAction, setFilterAction] = useState<string>('TODOS');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Mensajes de feedback
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar perfil actual y verificar privilegios SUPERADMIN
  const checkAccessAndLoad = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (!res.ok || !data.authenticated || data.admin?.role !== 'SUPERADMIN') {
        // Redirigir de inmediato si no es SUPERADMIN
        router.push('/');
        return;
      }

      setCurrentUser(data.admin);

      // Cargar lista de administradores
      const adminsRes = await fetch('/api/superadmin/admins');
      const adminsData = await adminsRes.json();
      if (adminsData.success && Array.isArray(adminsData.admins)) {
        setAdmins(adminsData.admins);
        // Seleccionar por defecto al primer administrador normal
        const normal = adminsData.admins.find((a: AdminAccount) => a.role === 'ADMIN') || adminsData.admins[0];
        if (normal) {
          setSelectedAdminId(normal.id);
          setTargetUsername(normal.username || '');
          setTargetEmail(normal.email || '');
          setTargetName(normal.name || '');
        }
      }

      // Cargar logs de auditoría
      fetchLogs();
    } catch (err: any) {
      console.error(err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const handleSelectAdmin = (admin: AdminAccount) => {
    setSelectedAdminId(admin.id);
    setTargetUsername(admin.username || '');
    setTargetEmail(admin.email || '');
    setTargetName(admin.name || '');
    setNewPassword('');
    setConfirmPassword('');
    setMessage(null);
    setError(null);
  };

  // Guardar cambios en el administrador normal
  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedAdminId) {
      setError('Selecciona un administrador.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setSavingAdmin(true);
    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAdminId: selectedAdminId,
          newName: targetName.trim(),
          newUsername: targetUsername.trim(),
          newEmail: targetEmail.trim(),
          newPassword: newPassword ? newPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar credenciales');

      setMessage('¡Credenciales del administrador actualizadas exitosamente por el Super Administrador!');
      setNewPassword('');
      setConfirmPassword('');
      // Recargar lista y logs
      const updated = await fetch('/api/superadmin/admins').then((r) => r.json());
      if (updated.success) setAdmins(updated.admins);
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAdmin(false);
    }
  };

  // Alternar estado activo / suspendido
  const handleToggleStatus = async (admin: AdminAccount) => {
    setMessage(null);
    setError(null);
    const newStatus = admin.is_active ? 0 : 1;

    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAdminId: admin.id,
          isActive: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado');

      setMessage(
        `Cuenta de ${admin.name} ${newStatus ? 'activada' : 'suspendida'} correctamente.`
      );
      const updated = await fetch('/api/superadmin/admins').then((r) => r.json());
      if (updated.success) setAdmins(updated.admins);
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filtrado de auditoría
  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'TODOS' && log.action !== filterAction) return false;
    if (!searchLog.trim()) return true;
    const q = searchLog.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.entity || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.ip_address || '').toLowerCase().includes(q) ||
      (log.admin_name || '').toLowerCase().includes(q) ||
      (log.admin_email || '').toLowerCase().includes(q)
    );
  });

  // Exportar auditoría a Excel
  const handleExportAuditExcel = () => {
    const rows = filteredLogs.map((l) => ({
      ID: l.id,
      Fecha: new Date(l.created_at).toLocaleString('es-CO'),
      Acción: l.action,
      Entidad: l.entity,
      ID_Entidad: l.entity_id || '',
      Usuario: l.admin_name || l.user_id || 'Sistema',
      Correo: l.admin_email || '',
      Dirección_IP: l.ip_address || '',
      Detalles: l.details || '',
    }));
    exportToExcel(rows, 'Auditoria_General_FINTECH');
  };

  // Exportar auditoría a PDF
  const handleExportAuditPDF = () => {
    const cols = [
      { header: 'Fecha y Hora', dataKey: 'fecha' },
      { header: 'Acción', dataKey: 'accion' },
      { header: 'Entidad', dataKey: 'entidad' },
      { header: 'Usuario / Actor', dataKey: 'usuario' },
      { header: 'IP', dataKey: 'ip' },
      { header: 'Detalles', dataKey: 'detalles' },
    ];
    const rows = filteredLogs.map((l) => ({
      fecha: new Date(l.created_at).toLocaleString('es-CO'),
      accion: l.action,
      entidad: l.entity,
      usuario: l.admin_name || `ID ${l.user_id || 'Sys'}`,
      ip: l.ip_address || '127.0.0.1',
      detalles: (l.details || '').substring(0, 60),
    }));
    exportToPDF(cols, rows, 'Informe Maestro de Auditoría del Sistema', 'Auditoria_FINTECH');
  };

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId);

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100 selection:bg-[#E5092F] selection:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Super Administrador"
          subtitle="Consola maestra de control, gestión de credenciales y auditoría integral"
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Hero Banner Exclusivo del Super Administrador */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C0F24] via-[#14101F] to-[#250914] border border-[#8B5CF6]/40 p-6 sm:p-7 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#E5092F]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#E5092F]/20 to-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-xs font-bold text-white shadow-sm">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#E5092F]" />
                    <span>Panel de Control Maestro</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-[10px] text-purple-300 font-semibold">
                    Usuario: Fabian1105
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Super Administrador: Fabián Andrés Martínez Valderrama
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl">
                  Acceso exclusivo del creador de FINTECH. Control absoluto sobre credenciales de administradores, historial forense de auditoría y supervisión global del sistema.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-4 py-2.5 rounded-2xl bg-[#14121F]/90 border border-[#2D2545] text-center">
                  <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Administradores</span>
                  <span className="text-lg font-black text-white">{admins.length}</span>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-[#14121F]/90 border border-[#2D2545] text-center">
                  <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Registros Auditoría</span>
                  <span className="text-lg font-black text-[#8B5CF6]">{logs.length}</span>
                </div>
              </div>
            </div>

            {/* Pestañas de Navegación del Panel */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#2D2545]/60 overflow-x-auto touch-scroll">
              <button
                type="button"
                onClick={() => setActiveTab('admin_mgmt')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'admin_mgmt'
                    ? 'bg-gradient-to-r from-[#E5092F] to-[#C40726] text-white shadow-md shadow-red-950/60'
                    : 'bg-[#14121F] text-neutral-300 hover:text-white border border-[#2D2545]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Gestión del Administrador Normal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'audit'
                    ? 'bg-gradient-to-r from-[#E5092F] to-[#C40726] text-white shadow-md shadow-red-950/60'
                    : 'bg-[#14121F] text-neutral-300 hover:text-white border border-[#2D2545]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Auditoría del Sistema ({logs.length})</span>
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {message && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* PESTAÑA 1: GESTIÓN DEL ADMINISTRADOR NORMAL */}
          {activeTab === 'admin_mgmt' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Cuentas registradas */}
              <div className="bg-[#121118] rounded-3xl p-5 border border-[#2D2545] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#221D33]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Cuentas Administrativas</span>
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {admins.map((admin) => {
                    const isSelected = admin.id === selectedAdminId;
                    const isSuper = admin.role === 'SUPERADMIN';

                    return (
                      <div
                        key={admin.id}
                        onClick={() => handleSelectAdmin(admin)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1C182A] border-[#8B5CF6] shadow-md shadow-purple-950/40'
                            : 'bg-[#14121F] border-[#2A243D] hover:border-[#3E345C]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white">{admin.name}</span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                  isSuper
                                    ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                                    : 'bg-blue-900/40 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {admin.role}
                              </span>
                            </div>
                            <p className="text-xs text-[#A78BFA] mt-0.5">@{admin.username || 'sin_usuario'}</p>
                            <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{admin.email}</span>
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              admin.is_active
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-950/60 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {admin.is_active ? 'Activo' : 'Suspendido'}
                          </span>
                        </div>

                        {admin.last_login && (
                          <div className="mt-2.5 pt-2 border-t border-[#221D33] text-[10px] text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Último acceso: {new Date(admin.last_login).toLocaleString('es-CO')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha: Formulario de Control y Modificación de Credenciales */}
              <div className="lg:col-span-2 bg-[#121118] rounded-3xl p-6 sm:p-7 border border-[#2D2545] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#221D33] gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#E5092F]" />
                      <span>
                        Gestión de Credenciales: {selectedAdmin?.name || 'Administrador'}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Modifica la contraseña, correo electrónico y parámetros de acceso directamente.
                    </p>
                  </div>

                  {selectedAdmin && selectedAdmin.role !== 'SUPERADMIN' && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(selectedAdmin)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedAdmin.is_active
                          ? 'bg-red-950/30 border-red-800/40 text-red-300 hover:bg-red-900/40'
                          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                      }`}
                    >
                      {selectedAdmin.is_active ? 'Suspender Acceso' : 'Reactivar Acceso'}
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveAdminCredentials} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nombre Completo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Nombre Completo</label>
                      <input
                        type="text"
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                        placeholder="Nombre de la administradora"
                        required
                        className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    {/* Nombre de Usuario */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>Nombre de Usuario (Login)</span>
                      </label>
                      <input
                        type="text"
                        value={targetUsername}
                        onChange={(e) => setTargetUsername(e.target.value)}
                        placeholder="ej. AnaPosada55"
                        required
                        className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    {/* Correo Electrónico Oficial */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>Correo Electrónico Oficial (artulio213@gmail.com)</span>
                      </label>
                      <input
                        type="email"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        placeholder="artulio213@gmail.com"
                        required
                        className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <p className="text-[10px] text-neutral-500">
                        Destino autorizado para notificaciones y recuperación 2FA.
                      </p>
                    </div>
                  </div>

                  {/* Cambio de Contraseña Directo (Por autoridad del Superadmin) */}
                  <div className="pt-4 border-t border-[#221D33] space-y-4">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#E5092F]" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Asignación Directa de Nueva Contraseña
                      </h4>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Como Super Administrador, puedes restablecer directamente la contraseña de este administrador sin necesidad de validación 2FA. Deja estos campos en blanco si solo deseas actualizar el correo o usuario.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">
                          Nueva Contraseña (Opcional)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 text-neutral-400 hover:text-white p-1"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">
                          Confirmar Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite la contraseña"
                          className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingAdmin}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white shadow-lg shadow-red-950/70 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{savingAdmin ? 'Guardando...' : 'Aplicar y Guardar Cambios'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: AUDITORÍA INTEGRAL DEL SISTEMA */}
          {activeTab === 'audit' && (
            <div className="bg-[#121118] rounded-3xl p-5 sm:p-6 border border-[#2D2545] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#221D33] gap-3">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-[#8B5CF6]" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Registro de Auditoría & Trazabilidad Forense
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Historial completo de accesos, modificaciones, logins y eventos administrativos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportAuditExcel}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181624] hover:bg-[#201D30] text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportAuditPDF}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181624] hover:bg-[#201D30] text-red-300 border border-red-500/30 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF Oficial</span>
                  </button>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchLog}
                    onChange={(e) => setSearchLog(e.target.value)}
                    placeholder="Buscar por usuario, IP, acción o detalle..."
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="bg-[#14121F] border border-[#2D2545] rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="TODOS">Todas las Acciones</option>
                  <option value="LOGIN_SUCCESS">Inicios de Sesión</option>
                  <option value="PASSWORD_CHANGE_2FA">Cambios de Contraseña 2FA</option>
                  <option value="SUPERADMIN_UPDATE_ADMIN">Modificaciones Superadmin</option>
                  <option value="UPDATE_SETTINGS">Ajustes del Sistema</option>
                  <option value="CREATE_LOAN">Creación de Crédito</option>
                  <option value="REGISTER_PAYMENT">Recaudos y Pagos</option>
                </select>
              </div>

              {/* Tabla de Auditoría */}
              <div className="overflow-x-auto touch-scroll border border-[#221D33] rounded-2xl">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#14121F] text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-[#221D33]">
                    <tr>
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Acción</th>
                      <th className="py-3 px-4">Usuario / Actor</th>
                      <th className="py-3 px-4">IP</th>
                      <th className="py-3 px-4">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D192B]">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs">
                          No se encontraron eventos de auditoría con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const isLogin = log.action === 'LOGIN_SUCCESS';
                        const isSuperAction = log.action.includes('SUPERADMIN');

                        return (
                          <tr key={log.id} className="hover:bg-[#181524] transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('es-CO')}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isLogin
                                    ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                                    : isSuperAction
                                    ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                                    : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-semibold text-white">
                                {log.admin_name || `ID: ${log.user_id || 'Sistema'}`}
                              </span>
                              {log.admin_email && (
                                <span className="block text-[10px] text-neutral-400">{log.admin_email}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                              {log.ip_address || '127.0.0.1'}
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate text-[11px] text-neutral-300" title={log.details || ''}>
                              {log.details || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

