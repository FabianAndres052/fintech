'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Header from '@/components/Header';
import { ShieldCheck, Search, FileSpreadsheet, Lock, Activity } from 'lucide-react';
import { formatDate } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportUtils';

export default function AuditoriaPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availableCash, setAvailableCash] = useState(0);

  const fetchLogs = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
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
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.entity?.toLowerCase().includes(term) ||
      log.admin_name?.toLowerCase().includes(term) ||
      log.admin_email?.toLowerCase().includes(term) ||
      log.ip_address?.toLowerCase().includes(term)
    );
  });

  const handleExportExcel = () => {
    const data = filteredLogs.map((l) => ({
      ID: l.id,
      Usuario: l.admin_name || 'Sistema',
      Email: l.admin_email || '',
      Accion: l.action,
      Entidad: l.entity,
      Entidad_ID: l.entity_id || '',
      IP: l.ip_address || '',
      Fecha: l.created_at,
    }));
    exportToExcel(data, 'Auditoria_Operaciones_FINTECH');
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0F] text-neutral-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        <Header
          title="Auditoría & Seguridad"
          subtitle="Trazabilidad y registro inmutable de operaciones financieras y administrativas"
          availableCash={availableCash}
        />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por acción, usuario o IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600"
              />
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Auditoría Excel</span>
            </button>
          </div>

          {/* Logs Table */}
          <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4"># ID</th>
                    <th className="py-3 px-4">Acción Realizada</th>
                    <th className="py-3 px-4">Módulo / Tabla</th>
                    <th className="py-3 px-4">Administrador</th>
                    <th className="py-3 px-4">Dirección IP</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        {loading ? 'Cargando logs de auditoría...' : 'No hay registros de auditoría.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">#{log.id}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-emerald-400 font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-300">{log.entity}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{log.admin_name || 'Admin'}</p>
                          <p className="text-[10px] text-slate-400">{log.admin_email}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.ip_address}</td>
                        <td className="py-3 px-4 text-slate-300">{formatDate(log.created_at)}</td>
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
    </div>
  );
}
