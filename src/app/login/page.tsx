'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Shield,
  Smartphone,
  Zap,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  X,
  ShieldCheck,
} from 'lucide-react';
import FintechLogo from '@/components/FintechLogo';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedOutNotice, setLoggedOutNotice] = useState(false);

  // Modal "¿Olvidaste tu contraseña?" (2FA)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [simulatedNotice, setSimulatedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === '1') {
        setLoggedOutNotice(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoggedOutNotice(false);
    setLoading(true);

    const attemptLogin = async (retriesLeft = 1): Promise<any> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Credenciales inválidas o error de conexión.');
        }
        return data;
      } catch (err: any) {
        if (retriesLeft > 0 && (err.name === 'AbortError' || err.message?.toLowerCase().includes('fetch'))) {
          return attemptLogin(retriesLeft - 1);
        }
        throw err;
      }
    };

    try {
      const data = await attemptLogin(1);

      if (typeof window !== 'undefined') {
        if (data.token) {
          document.cookie = `admin_token=${data.token}; path=/; max-age=604800; SameSite=Lax${
            window.location.protocol === 'https:' ? '; Secure' : ''
          }`;
          try {
            localStorage.setItem('admin_token', data.token);
            if (data.admin) {
              localStorage.setItem('admin_user', JSON.stringify(data.admin));
            }
          } catch {}
        }
      }

      // Reemplazo limpio hacia el dashboard
      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/') {
          window.location.reload();
        } else {
          window.location.replace('/');
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('fetch')) {
        setError('El servidor está inicializando la conexión en la nube. Por favor intenta ingresar de nuevo.');
      } else {
        setError(err.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2FA: Solicitar código de recuperación
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setSimulatedNotice(null);

    if (!forgotEmail.trim()) {
      setForgotError('Ingresa tu correo electrónico registrado.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), purpose: 'PASSWORD_RESET' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el código 2FA.');

      setForgotSuccess(data.message || 'Código enviado con éxito.');
      if (data.simulated && data.devCode) {
        setSimulatedNotice(`Código de verificación: ${data.devCode}`);
        setForgotCode(data.devCode);
      }
      setForgotStep('verify');
    } catch (err: any) {
      setForgotError(err.message || 'Error al solicitar código.');
    } finally {
      setForgotLoading(false);
    }
  };

  // 2FA: Validar código y cambiar contraseña
  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotCode.trim()) {
      setForgotError('Ingresa el código de 6 dígitos.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Las contraseñas no coinciden.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código 2FA incorrecto o expirado.');

      // Éxito
      setForgotSuccess('¡Contraseña restablecida correctamente! Ya puedes iniciar sesión.');
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotStep('request');
        setForgotCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setPassword(forgotNewPassword);
      }, 1500);
    } catch (err: any) {
      setForgotError(err.message || 'Error al validar el código 2FA.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-[#E5092F] selection:text-white">
      {/* Background radial glowing gradients (Black, Red, Lilac) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#8B5CF6]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#E5092F]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-[#6D28D9]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-block mb-1">
            <FintechLogo size="lg" showSubtitle />
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto">
            Gestiona tus préstamos de forma fácil, segura y profesional.
          </p>

          {/* Feature Badge Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#14121F] border border-[#8B5CF6]/30 text-[10px] text-[#A78BFA] font-medium">
              <Sparkles className="w-3 h-3 text-[#E5092F]" /> Diseño Premium
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#14121F] border border-[#8B5CF6]/30 text-[10px] text-[#A78BFA] font-medium">
              <Smartphone className="w-3 h-3 text-[#8B5CF6]" /> 100% Responsive
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#14121F] border border-[#8B5CF6]/30 text-[10px] text-[#A78BFA] font-medium">
              <Zap className="w-3 h-3 text-amber-400" /> PWA Instalable
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#14121F] border border-[#8B5CF6]/30 text-[10px] text-[#A78BFA] font-medium">
              <Shield className="w-3 h-3 text-emerald-400" /> Rápida y Segura
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#121118]/95 rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#2D2545] backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white tracking-tight">Acceso Administrativo</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Panel exclusivo de administración y cobranzas
            </p>
          </div>

          {loggedOutNotice && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Sesión cerrada correctamente.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Usuario</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6] transition-all"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Contraseña</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(true);
                    setForgotStep('request');
                    setForgotError(null);
                    setForgotSuccess(null);
                    setSimulatedNotice(null);
                  }}
                  className="text-[11px] font-semibold text-[#A78BFA] hover:text-white transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl pl-4 pr-11 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6] transition-all"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-neutral-400 hover:text-neutral-200 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/70 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Autoría Oficial: Fabián Andrés Martínez Valderrama */}
        <div className="text-center space-y-1.5 pt-2">
          <p className="text-xs text-neutral-400">
            FINTECH · Plataforma de préstamos y finanzas autorizada.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14121F]/80 border border-[#2D2545] text-[11px] text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>
              Desarrollada por{' '}
              <strong className="text-white font-semibold">
                Fabián Andrés Martínez Valderrama
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Modal: ¿Olvidaste tu contraseña? (2FA) */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#121118] border border-[#2D2545] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white bg-[#1A1828] border border-[#2A243D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-purple-950/50">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recuperar Contraseña</h3>
                <p className="text-xs text-neutral-400">Autenticación en dos pasos (2FA)</p>
              </div>
            </div>

            {forgotError && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {simulatedNotice && (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-[#8B5CF6]/40 text-[#C4B5FD] text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-mono font-bold">{simulatedNotice}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Ingresa tu correo electrónico de administrador. Enviaremos un código de seguridad de 6 dígitos para validar tu identidad.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Correo del Administrador</span>
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ej. artulio213@gmail.com"
                    required
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold bg-[#181624] text-neutral-300 hover:text-white border border-[#2D2545] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/60 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? 'Enviando código...' : 'Enviar Código 2FA'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Ingresa el código 2FA enviado a <strong className="text-white">{forgotEmail}</strong> y tu nueva contraseña.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Código de Seguridad (6 dígitos)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full bg-[#14121F] border border-[#8B5CF6]/50 rounded-2xl px-4 py-3 text-center text-lg font-mono font-black tracking-[6px] text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Nueva Contraseña</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl pl-4 pr-11 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3.5 text-neutral-400 hover:text-white p-1 cursor-pointer"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    required
                    className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold bg-[#181624] text-neutral-300 hover:text-white border border-[#2D2545] cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E5092F] to-[#C40726] hover:from-[#FF1744] hover:to-[#E5092F] shadow-lg shadow-red-950/60 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? 'Restableciendo...' : 'Guardar Nueva Contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}