'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Menu,
  X,
  CalendarDays,
  Landmark,
  Wallet,
  FileBarChart,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

interface MobileNavProps {
  onLogout?: () => void;
}

export default function MobileNav({ onLogout }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
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

  const mainTabs = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Préstamos', href: '/prestamos', icon: CreditCard },
    { name: 'Pagos', href: '/pagos', icon: Receipt },
  ];

  const extraItems = [
    { name: 'Cuotas & Cobros', href: '/cuotas', icon: CalendarDays },
    { name: 'Contabilidad', href: '/contabilidad', icon: Landmark },
    { name: 'Caja & Movimientos', href: '/caja', icon: Wallet },
    { name: 'Reportes Financieros', href: '/reportes', icon: FileBarChart },
    { name: 'Auditoría', href: '/auditoria', icon: ShieldCheck },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 border-t border-neutral-800 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around safe-bottom">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-red-400 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5">{tab.name}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            menuOpen ? 'text-red-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-[10px] mt-0.5">Más</span>
        </button>
      </div>

      {/* Slide-over menu for extra pages */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Módulos FINTECH
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {extraItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-red-950/40 border-red-800/40 text-red-400 font-semibold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-xs font-medium truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-900/40 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
