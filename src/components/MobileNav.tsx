'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  CreditCard,
  Landmark,
  User,
  Menu,
  X,
  CalendarDays,
  Wallet,
  FileBarChart,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Receipt,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import FintechLogo from './FintechLogo';

interface MobileNavProps {
  onLogout?: () => void;
}

export default function MobileNav({ onLogout }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('admin_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.role || 'ADMIN';
        }
      } catch {}
    }
    return 'ADMIN';
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.admin) {
          setUserRole(data.admin.role || 'ADMIN');
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
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

  const isSuperAdmin = userRole === 'SUPERADMIN';

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Préstamos', href: '/prestamos', icon: CreditCard },
    { name: 'Finanzas', href: '/contabilidad', icon: Landmark },
    { name: 'Perfil', href: '/configuracion', icon: User },
  ];

  const secondaryItems = [
    ...(isSuperAdmin
      ? [
          { name: 'Super Administrador', href: '/superadmin', icon: ShieldAlert, badge: 'Maestro', isSpecial: true },
          { name: 'Auditoría del Sistema', href: '/auditoria', icon: ShieldCheck, badge: 'Seguridad' },
        ]
      : []),
    { name: 'Cuotas & Cobros', href: '/cuotas', icon: CalendarDays, badge: 'Día a día' },
    { name: 'Caja & Movimientos', href: '/caja', icon: Wallet, badge: 'Efectivo' },
    { name: 'Recibos & Comprobantes', href: '/recibos', icon: FileCheck, badge: 'PNG & WA' },
    { name: 'Historial de Pagos', href: '/pagos', icon: Receipt, badge: 'Recaudos' },
    { name: 'Reportes Financieros', href: '/reportes', icon: FileBarChart, badge: 'PDF / Excel' },
  ];

  return (
    <>
      {/* Barra de Navegación Inferior (Dock Nativo PWA) */}
      <nav
        aria-label="Navegación Móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0F]/95 backdrop-blur-2xl border-t border-[#221D33] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-4px_25px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
                  isActive ? 'text-[#E5092F]' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-2 w-6 h-1 rounded-full bg-gradient-to-r from-[#E5092F] to-[#8B5CF6] shadow-[0_0_10px_#8B5CF6]" />
                )}
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-[#E5092F]/10' : ''
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-[#E5092F] stroke-[2.4px]' : 'text-neutral-400 stroke-[1.8px]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight ${
                    isActive ? 'font-bold text-white' : 'font-medium text-neutral-400'
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Botón Más (Menú hamburguesa rápido) */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Más opciones"
            className="relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-neutral-400 hover:text-neutral-200 active:scale-95 transition-all"
          >
            <div className="p-1 rounded-xl hover:bg-neutral-800/50">
              <Menu className="w-5 h-5 stroke-[1.8px] text-neutral-400" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium text-neutral-400 tracking-tight">Más</span>
          </button>
        </div>
      </nav>

      {/* Drawer Móvil Lateral de Opciones Adicionales */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop con blur */}
          <div
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
          />

          {/* Contenido del Drawer Bottom Sheet */}
          <div className="relative w-full bg-[#121118] border-t border-[#2D2545] rounded-t-3xl shadow-2xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto overscroll-contain touch-scroll text-neutral-100 animate-in slide-in-from-bottom duration-300">
            {/* Tirador del Bottom Sheet */}
            <div className="w-12 h-1.5 bg-neutral-700/60 rounded-full mx-auto mb-4" />

            {/* Header del Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-[#221D33] mb-4">
              <FintechLogo size="sm" showSubtitle />
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Módulos */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-[#8B5CF6] tracking-wider px-2 mb-2">
                Módulos del Negocio
              </p>
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#E5092F]/20 to-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-white'
                        : 'bg-neutral-900/40 hover:bg-neutral-900 border border-transparent text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive
                            ? 'bg-[#E5092F] text-white shadow-md'
                            : 'bg-[#1C1A29] text-[#8B5CF6]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-[11px] text-neutral-400">{item.badge}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500" />
                  </Link>
                );
              })}
            </div>

            {/* Botón de Cerrar Sesión */}
            <div className="pt-4 mt-4 border-t border-[#221D33]">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-900/80 hover:bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-300 font-semibold text-xs transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
