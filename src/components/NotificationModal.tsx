'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  X,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  Calendar,
  CheckCheck,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatDate } from '@/lib/calculations';

interface NotificationItem {
  id: string;
  type: 'login' | 'payment' | 'overdue' | 'upcoming' | 'info';
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function NotificationModal({
  isOpen,
  onClose,
  onUnreadChange,
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'login' | 'payment' | 'alertas'>('todas');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        if (onUnreadChange) {
          onUnreadChange(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (onUnreadChange) {
      onUnreadChange(0);
    }
  };

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'login') return n.type === 'login';
    if (filter === 'payment') return n.type === 'payment';
    if (filter === 'alertas') return n.type === 'overdue' || n.type === 'upcoming';
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'login':
        return {
          icon: ShieldCheck,
          color: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
        };
      case 'payment':
        return {
          icon: Receipt,
          color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
        };
      case 'overdue':
        return {
          icon: AlertTriangle,
          color: 'text-[#E5092F] bg-red-950/40 border-red-500/30',
        };
      case 'upcoming':
        return {
          icon: Calendar,
          color: 'text-[#A78BFA] bg-purple-950/40 border-purple-500/30',
        };
      default:
        return {
          icon: Info,
          color: 'text-neutral-300 bg-neutral-800 border-neutral-700',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md overflow-hidden p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-[#0E0D14] border-t sm:border border-[#2D2545] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] text-neutral-100 overflow-hidden">
        {/* Header Fijo */}
        <div className="shrink-0 px-5 py-4 border-b border-[#221D33] bg-[#0E0D14]/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5092F] to-[#8B5CF6] flex items-center justify-center text-white font-bold shadow-md shadow-purple-950/40">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Centro de Notificaciones</h3>
                {notifications.some((n) => n.unread) && (
                  <span className="w-2 h-2 rounded-full bg-[#E5092F] animate-pulse" />
                )}
              </div>
              <p className="text-[11px] text-neutral-400">Actividad del negocio, alertas y accesos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtros Rápidos */}
        <div className="shrink-0 px-5 pt-3 pb-2 border-b border-[#221D33] flex items-center justify-between gap-2 overflow-x-auto touch-scroll">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'login', label: 'Inicios de Sesión' },
              { id: 'payment', label: 'Recaudos' },
              { id: 'alertas', label: 'Vencimientos' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === t.id
                    ? 'bg-[#1C1A29] text-white border border-[#8B5CF6]/50 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleMarkAllRead}
            className="text-[11px] text-[#A78BFA] hover:text-white flex items-center gap-1 whitespace-nowrap font-medium"
            title="Marcar todas como leídas"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leídas</span>
          </button>
        </div>

        {/* Lista con Scroll */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-2.5 touch-scroll">
          {loading ? (
            <div className="p-10 text-center text-xs text-neutral-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#8B5CF6]/20 border-t-[#E5092F] rounded-full animate-spin" />
              <span>Cargando notificaciones...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <Bell className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Sin notificaciones</p>
              <p className="text-xs text-neutral-500">No hay eventos recientes en este criterio.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const { icon: Icon, color } = getNotificationIcon(item.type);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    item.unread
                      ? 'bg-[#161322] border-[#8B5CF6]/40 shadow-sm'
                      : 'bg-[#121118] border-[#2D2545]/70'
                  } flex items-start gap-3`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{item.title}</h4>
                      {item.unread && (
                        <span className="w-2 h-2 rounded-full bg-[#E5092F] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{item.message}</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-neutral-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(item.time)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Fijo */}
        <div className="shrink-0 p-3.5 border-t border-[#221D33] bg-[#0E0D14]/98 pb-[max(0.8rem,env(safe-area-inset-bottom))] text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#181622] hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            Cerrar Notificaciones
          </button>
        </div>
      </div>
    </div>
  );
}

