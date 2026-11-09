'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function AdminSolicitudesPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('TODOS');

  // Modals
  const [reviewModalApp, setReviewModalApp] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APROBAR' | 'RECHAZAR'>('APROBAR');
  const [approvedCapital, setApprovedCapital] = useState('');
  const [interestRate, setInterestRate] = useState('20');
  const [approvedInstallments, setApprovedInstallments] = useState('');
  const [approvedPeriodicity, setApprovedPeriodicity] = useState('SEMANAL');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Disbursement modal
  const [disburseModalApp, setDisburseModalApp] = useState<any | null>(null);
  const [disburseMethod, setDisburseMethod] = useState<'TRANSFERENCIA' | 'EFECTIVO'>('TRANSFERENCIA');
  const [disburseBank, setDisburseBank] = useState('');
  const [disburseKeyType, setDisburseKeyType] = useState('CELULAR');
  const [disburseKeyValue, setDisburseKeyValue] = useState('');
  const [disburseRef, setDisburseRef] = useState('');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [processingDisbursement, setProcessingDisbursement] = useState(false);

  // Chat Drawer
  const [chatApp, setChatApp] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const fetchApplications = () => {
    fetch(`/api/applications?status=${filterStatus}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.applications) setApplications(d.applications);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  // Chat polling
  useEffect(() => {
    if (!chatApp) return;
    const fetchMsgs = () => {
      fetch(`/api/portal/messages?applicationId=${chatApp.id}&clientId=${chatApp.client_id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.messages) setMessages(d.messages);
        })
        .catch(console.error);
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 4000);
    return () => clearInterval(interval);
  }, [chatApp]);

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !chatApp) return;
    setSendingMsg(true);

    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: chatApp.id,
          client_id: chatApp.client_id,
          message: newMsg.trim(),
        }),
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalApp) return;
    setProcessingReview(true);

    try {
      const res = await fetch(`/api/applications/${reviewModalApp.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          approved_capital: parseFloat(approvedCapital.replace(/\D/g, '')) || reviewModalApp.requested_amount,
          approved_interest_rate: parseFloat(interestRate) || 20,
          approved_installments: parseInt(approvedInstallments) || reviewModalApp.requested_installments,
          approved_periodicity: approvedPeriodicity,
          rejection_reason: rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar solicitud');

      setReviewModalApp(null);
      fetchApplications();
    } catch (err: any) {
      alert(err.message || 'Error en revisión.');
    } finally {
      setProcessingReview(false);
    }
  };

  const handleDisbursementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseModalApp) return;
    setProcessingDisbursement(true);

    try {
      const res = await fetch(`/api/applications/${disburseModalApp.id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disbursement_method: disburseMethod,
          disbursement_bank: disburseBank,
          disbursement_key_type: disburseKeyType,
          disbursement_key_value: disburseKeyValue,
          disbursement_reference: disburseRef,
          disbursement_notes: disburseNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desembolsar');

      alert(`¡Desembolso ejecutado con éxito! Se activó el crédito ${data.loanCode}.`);
      setDisburseModalApp(null);
      fetchApplications();
    } catch (err: any) {
      alert(err.message || 'Error en desembolso.');
    } finally {
      setProcessingDisbursement(false);
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

  return (
    <div className="flex h-screen bg-[#0B0B0F] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Solicitudes de Préstamo"
          subtitle="Gestión de solicitudes del portal de clientes"
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Solicitudes de Préstamo (Portal Clientes)
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Revisa solicitudes, aprueba ofertas, chatea con solicitantes y ejecuta desembolsos directos.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-[#13111E] border border-[#231E33] rounded-2xl">
              {['TODOS', 'EN_REVISION', 'APROBADA', 'CONDICIONES_ACEPTADAS', 'DESEMBOLSADO', 'RECHAZADA'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    filterStatus === st
                      ? 'bg-[#8B5CF6] text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {st === 'TODOS'
                    ? 'Todos'
                    : st === 'EN_REVISION'
                    ? 'En Revisión'
                    : st === 'CONDICIONES_ACEPTADAS'
                    ? 'Aceptadas'
                    : st}
                </button>
              ))}
            </div>
          </div>

          {/* Applications Table / Cards */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
              <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
              <p className="text-xs">Cargando solicitudes...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-10 text-center text-neutral-400">
              <p className="text-xs">No hay solicitudes con el filtro seleccionado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const isUnderReview = app.status === 'EN_REVISION';
                const isApproved = app.status === 'APROBADA';
                const isAccepted = app.status === 'CONDICIONES_ACEPTADAS';
                const isDisbursed = app.status === 'DESEMBOLSADO';
                const isRejected = app.status === 'RECHAZADA';

                return (
                  <div
                    key={app.id}
                    className="bg-[#13111E] border border-[#231E33] rounded-3xl p-5 sm:p-6 hover:border-[#8B5CF6]/50 transition-all shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                            isUnderReview
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : isApproved
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              : isAccepted
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 animate-pulse'
                              : isDisbursed
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}
                        >
                          {app.status === 'EN_REVISION'
                            ? 'Pendiente de Revisión'
                            : app.status === 'CONDICIONES_ACEPTADAS'
                            ? '✓ Aceptada por Cliente — Lista para Desembolso'
                            : app.status}
                        </span>
                        <h3 className="text-base font-black text-white">{app.application_code}</h3>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        Fecha: {formatDate(app.created_at)}
                      </span>
                    </div>

                    {/* Applicant & Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#181527] p-4 rounded-2xl border border-[#26213A] text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">Cliente</span>
                        <strong className="text-sm text-white block">{app.client_name}</strong>
                        <span className="text-[10px] text-neutral-400">Tel: {app.client_phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">Monto Solicitado</span>
                        <strong className="text-sm text-emerald-400 block">{formatCOP(app.requested_amount)}</strong>
                        <span className="text-[10px] text-neutral-400">
                          {app.requested_installments} cuotas ({app.requested_periodicity})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">Destino</span>
                        <span className="text-xs text-neutral-300 block truncate">
                          {app.reason || 'Sin motivo especificado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">Cuenta Desembolso</span>
                        <span className="text-xs text-neutral-200 block">
                          {app.client_payout_bank || 'Bancolombia'} ({app.client_payout_key_type || 'CELULAR'})
                        </span>
                        <span className="text-[10px] text-purple-300 font-mono">
                          {app.client_payout_key_value || app.client_phone || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Approved Terms Summary if approved */}
                    {(isApproved || isAccepted || isDisbursed) && (
                      <div className="p-3.5 rounded-2xl bg-[#1A162B] border border-[#30284C] text-xs flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Oferta Aprobada</span>
                          <strong className="text-white text-xs">
                            {formatCOP(app.approved_capital)} a {app.approved_interest_rate}% ({app.approved_installments} cuotas de {formatCOP(app.approved_payment_per_installment)})
                          </strong>
                        </div>
                        {isDisbursed && (
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-400 font-bold block">Crédito Creado</span>
                            <span className="font-mono text-xs text-white">ID Préstamo #{app.loan_id}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#231E33]">
                      <button
                        onClick={() => setChatApp(app)}
                        className="py-1.5 px-3 rounded-xl bg-[#8B5CF6]/20 text-[#A78BFA] hover:bg-[#8B5CF6]/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>💬 Chatear con Cliente</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {isUnderReview && (
                          <>
                            <button
                              onClick={() => {
                                setReviewModalApp(app);
                                setActionType('RECHAZAR');
                                setRejectionReason('');
                              }}
                              className="py-2 px-4 rounded-xl border border-red-800 text-red-400 hover:bg-red-950/40 text-xs font-bold transition-all cursor-pointer"
                            >
                              ✕ Rechazar
                            </button>
                            <button
                              onClick={() => {
                                setReviewModalApp(app);
                                setActionType('APROBAR');
                                setApprovedCapital(Number(app.requested_amount).toLocaleString('es-CO'));
                                setInterestRate('20');
                                setApprovedInstallments(String(app.requested_installments));
                                setApprovedPeriodicity(app.requested_periodicity || 'SEMANAL');
                              }}
                              className="py-2 px-5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-purple-950/60 cursor-pointer"
                            >
                              ✓ Evaluar y Aprobar
                            </button>
                          </>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => {
                              setDisburseModalApp(app);
                              setDisburseMethod('TRANSFERENCIA');
                              setDisburseBank(app.disbursement_bank || app.client_payout_bank || 'Bancolombia');
                              setDisburseKeyType(app.disbursement_key_type || app.client_payout_key_type || 'CELULAR');
                              setDisburseKeyValue(app.disbursement_key_value || app.client_payout_key_value || app.client_phone || '');
                              setDisburseRef(`TX-${Date.now().toString().slice(-6)}`);
                              setDisburseNotes('');
                            }}
                            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-950/60 transition-all cursor-pointer flex items-center gap-2"
                          >
                            <span>🏦 Ejecutar Desembolso Real</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MODAL: EVALUAR / APROBAR / RECHAZAR */}
      {reviewModalApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13111E] border border-[#29243E] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">
                {actionType === 'APROBAR' ? 'Aprobar Solicitud con Condiciones' : 'Rechazar Solicitud'}
              </h3>
              <button
                onClick={() => setReviewModalApp(null)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Solicitud <strong>{reviewModalApp.application_code}</strong> de{' '}
              <strong>{reviewModalApp.client_name}</strong>.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              {actionType === 'APROBAR' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-300 font-bold mb-1">Capital Aprobado ($ COP)</label>
                      <input
                        type="text"
                        required
                        value={approvedCapital}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setApprovedCapital(raw ? Number(raw).toLocaleString('es-CO') : '');
                        }}
                        className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-300 font-bold mb-1">Tasa de Interés (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-300 font-bold mb-1">Número de Cuotas</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={approvedInstallments}
                        onChange={(e) => setApprovedInstallments(e.target.value)}
                        className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-300 font-bold mb-1">Frecuencia</label>
                      <select
                        value={approvedPeriodicity}
                        onChange={(e) => setApprovedPeriodicity(e.target.value)}
                        className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="MENSUAL">Mensual</option>
                        <option value="LIBRE">Abono Libre</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Motivo del Rechazo</label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Indica el motivo para notificar al solicitante..."
                    className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl p-3 text-white"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalApp(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingReview}
                  className={`flex-1 py-2.5 rounded-xl font-black text-white shadow-lg ${
                    actionType === 'APROBAR' ? 'bg-[#8B5CF6] hover:bg-[#7C3AED]' : 'bg-[#E5092F] hover:bg-[#C40726]'
                  } disabled:opacity-50`}
                >
                  {processingReview ? 'Guardando...' : actionType === 'APROBAR' ? 'Aprobar Oferta' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EJECUTAR DESEMBOLSO REAL */}
      {disburseModalApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13111E] border border-[#29243E] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Ejecutar Desembolso de Préstamo</h3>
              <button
                onClick={() => setDisburseModalApp(null)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Desembolso de <strong>{formatCOP(disburseModalApp.approved_capital)}</strong> para{' '}
              <strong>{disburseModalApp.client_name}</strong>. Esta acción activará el crédito, generará las cuotas y registrará el egreso contable en la caja.
            </p>

            <form onSubmit={handleDisbursementSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Medio de Desembolso</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDisburseMethod('TRANSFERENCIA')}
                    className={`p-3 rounded-xl border font-bold text-center ${
                      disburseMethod === 'TRANSFERENCIA'
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                        : 'bg-[#181527] border-[#26213A] text-neutral-400'
                    }`}
                  >
                    Transferencia / Bre-B
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisburseMethod('EFECTIVO')}
                    className={`p-3 rounded-xl border font-bold text-center ${
                      disburseMethod === 'EFECTIVO'
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                        : 'bg-[#181527] border-[#26213A] text-neutral-400'
                    }`}
                  >
                    Entrega en Efectivo
                  </button>
                </div>
              </div>

              {disburseMethod === 'TRANSFERENCIA' && (
                <div className="space-y-3 bg-[#181527] p-3.5 rounded-2xl border border-[#26213A]">
                  <div>
                    <label className="block text-neutral-400 font-semibold mb-1">Banco / Entidad del Cliente</label>
                    <input
                      type="text"
                      value={disburseBank}
                      onChange={(e) => setDisburseBank(e.target.value)}
                      className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-400 font-semibold mb-1">Tipo de Llave</label>
                      <input
                        type="text"
                        value={disburseKeyType}
                        onChange={(e) => setDisburseKeyType(e.target.value)}
                        className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 font-semibold mb-1">Número Llave / Cuenta</label>
                      <input
                        type="text"
                        value={disburseKeyValue}
                        onChange={(e) => setDisburseKeyValue(e.target.value)}
                        className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-400 font-semibold mb-1">Número de Referencia de la Transferencia</label>
                    <input
                      type="text"
                      required
                      value={disburseRef}
                      onChange={(e) => setDisburseRef(e.target.value)}
                      placeholder="Ej: 00984521"
                      className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Notas / Observaciones del Desembolso</label>
                <input
                  type="text"
                  value={disburseNotes}
                  onChange={(e) => setDisburseNotes(e.target.value)}
                  placeholder="Ej: Desembolsado exitosamente vía Bre-B..."
                  className="w-full bg-[#1A172A] border border-[#2D2746] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDisburseModalApp(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingDisbursement}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-black text-white shadow-lg shadow-emerald-950/60 disabled:opacity-50"
                >
                  {processingDisbursement ? 'Desembolsando...' : 'Confirmar y Activar Crédito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: CHAT CON CLIENTE */}
      {chatApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#13111E] border-l border-[#26213A] h-full flex flex-col justify-between shadow-2xl">
            <div className="p-4 border-b border-[#231E33] flex items-center justify-between bg-[#181527]">
              <div>
                <h4 className="text-sm font-black text-white">Chat con {chatApp.client_name}</h4>
                <p className="text-[10px] text-neutral-400">Solicitud {chatApp.application_code}</p>
              </div>
              <button
                onClick={() => setChatApp(null)}
                className="p-2 text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-xs">
                  No hay mensajes registrados. Escribe para solicitar documentos o dar detalles al cliente.
                </div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender_type === 'ADMIN';
                  return (
                    <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] text-neutral-400 mb-1 px-1">
                        {isAdmin ? 'Tú (Admin)' : m.sender_name}
                      </span>
                      <div
                        className={`p-3 rounded-2xl max-w-[80%] text-xs ${
                          isAdmin
                            ? 'bg-[#8B5CF6] text-white rounded-tr-none'
                            : 'bg-[#1E1A31] border border-[#2D2746] text-neutral-200 rounded-tl-none'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendAdminMessage} className="p-3 border-t border-[#231E33] bg-[#181527] flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Escribe un mensaje al cliente..."
                className="flex-1 bg-[#13111E] border border-[#2D2746] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMsg.trim()}
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
