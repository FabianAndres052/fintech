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
  ShieldAlert,
  LogOut,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import FintechLogo from './FintechLogo';

interface SidebarProps {
  adminName?: string;
  adminEmail?: string;
  onLogout?: () => void;
}

export default function Sidebar({ adminName = 'Ana Posada', adminEmail = 'artulio213@gmail.com', onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role?: string }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('admin_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            name: parsed.name || adminName,
            email: parsed.email || parsed.username || adminEmail,
            role: parsed.role || 'ADMIN',
          };
        }
      } catch {}
    }
    return { name: adminName, email: adminEmail, role: 'ADMIN' };
  });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.admin) {
          setUser({
            name: data.admin.name,
            email: data.admin.email,
            role: data.admin.role,
          });
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
      window.location.replace('/login?logout=1');
    } else {
      router.push('/login?logout=1');
    }
  };

  const isSuperAdmin = user.role === 'SUPERADMIN';

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Préstamos', href: '/prestamos', icon: CreditCard },
    { name: 'Cuotas & Cobros', href: '/cuotas', icon: CalendarDays },
    { name: 'Pagos & Recaudos', href: '/pagos', icon: Receipt },
    { name: 'Finanzas', href: '/contabilidad', icon: Landmark },
    { name: 'Caja & Efectivo', href: '/caja', icon: Wallet },
    { name: 'Reportes', href: '/reportes', icon: FileBarChart },
    // Exclusivo para Super Administrador
    ...(isSuperAdmin
      ? [
          { name: 'Super Administrador', href: '/superadmin', icon: ShieldAlert, isSpecial: true },
          { name: 'Auditoría', href: '/auditoria', icon: ShieldCheck },
        ]
      : []),
    { name: 'Configuración', href: '/configuracion', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#0B0B0F] border-r border-[#221D33] shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#221D33] flex items-center justify-between">
        <FintechLogo size="sm" showSubtitle />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 touch-scroll">
        <p className="text-[10px] uppercase font-bold text-[#8B5CF6] tracking-wider px-3 mb-2">
          Administración
        </p>

        {menuItems.map((item: any) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all group ${
                item.isSpecial
                  ? isActive
                    ? 'bg-gradient-to-r from-purple-600/30 via-red-600/20 to-transparent text-white border-l-4 border-purple-500 shadow-md shadow-purple-950/40'
                    : 'text-purple-300 bg-purple-950/20 border border-purple-500/30 hover:bg-purple-900/30 hover:text-white'
                  : isActive
                  ? 'bg-gradient-to-r from-[#E5092F]/20 via-[#8B5CF6]/15 to-transparent text-white border-l-4 border-[#E5092F]'
                  : 'text-neutral-400 hover:text-white hover:bg-[#181622]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    item.isSpecial
                      ? 'text-purple-400 group-hover:text-purple-300'
                      : isActive
                      ? 'text-[#E5092F]'
                      : 'text-neutral-400 group-hover:text-[#8B5CF6]'
                  }`}
                />
                <span className={isActive || item.isSpecial ? 'font-bold text-white' : ''}>
                  {item.name}
                </span>
              </div>
              {isActive && (
                <div className={`w-1.5 h-1.5 rounded-full ${item.isSpecial ? 'bg-purple-400 shadow-[0_0_8px_#A855F7]' : 'bg-[#E5092F] shadow-[0_0_8px_#E5092F]'}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin User Footer Profile */}
      <div className="p-3.5 border-t border-[#221D33] bg-[#0E0D14]">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-[#14121F] border border-[#2A243D]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md ${
              isSuperAdmin ? 'bg-gradient-to-tr from-amber-500 via-red-600 to-purple-600' : 'bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6]'
            }`}>
              {isSuperAdmin ? 'FM' : 'AP'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-neutral-400 truncate">
                {isSuperAdmin ? 'Super Administrador' : 'Administradora'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Cerrar sesión"
            className="p-1.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
