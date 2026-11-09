'use client';

import React, { useState, useEffect } from 'react';

export default function PortalSolicitarPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('12');
  const [periodicity, setPeriodicity] = useState('SEMANAL');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Acceptance modal
  const [acceptingApp, setAcceptingApp] = useState<any | null>(null);
  const [payoutBank, setPayoutBank] = useState('Bancolombia');
  const [payoutKeyType, setPayoutKeyType] = useState('CELULAR');
  const [payoutKeyValue, setPayoutKeyValue] = useState('');
  const [accepting, setAccepting] = useState(false);

  // Chat Drawer state
  const [activeChatApp, setActiveChatApp] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const fetchApplications = () => {
    fetch('/api/portal/applications')
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) setApplications(data.applications);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Poll chat messages if drawer is open
  useEffect(() => {
    if (!activeChatApp) return;

    const fetchMsgs = () => {
      fetch(`/api/portal/messages?applicationId=${activeChatApp.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.messages) setChatMessages(d.messages);
        })
        .catch(console.error);
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 4000);
    return () => clearInterval(interval);
  }, [activeChatApp]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatApp) return;
    setSendingMsg(true);

    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: activeChatApp.id,
          message: newMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setChatMessages((prev) => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const numAmount = parseFloat(amount.replace(/\D/g, ''));
    if (!numAmount || numAmount < 50000) {
      setFormError('El monto mínimo a solicitar es de $50.000 COP.');
      return;
    }
    const numInst = parseInt(installments);
    if (!numInst || numInst < 1) {
      setFormError('Ingresa un número de cuotas válido.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_amount: numAmount,
          requested_installments: numInst,
          requested_periodicity: periodicity,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar la solicitud');

      setShowModal(false);
      setAmount('');
      setReason('');
      fetchApplications();
    } catch (err: any) {
      setFormError(err.message || 'Error al enviar solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!acceptingApp) return;
    setAccepting(true);

    try {
      const res = await fetch(`/api/portal/applications/${acceptingApp.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_bank: payoutBank,
          payout_key_type: payoutKeyType,
          payout_key_value: payoutKeyValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al aceptar condiciones');

      setAcceptingApp(null);
      fetchApplications();
    } catch (err: any) {
      alert(err.message || 'Error al aceptar condiciones.');
    } finally {
      setAccepting(false);
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Solicitudes de Préstamo
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Solicita nuevos créditos, revisa ofertas aprobadas, chatea con tu asesor y acepta condiciones.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/60 cursor-pointer"
        >
          <span>+ Nueva Solicitud</span>
        </button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-2xl mb-3">
            📋
          </div>
          <h4 className="text-sm font-bold text-white">No tienes solicitudes registradas</h4>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Puedes solicitar un nuevo préstamo en cualquier momento haciendo clic en el botón superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {applications.map((app) => {
            const isApproved = app.status === 'APROBADA';
            const isAccepted = app.status === 'CONDICIONES_ACEPTADAS';
            const isDisbursed = app.status === 'DESEMBOLSADO';
            const isRejected = app.status === 'RECHAZADA';

            return (
              <div
                key={app.id}
                className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 hover:border-[#8B5CF6]/50 transition-all shadow-xl space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        isApproved
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : isAccepted
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : isDisbursed
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isRejected
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {app.status === 'EN_REVISION'
                        ? 'En Revisión'
                        : app.status === 'CONDICIONES_ACEPTADAS'
                        ? 'Condiciones Aceptadas'
                        : app.status}
                    </span>
                    <h3 className="text-base font-black text-white">{app.application_code}</h3>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    Fecha: {formatDate(app.created_at)}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#181527] p-4 rounded-2xl border border-[#26213A] text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                      Monto Solicitado
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      {formatCOP(app.requested_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                      Cuotas Solicitadas
                    </span>
                    <span className="text-sm font-bold text-neutral-200">
                      {app.requested_installments} ({app.requested_periodicity})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                      Motivo / Destino
                    </span>
                    <span className="text-xs text-neutral-300 truncate block">
                      {app.reason || 'Sin motivo especificado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                      Comunicación
                    </span>
                    <button
                      onClick={() => setActiveChatApp(app)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#8B5CF6]/20 text-[#A78BFA] hover:bg-[#8B5CF6]/30 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <span>💬 Chatear con Asesor</span>
                    </button>
                  </div>
                </div>

                {/* CONDICIONES APROBADAS POR EL ADMINISTRADOR */}
                {isApproved && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#181527] to-purple-950/40 border border-blue-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span>✨</span> Oferta Aprobada por FINTECH
                      </span>
                      <span className="text-[10px] text-blue-200 font-semibold">
                        Tasa: {app.approved_interest_rate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Capital a Desembolsar</span>
                        <strong className="text-sm text-white">{formatCOP(app.approved_capital)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Total a Pagar</span>
                        <strong className="text-sm text-emerald-400">{formatCOP(app.approved_total_amount)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Plazo y Frecuencia</span>
                        <strong className="text-sm text-white">
                          {app.approved_installments} cuotas {app.approved_periodicity?.toLowerCase()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Valor por Cuota</span>
                        <strong className="text-sm text-white">
                          {formatCOP(app.approved_payment_per_installment)}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-500/20">
                      <p className="text-[11px] text-neutral-300">
                        Para recibir el desembolso en tu cuenta, debes aceptar las condiciones.
                      </p>
                      <button
                        onClick={() => {
                          setAcceptingApp(app);
                          setPayoutBank(app.disbursement_bank || 'Bancolombia');
                          setPayoutKeyType(app.disbursement_key_type || 'CELULAR');
                          setPayoutKeyValue(app.disbursement_key_value || '');
                        }}
                        className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
                      >
                        ✓ Aceptar Condiciones
                      </button>
                    </div>
                  </div>
                )}

                {/* CONDICIONES YA ACEPTADAS */}
                {isAccepted && (
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between text-xs text-purple-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⏳</span>
                      <span>
                        Has aceptado las condiciones. El administrador está verificando los datos de desembolso para realizar la transferencia o entrega.
                      </span>
                    </div>
                  </div>
                )}

                {/* YA DESEMBOLSADO */}
                {isDisbursed && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎉</span>
                      <span>
                        ¡Crédito desembolsado exitosamente! Ya se encuentra activo y visible en la sección <strong>Mis Créditos</strong>.
                      </span>
                    </div>
                  </div>
                )}

                {/* RECHAZADA */}
                {isRejected && (
                  <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-200">
                    <strong>Motivo del rechazo:</strong> {app.rejection_reason || 'No cumple con las políticas actuales.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NUEVA SOLICITUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13111E] border border-[#29243E] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Solicitar Nuevo Préstamo</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateApplication} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Monto Solicitado ($ COP)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setAmount(raw ? Number(raw).toLocaleString('es-CO') : '');
                    }}
                    placeholder="Ej: 1.000.000"
                    className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Número de Cuotas</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Frecuencia</label>
                  <select
                    value={periodicity}
                    onChange={(e) => setPeriodicity(e.target.value)}
                    className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="SEMANAL">Semanal</option>
                    <option value="QUINCENAL">Quincenal</option>
                    <option value="MENSUAL">Mensual</option>
                    <option value="LIBRE">Abono Libre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Motivo / Destino (Opcional)</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Capital de trabajo, inversión personal, emergencias..."
                  className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold shadow-lg shadow-purple-950/60 disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACEPTAR CONDICIONES Y CONFIRMAR DATOS DE DESEMBOLSO */}
      {acceptingApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13111E] border border-[#29243E] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Aceptar Oferta de Préstamo</h3>
              <button
                onClick={() => setAcceptingApp(null)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Estás aceptando el crédito por <strong>{formatCOP(acceptingApp.approved_capital)}</strong> en{' '}
              <strong>{acceptingApp.approved_installments}</strong> cuotas de{' '}
              <strong>{formatCOP(acceptingApp.approved_payment_per_installment)}</strong>. Confirma la cuenta o llave Bre-B donde deseas recibir el desembolso:
            </p>

            <div className="space-y-3 text-xs bg-[#181527] p-4 rounded-2xl border border-[#26213A]">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Entidad Financiera / Banco</label>
                <input
                  type="text"
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                  placeholder="Ej: Bancolombia, Nequi, Davivienda..."
                  className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Tipo de Llave Bre-B o Cuenta</label>
                  <select
                    value={payoutKeyType}
                    onChange={(e) => setPayoutKeyType(e.target.value)}
                    className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="CELULAR">Llave Celular</option>
                    <option value="CEDULA">Llave Cédula</option>
                    <option value="EMAIL">Llave Correo</option>
                    <option value="CUENTA_AHORROS">Cuenta de Ahorros</option>
                    <option value="CUENTA_CORRIENTE">Cuenta Corriente</option>
                    <option value="ALFANUMERICO">Alfanumérico Bre-B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Número de Cuenta o Llave</label>
                  <input
                    type="text"
                    value={payoutKeyValue}
                    onChange={(e) => setPayoutKeyValue(e.target.value)}
                    placeholder="Ej: 3152076489 o 123456789"
                    className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setAcceptingApp(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800 text-xs"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleAcceptTerms}
                disabled={accepting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/60 disabled:opacity-50"
              >
                {accepting ? 'Confirmando...' : 'Confirmar y Aceptar Oferta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT / MESSAGING DRAWER */}
      {activeChatApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#13111E] border-l border-[#26213A] h-full flex flex-col justify-between shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#231E33] flex items-center justify-between bg-[#181527]">
              <div>
                <h4 className="text-sm font-black text-white">
                  Chat Solicitud {activeChatApp.application_code}
                </h4>
                <p className="text-[10px] text-neutral-400">Comunicación directa con tu asesor FINTECH</p>
              </div>
              <button
                onClick={() => setActiveChatApp(null)}
                className="p-2 text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-xs">
                  No hay mensajes previos. Escribe cualquier duda o requerimiento sobre esta solicitud.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.sender_type === 'CLIENT';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] text-neutral-400 mb-1 px-1">{msg.sender_name}</span>
                      <div
                        className={`p-3 rounded-2xl max-w-[80%] text-xs ${
                          isMe
                            ? 'bg-[#8B5CF6] text-white rounded-tr-none'
                            : 'bg-[#1E1A31] border border-[#2D2746] text-neutral-200 rounded-tl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[#231E33] bg-[#181527] flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-[#13111E] border border-[#2D2746] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMessage.trim()}
                className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

