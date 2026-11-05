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
  Building,
  Percent,
  Sliders,
  CreditCard,
} from 'lucide-react';
import { formatCOP } from '@/lib/calculations';

export default function ConfiguracionPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cambio de contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchSettings = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setPaymentMethods(data.paymentMethods);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

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

    setSaving(true);

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
          adminPasswordUpdate: newPassword ? { newPassword } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar configuración');

      setMessage('Configuración y parámetros del sistema guardados exitosamente.');
      setNewPassword('');
      setConfirmPassword('');
      fetchSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <Header
          title="Configuración del Sistema"
          subtitle="Tasas de interés, reglas de negocio, parámetros de crédito y seguridad de acceso"
        />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
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

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* 1. Datos Institucionales */}
            <div className="bg-neutral-950 rounded-3xl p-6 border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-800">
                <Building className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Datos de la Entidad FINTECH
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombre Comercial</label>
                  <input
                    type="text"
                    value={settings.company_name || ''}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">NIT / Identificación</label>
                  <input
                    type="text"
                    value={settings.company_nit || ''}
                    onChange={(e) => setSettings({ ...settings, company_nit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={settings.company_phone || ''}
                    onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
                  <input
                    type="email"
                    value={settings.company_email || ''}
                    onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Reglas de Negocio Financieras */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Parámetros Crediticios & Políticas
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Tasa de Interés Predeterminada (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.default_interest_rate || '20'}
                    onChange={(e) =>
                      setSettings({ ...settings, default_interest_rate: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Periodicidad Predeterminada
                  </label>
                  <select
                    value={settings.default_periodicity || 'SEMANAL'}
                    onChange={(e) =>
                      setSettings({ ...settings, default_periodicity: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SEMANAL">SEMANAL</option>
                    <option value="QUINCENAL">QUINCENAL</option>
                    <option value="MENSUAL">MENSUAL</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Capital Mínimo Permitido (COP)
                  </label>
                  <input
                    type="number"
                    value={settings.min_capital_amount || '100000'}
                    onChange={(e) =>
                      setSettings({ ...settings, min_capital_amount: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    {formatCOP(settings.min_capital_amount || 100000)}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Capital Máximo Permitido (COP)
                  </label>
                  <input
                    type="number"
                    value={settings.max_capital_amount || '10000000'}
                    onChange={(e) =>
                      setSettings({ ...settings, max_capital_amount: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    {formatCOP(settings.max_capital_amount || 10000000)}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Máximo Cuotas (Préstamos &lt; $1.000.000)
                  </label>
                  <input
                    type="number"
                    value={settings.max_installments_under_1m || '20'}
                    onChange={(e) =>
                      setSettings({ ...settings, max_installments_under_1m: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Máximo Cuotas (Préstamos &ge; $1.000.000)
                  </label>
                  <input
                    type="number"
                    value={settings.max_installments_over_1m || '28'}
                    onChange={(e) =>
                      setSettings({ ...settings, max_installments_over_1m: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Seguridad de Acceso */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Seguridad & Contraseña de Administrador
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nueva Contraseña (Dejar en blanco para conservar actual)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Guardar cambios button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-all cursor-pointer shadow-lg shadow-red-950/60 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Todos los Cambios'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
