'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface ClientUser {
  id: number;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  document_type?: string;
  document_number?: string | null;
  phone?: string | null;
  email?: string | null;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [client, setClient] = useState<ClientUser | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on login page, render children directly without sidebar
  const isLoginPage = pathname === '/portal/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const fetchMe = async () => {
      try {
        const res = await fetch('/api/portal/auth/me');
        if (!res.ok) {
          router.push('/portal/login');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.client) {
          const c = data.client;
          setClient({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            full_name: `${c.first_name} ${c.last_name || ''}`.trim(),
            document_type: c.document_type || 'CC',
            document_number: c.document_number,
            phone: c.phone,
            email: c.email,
          });

          // Fetch unread notifications count
          fetch('/api/portal/notifications')
            .then((r) => r.json())
            .then((d) => {
              if (d.notifications) {
                const unread = d.notifications.filter((n: any) => !n.is_read).length;
                setUnreadCount(unread);
              }
            })
            .catch(() => {});
        } else {
          router.push('/portal/login');
        }
      } catch {
        router.push('/portal/login');
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/portal/login');
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-xs text-neutral-400 font-medium">Cargando Portal FINTECH...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      label: 'Inicio',
      href: '/portal',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Mis Créditos',
      href: '/portal/creditos',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Pagar Cuota',
      href: '/portal/pagar',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Abonar',
      href: '/portal/abonar',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      label: 'Solicitar Préstamo',
      href: '/portal/solicitar',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: 'Mis Pagos',
      href: '/portal/pagos',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: 'Mis Recibos',
      href: '/portal/recibos',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Notificaciones',
      href: '/portal/notificaciones',
      badge: unreadCount > 0 ? unreadCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      label: 'Mi Perfil',
      href: '/portal/perfil',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'CL';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col lg:flex-row font-sans selection:bg-[#8B5CF6]/30">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0E0C17] border-r border-[#221D33] p-5 shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-900/40">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block leading-none">FINTECH</span>
            <span className="text-[9px] font-semibold text-[#E5092F] uppercase tracking-wider block mt-0.5">
              Tu aliado financiero
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-lg shadow-purple-950/60 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-[#1A162B]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-neutral-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#E5092F] text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-red-400 hover:bg-red-950/20 transition-all text-left mt-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </nav>

        {/* Bottom Banner "Crece con nosotros" */}
        <div className="mt-6 p-4 rounded-3xl bg-gradient-to-br from-[#1C1635] via-[#2D1B4E] to-[#E5092F]/20 border border-[#4C2882]/50 text-center relative overflow-hidden shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/10 mx-auto flex items-center justify-center mb-2.5 text-white">
            <svg className="w-5 h-5 text-[#A78BFA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="text-xs font-extrabold text-white">Crece con nosotros</h4>
          <p className="text-[10px] text-neutral-300 mt-0.5 mb-2.5 leading-snug">
            Solicita tu próximo préstamo en segundos
          </p>
          <Link
            href="/portal/solicitar"
            className="inline-block w-full py-2 px-3 rounded-xl bg-white text-[#1C1635] text-[11px] font-bold hover:bg-neutral-100 active:scale-95 transition-all shadow-md"
          >
            Solicitar Ahora
          </Link>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden bg-[#0E0C17] border-b border-[#221D33] p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#1A162B] text-neutral-300 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-xs">
              F
            </div>
            <span className="font-extrabold text-sm text-white">FINTECH</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/portal/notificaciones" className="relative p-2 rounded-xl bg-[#1A162B] text-neutral-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#E5092F]" />
            )}
          </Link>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white text-xs font-bold shadow-md">
            {getInitials(client?.full_name)}
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/70 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0E0C17] h-full p-5 flex flex-col justify-between border-r border-[#221D33] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-xs">
                    F
                  </div>
                  <span className="font-extrabold text-base text-white">FINTECH</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold ${
                      pathname === item.href ? 'bg-[#8B5CF6] text-white font-bold' : 'text-neutral-400 hover:bg-[#1A162B]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#E5092F] text-white text-[10px] font-bold">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-red-400 hover:bg-red-950/20"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* DESKTOP TOP HEADER */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-[#1C182B] bg-[#0B0B0F]/90 backdrop-blur-md sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              ¡Hola, {client?.first_name || 'Cliente'}!
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Aquí encontrarás toda tu información financiera al día.
            </p>
          </div>

          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <Link
              href="/portal/notificaciones"
              className="relative p-2.5 rounded-2xl bg-[#141221] hover:bg-[#1E1B31] border border-[#26213A] text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E5092F] text-white text-[10px] font-black flex items-center justify-center border-2 border-[#0B0B0F] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* User Profile Pill */}
            <Link
              href="/portal/perfil"
              className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-[#141221] hover:bg-[#1E1B31] border border-[#26213A] transition-all cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white text-xs font-black shadow-md shadow-purple-900/40">
                {getInitials(client?.full_name)}
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold text-white leading-none">{client?.full_name || 'Carlos Rueda'}</p>
                <p className="text-[10px] text-neutral-400 mt-1 leading-none">
                  {client?.document_number ? `CC. ${client.document_number}` : 'CC. Sin C.C.'}
                </p>
              </div>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
