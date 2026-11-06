'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, AlertCircle, CheckCircle, Sparkles, Shield, Smartphone, Zap } from 'lucide-react';
import FintechLogo from '@/components/FintechLogo';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedOutNotice, setLoggedOutNotice] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-[#E5092F] selection:text-white">
      {/* Background radial glowing gradients (Black, Red, Lilac) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#8B5CF6]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#E5092F]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-[#6D28D9]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header (Exacto al Mockup Screen 1: Cover) */}
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
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Contraseña</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#14121F] border border-[#2D2545] rounded-2xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6] transition-all"
                required
                autoComplete="current-password"
              />
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

        <p className="text-center text-[11px] text-neutral-500">
          FINTECH · Plataforma de préstamos y cobranzas autorizada.
        </p>
      </div>
    </div>
  );
}
