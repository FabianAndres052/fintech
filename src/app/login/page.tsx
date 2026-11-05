'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

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
          // Reintento automático silencioso para mitigar arranque en frío (cold start)
          return attemptLogin(retriesLeft - 1);
        }
        throw err;
      }
    };

    try {
      const data = await attemptLogin(1);

      // Guardar token y credenciales localmente para carga inmediata
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
      window.location.replace('/');
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
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 relative overflow-hidden selection:bg-red-600 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-neutral-900/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-800 via-red-700 to-red-600 items-center justify-center text-white font-black text-2xl shadow-xl shadow-red-950/60 mb-4 border border-red-500/30">
            $
          </div>
          <h1 className="text-3xl font-black text-white tracking-wider">
            FIN<span className="text-red-500">TECH</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-semibold">
            Plataforma Financiera de Préstamos
          </p>
        </div>

        {/* Card */}
        <div className="bg-neutral-950/90 rounded-3xl p-7 shadow-2xl border border-neutral-800">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Acceso Administrativo</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Ingrese con sus credenciales autorizadas
            </p>
          </div>

          {loggedOutNotice && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Sesión cerrada correctamente y de forma segura.</span>
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
                <User className="w-3.5 h-3.5 text-red-400" />
                <span>Usuario</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Contraseña</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-red-700 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-950/60 active:scale-[0.98] cursor-pointer disabled:opacity-50"
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

        <p className="text-center text-[11px] text-neutral-500 mt-6">
          FINTECH © 2026. Conexión cifrada de alta seguridad.
        </p>
      </div>
    </div>
  );
}
