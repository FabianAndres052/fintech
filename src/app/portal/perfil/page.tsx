'use client';

import React, { useState, useEffect } from 'react';

export default function PortalPerfilPage() {
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutKeyType, setPayoutKeyType] = useState('CELULAR');
  const [payoutKeyValue, setPayoutKeyValue] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetch('/api/portal/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.client) {
          setClient(d.client);
          setPhone(d.client.phone || '');
          setEmail(d.client.email || '');
          setAddress(d.client.address || '');
          setCity(d.client.city || '');
          setPayoutBank(d.client.payout_bank || 'Bancolombia');
          setPayoutKeyType(d.client.payout_key_type || 'CELULAR');
          setPayoutKeyValue(d.client.payout_key_value || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ text: 'La nueva contraseña y su confirmación no coinciden.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          email,
          address,
          city,
          payout_bank: payoutBank,
          payout_key_type: payoutKeyType,
          payout_key_value: payoutKeyValue,
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');

      setMessage({ text: data.message || 'Perfil actualizado exitosamente.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al guardar cambios.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Mi Perfil</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Gestiona tus datos de contacto, cuenta bancaria para desembolsos y seguridad de acceso.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border border-red-800 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Datos Personales (Solo lectura nombre / documento) */}
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <h3 className="text-xs font-extrabold text-[#A78BFA] uppercase tracking-wider flex items-center gap-2">
            <span>👤</span> Información Personal
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Nombre Completo</label>
              <input
                type="text"
                disabled
                value={`${client?.first_name || ''} ${client?.last_name || ''}`.trim()}
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white font-bold opacity-80 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Documento de Identidad</label>
              <input
                type="text"
                disabled
                value={client?.document_number ? `${client.document_type || 'CC'} ${client.document_number}` : 'Sin C.C.'}
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white font-bold opacity-80 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Número de Teléfono / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Dirección de Residencia</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle / Carrera #..."
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Ciudad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Bogotá, Medellín..."
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Datos de Recepción de Transferencias / Desembolsos */}
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <span>🏦</span> Cuenta para Desembolsos y Transferencias Bre-B
            </h3>
            <span className="text-[10px] text-neutral-400">Verificada para transferencias</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Banco o Entidad</label>
              <input
                type="text"
                value={payoutBank}
                onChange={(e) => setPayoutBank(e.target.value)}
                placeholder="Ej: Bancolombia, Nequi..."
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Tipo de Llave / Cuenta</label>
              <select
                value={payoutKeyType}
                onChange={(e) => setPayoutKeyType(e.target.value)}
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="CELULAR">Llave Celular Bre-B</option>
                <option value="CEDULA">Llave Cédula Bre-B</option>
                <option value="EMAIL">Llave Correo Bre-B</option>
                <option value="CUENTA_AHORROS">Cuenta de Ahorros</option>
                <option value="CUENTA_CORRIENTE">Cuenta Corriente</option>
                <option value="ALFANUMERICO">Alfanumérico Bre-B</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Número de Cuenta o Llave</label>
              <input
                type="text"
                value={payoutKeyValue}
                onChange={(e) => setPayoutKeyValue(e.target.value)}
                placeholder="Ej: 3152076489 o 123456789"
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>
          <p className="text-[11px] text-neutral-400">
            A esta cuenta o llave Bre-B se transferirá el dinero de tus préstamos aprobados una vez aceptes las condiciones.
          </p>
        </div>

        {/* Card 3: Seguridad y Cambio de Contraseña */}
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <h3 className="text-xs font-extrabold text-[#E5092F] uppercase tracking-wider flex items-center gap-2">
            <span>🔒</span> Seguridad de Acceso
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Contraseña Actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Nueva Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir nueva contraseña"
                className="w-full bg-[#181527] border border-[#26213A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#9D76F8] hover:to-[#8B5CF6] active:scale-[0.98] text-white font-black text-xs transition-all shadow-xl shadow-purple-950/60 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Guardando Cambios...' : 'Guardar Datos del Perfil'}
          </button>
        </div>
      </form>
    </div>
  );
}

