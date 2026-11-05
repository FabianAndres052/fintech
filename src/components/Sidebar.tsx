'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarDays,
  Receipt,
  Landmark,
  Wallet,
  FileBarChart,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  adminName?: string;
  adminEmail?: string;
  onLogout?: () => void;
}

export default function Sidebar({ adminName = 'Ana Posada', adminEmail = 'AnaPosada55', onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('admin_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          return { name: parsed.name || adminName, email: parsed.username || parsed.email || adminEmail };
        }
      } catch {}
    }
    return { name: adminName, email: adminEmail };
  });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.admin) {
          setUser({ name: data.admin.name, email: data.admin.email });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
      } catch (err) {
        console.error('Storage clear error:', err);
      }
      // Reemplaza el historial para impedir volver con botón Atrás del navegador
      window.location.replace('/login?logout=1');
    } else {
      router.push('/login?logout=1');
    }
  };

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Préstamos', href: '/prestamos', icon: CreditCard },
    { name: 'Cuotas & Cobros', href: '/cuotas', icon: CalendarDays },
    { name: 'Pagos & Recaudos', href: '/pagos', icon: Receipt },
    { name: 'Contabilidad', href: '/contabilidad', icon: Landmark },
    { name: 'Caja & Movimientos', href: '/caja', icon: Wallet },
    { name: 'Reportes', href: '/reportes', icon: FileBarChart },
    { name: 'Auditoría', href: '/auditoria', icon: ShieldCheck },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-black border-r border-neutral-800 shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-800 via-red-700 to-red-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-950/60 border border-red-500/30">
          $
        </div>
        <div>
          <span className="text-lg font-black tracking-wider text-white flex items-center">
            FIN<span className="text-red-500">TECH</span>
          </span>
          <span className="text-[10px] tracking-widest uppercase font-semibold text-neutral-400">
            Créditos & Cartera
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-red-950/40 text-red-400 border border-red-800/40 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-red-400' : 'text-neutral-400 group-hover:text-neutral-200'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-red-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile & Logout Footer */}
      <div className="p-4 border-t border-neutral-800 bg-[#0a0a0d]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-900/30 border border-red-700/40 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-200 truncate">{user.name}</p>
              <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-white hover:bg-red-950/50 border border-red-900/40 transition-all cursor-pointer disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
        </button>
      </div>
    </aside>
  );
}
