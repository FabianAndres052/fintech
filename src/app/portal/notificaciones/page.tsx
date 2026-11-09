'use client';

import React, { useState, useEffect } from 'react';

export default function PortalNotificacionesPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<'NOTIFICACIONES' | 'CHAT'>('NOTIFICACIONES');

  const fetchNotifs = () => {
    fetch('/api/portal/notifications')
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) setNotifications(d.notifications);
      })
      .catch(console.error);
  };

  const fetchChat = () => {
    fetch('/api/portal/messages')
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) setMessages(d.messages);
      })
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([fetchNotifs(), fetchChat()]).finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchNotifs();
      fetchChat();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/portal/notifications', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSendingMsg(true);

    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsg.trim() }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setNewMsg('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando centro de comunicación...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Centro de Notificaciones y Chat</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Recibe avisos de tus cuotas, pagos y comunícate en tiempo real con el administrador.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-[#13111E] border border-[#231E33] rounded-2xl">
          <button
            onClick={() => setActiveTab('NOTIFICACIONES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'NOTIFICACIONES'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Notificaciones {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CHAT'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Chat con Asesor 💬
          </button>
        </div>
      </div>

      {/* TAB 1: NOTIFICACIONES */}
      {activeTab === 'NOTIFICACIONES' && (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#231E33] pb-4">
            <span className="text-xs font-bold text-neutral-300">
              {notifications.length} notificaciones registradas
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#8B5CF6] hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">No tienes notificaciones en tu bandeja.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const isUnread = !n.is_read;
                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnread
                        ? 'bg-[#181527] border-[#8B5CF6]/50 shadow-md'
                        : 'bg-[#151221] border-[#221D33] opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {isUnread && <div className="w-2 h-2 rounded-full bg-[#E5092F]" />}
                        <h4 className="font-extrabold text-white text-xs">{n.title}</h4>
                      </div>
                      <span className="text-[10px] text-neutral-400">{formatDate(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">{n.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHAT CON ASESOR */}
      {activeTab === 'CHAT' && (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
          {/* Chat Header */}
          <div className="p-4 bg-[#181527] border-b border-[#231E33] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#E5092F] flex items-center justify-center text-white font-bold text-xs">
                🎧
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Soporte y Asesor FINTECH</h4>
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En línea
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/573152076489"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded-xl bg-[#25D366]/20 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/30 transition-colors"
            >
              Abrir WhatsApp ↗
            </a>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs">
                Inicia una conversación con tu asesor. Te responderemos en breve.
              </div>
            ) : (
              messages.map((m) => {
                const isClient = m.sender_type === 'CLIENT';
                return (
                  <div key={m.id} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-neutral-400 mb-1 px-1">
                      {isClient ? 'Tú' : m.sender_name} · {formatDate(m.created_at)}
                    </span>
                    <div
                      className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                        isClient
                          ? 'bg-[#8B5CF6] text-white rounded-tr-none shadow-md'
                          : 'bg-[#181527] border border-[#2D2746] text-neutral-200 rounded-tl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#181527] border-t border-[#231E33] flex gap-2">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Escribe tu mensaje o consulta al asesor..."
              className="flex-1 bg-[#13111E] border border-[#2D2746] rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
            />
            <button
              type="submit"
              disabled={sendingMsg || !newMsg.trim()}
              className="px-5 py-2.5 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-950/60 disabled:opacity-50"
            >
              {sendingMsg ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
