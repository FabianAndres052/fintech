'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Mail,
  KeyRound,
  Sparkles,
  Info,
  Sliders,
  Building,
  Check,
  Eye,
  EyeOff,
  Code2,
  Smartphone,
  Cpu,
} from 'lucide-react';
import { formatCOP } from '@/lib/calculations';
import FintechLogo from '@/components/FintechLogo';

export default function ConfiguracionPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<{
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
  } | null>(null);

  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edición de Usuario
  const [editUsername, setEditUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Flujo 2FA para Cambio de Contraseña
  const [twoFaEmail, setTwoFaEmail] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<'idle' | 'code_sent' | 'verified'>('idle');
  const [requestingCode, setRequestingCode] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFaNotice, setTwoFaNotice] = useState<string | null>(null);
  const [simulatedDevCode, setSimulatedDevCode] = useState<string | null>(null);

  // Reglas financieras
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchProfileAndSettings = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      setAdmin(authData.admin);
      setEditUsername(authData.admin.username || authData.admin.name || '');
      setTwoFaEmail(authData.admin.email || '');

      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(settingsData.settings || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndSettings();
  }, []);

  // Actualizar solo nombre de usuario
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!editUsername.trim()) {
      setError('El nombre de usuario no puede estar vacío.');
      return;
    }

    setSavingUsername(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminProfileUpdate: { username: editUsername.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar nombre de usuario');

      setMessage('Nombre de usuario actualizado con éxito.');
      if (admin) {
        setAdmin({ ...admin, username: editUsername.trim() });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingUsername(false);
    }
  };

  // Paso 1 de 2FA: Solicitar código
  const handleRequest2FACode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setTwoFaNotice(null);
    setSimulatedDevCode(null);

    if (!twoFaEmail.trim()) {
      setError('Debes especificar un correo electrónico para recibir el código 2FA.');
      return;
    }

    setRequestingCode(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: twoFaEmail.trim(),
          purpose: 'CHANGE_PASSWORD',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar código de verificación');

      setTwoFaNotice(data.message || 'Código de seguridad 2FA enviado al correo.');
      if (data.simulated && data.devCode) {
        setSimulatedDevCode(`Código 2FA generado: ${data.devCode}`);
        setTwoFaCode(data.devCode);
      }
      setTwoFaStep('code_sent');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequestingCode(false);
    }
  };

  // Paso 2 de 2FA: Validar código y cambiar contraseña
  const handleVerify2FAAndChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!twoFaCode.trim()) {
      setError('Ingresa el código 2FA de 6 dígitos recibido.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: twoFaEmail.trim(),
          code: twoFaCode.trim(),
          newPassword,
          newUsername: editUsername.trim() !== admin?.username ? editUsername.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código 2FA incorrecto o expirado.');

      setMessage('¡Contraseña cambiada exitosamente con autenticación 2FA!');
      setNewPassword('');
      setConfirmPassword('');
      setTwoFaCode('');
      setTwoFaStep('idle');
      setTwoFaNotice(null);
      setSimulatedDevCode(null);
      fetchProfileAndSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // Guardar parámetros de crédito
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSavingSettings(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            default_interest_rate: settings.default_interest_rate,
            default_periodicity: settings.default_periodicity,
            company_name: settings.company_name,
            company_nit: settings.company_nit,
            company_phone: settings.company_phone,
            company_email: settings.company_email,
            min_capital_amount: settings.min_capital_amount,
            max_capital_amount: settings.max_capital_amount,
            max_installments_under_1m: settings.max_installments_under_1m,
            max_installments_over_1m: settings.max_installments_over_1m,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar parámetros crediticios');

      setMessage('Políticas financieras y parámetros guardados exitosamente.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100 selection:bg-[#E5092F] selection:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Perfil & Configuración"
          subtitle="Seguridad de acceso 2FA, parámetros crediticios e información institucional"
        />

        <main className="flex-1 p-4 sm:p-7 space-y-6 max-w-4xl mx-auto w-full">
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

          {/* 1. SECCIÓN EXCLUSIVA: PERFIL ADMINISTRADOR (Modificación Únicamente de Usuario y Contraseña vía 2FA) */}
          <div className="bg-[#121118] rounded-3xl p-6 sm:p-7 border border-[#2D2545] shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#221D33] gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-purple-950/50">
                  {admin?.name?.substring(0, 2).toUpperCase() || 'AP'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{admin?.name || 'Administradora'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C4B5FD]">
                      {admin?.role || 'ADMIN'}
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Modificación restringida: Solo nombre de usuario y contraseña con autenticación 2FA.
                  </p>
                </div>
              </div>
            </div>

            {/* Formulario 1: Modificación de Nombre de Usuario */}
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Nombre de Usuario</span>
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="ej. AnaPosada55"
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Identificador utilizado para iniciar sesión en la plataforma.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Correo Electrónico (Registrado)</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={admin?.email || 'anaposada55@fintech.com'}
                    className="w-full bg-[#181622]/60 border border-[#221D33] rounded-xl px-3.5 py-2.5 text-xs text-neutral-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Destino predeterminado de los códigos de seguridad 2FA.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingUsername}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A1828] hover:bg-[#252238] text-white border border-[#3E345C] transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingUsername ? 'Guardando Usuario...' : 'Guardar Nombre de Usuario'}
                </button>
              </div>
            </form>

            {/* Formulario 2: Modificación de Contraseña con Validación 2FA Obligatoria */}
            <div className="pt-4 border-t border-[#221D33] space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#E5092F]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Cambio de Contraseña mediante Código de Seguridad 2FA
                </h3>
              </div>

              <p className="text-xs text-neutral-400">
                Por motivos de alta seguridad financiera, para modificar tu contraseña debes ingresar el correo electrónico del administrador. Te enviaremos un código 2FA de 6 dígitos que deberá ser validado antes de autorizar el cambio.
              </p>

              {twoFaNotice && (
                <div className="p-3.5 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 text-[#C4B5FD] text-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#8B5CF6]" />
                  <span>{twoFaNotice}</span>
                </div>
              )}

              {simulatedDevCode && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2 font-mono font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{simulatedDevCode}</span>
                </div>
              )}

              {twoFaStep === 'idle' ? (
                <form onSubmit={handleRequest2FACode} className="space-y-4">
                  <div className="space-y-1.5 max-w-md">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>Ingresa tu Correo Electrónico para recibir el Código 2FA</span>
                    </label>
                    <input
                      type="email"
                      value={twoFaEmail}
                      onChange={(e) => setTwoFaEmail(e.target.value)}
                      placeholder="ej. anaposada55@fintech.com"
                      required
                      className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={requestingCode}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] text-white shadow-lg shadow-red-950/60 cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{requestingCode ? 'Enviando Código...' : 'Enviar Código 2FA al Correo'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerify2FAAndChangePassword} className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>Código 2FA (6 dígitos)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={twoFaCode}
                        onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        required
                        className="w-full bg-[#14121F] border border-[#8B5CF6]/50 rounded-xl px-3.5 py-2.5 text-center text-sm font-mono font-bold tracking-[4px] text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>Nueva Contraseña</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                          className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 text-neutral-400 hover:text-white p-1"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                        required
                        className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setTwoFaStep('idle')}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#181624] text-neutral-300 hover:text-white border border-[#2D2545] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/60 cursor-pointer disabled:opacity-50"
                    >
                      {changingPassword ? 'Validando 2FA...' : 'Validar Código 2FA y Cambiar Contraseña'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* 2. SECCIÓN REQUERIDA: ACERCA DE FINTECH — AUTORÍA Y DESARROLLO OFICIAL */}
          <div className="bg-[#121118] rounded-3xl p-6 sm:p-7 border border-[#2D2545] shadow-xl relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E5092F]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#221D33]">
                <FintechLogo size="sm" showSubtitle />
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C4B5FD] text-[11px] font-bold">
                    Versión 2.4.0 Pro
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#E5092F]/20 border border-[#E5092F]/40 text-red-300 text-[11px] font-bold">
                    Edición Privada
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-neutral-300 text-xs sm:text-sm leading-relaxed">
                <p>
                  <strong className="text-white">FINTECH</strong> es una plataforma de software de alta gama especializada y diseñada exclusivamente para la administración, liquidación inteligente, seguimiento de cobranzas y control riguroso de <strong>préstamos financieros, carteras de crédito y finanzas estratégicas</strong>, ya sean propias, de patrimonio personal o de esquemas comerciales y de negocios.
                </p>
                <p>
                  Desarrollada con una arquitectura de máxima precisión numérica en moneda local (COP), seguridad criptográfica en dos pasos (2FA), trazabilidad de auditoría en tiempo real y una interfaz optimizada para dispositivos móviles (iPhone, Android) y computadores.
                </p>
              </div>

              {/* Developer Credit Card */}
              <div className="mt-4 p-4 rounded-2xl bg-[#161324] border border-[#362C54] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-md">
                    <Code2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#A78BFA] uppercase tracking-wider font-bold">
                      Ingeniería & Desarrollo de Software
                    </p>
                    <p className="text-sm font-bold text-white">
                      Fabián Andrés Martínez Valderrama
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Desarrollador Full Stack & Arquitecto de Soluciones Financieras
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
                  <span className="px-2.5 py-1 rounded-lg bg-[#0B0B0F] border border-[#2D2545] text-neutral-300">
                    Next.js & React 19
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#0B0B0F] border border-[#2D2545] text-neutral-300">
                    TiDB / MySQL Cloud
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#0B0B0F] border border-[#2D2545] text-neutral-300">
                    PWA Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. PARÁMETROS CREDITICIOS & REGLAS DE NEGOCIO */}
          <form onSubmit={handleSaveSettings} className="bg-[#121118] rounded-3xl p-6 sm:p-7 border border-[#2D2545] shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#221D33]">
              <Sliders className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Políticas de Crédito & Parámetros Financieros
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Tasa de Interés Predeterminada (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.default_interest_rate || '20'}
                  onChange={(e) =>
                    setSettings({ ...settings, default_interest_rate: e.target.value })
                  }
                  className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3 py-2 text-xs text-[#A78BFA] font-bold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Periodicidad Predeterminada
                </label>
                <select
                  value={settings.default_periodicity || 'SEMANAL'}
                  onChange={(e) =>
                    setSettings({ ...settings, default_periodicity: e.target.value })
                  }
                  className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="SEMANAL">SEMANAL</option>
                  <option value="QUINCENAL">QUINCENAL</option>
                  <option value="MENSUAL">MENSUAL</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Capital Mínimo Permitido (COP)
                </label>
                <input
                  type="number"
                  value={settings.min_capital_amount || '100000'}
                  onChange={(e) =>
                    setSettings({ ...settings, min_capital_amount: e.target.value })
                  }
                  className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
                <span className="text-[10px] text-neutral-400">
                  {formatCOP(settings.min_capital_amount || 100000)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Capital Máximo Permitido (COP)
                </label>
                <input
                  type="number"
                  value={settings.max_capital_amount || '10000000'}
                  onChange={(e) =>
                    setSettings({ ...settings, max_capital_amount: e.target.value })
                  }
                  className="w-full bg-[#14121F] border border-[#2D2545] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
                <span className="text-[10px] text-neutral-400">
                  {formatCOP(settings.max_capital_amount || 10000000)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#181624] hover:bg-[#221F33] text-white border border-[#3E345C] transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-[#8B5CF6]" />
                <span>{savingSettings ? 'Guardando...' : 'Guardar Parámetros Financieros'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
