'use client';

import React, { useState, useEffect } from 'react';
import ReceiptModal from '@/components/ReceiptModal';

export default function PortalRecibosPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/portal/receipts')
      .then((res) => res.json())
      .then((data) => {
        if (data.receipts) setReceipts(data.receipts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const filtered = receipts.filter((r) => {
    const term = search.toLowerCase();
    const codeMatch = r.receipt_code && r.receipt_code.toLowerCase().includes(term);
    const notesMatch = r.notes && r.notes.toLowerCase().includes(term);
    return codeMatch || notesMatch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-3" />
        <p className="text-xs">Cargando tus recibos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Mis Recibos</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Consulta, visualiza, descarga en PNG y comparte por WhatsApp todos tus comprobantes de pago oficiales.
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número de recibo..."
          className="bg-[#13111E] border border-[#26213A] rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B5CF6] w-full sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#13111E] border border-[#231E33] rounded-3xl p-10 text-center text-neutral-400">
          <p className="text-xs">No tienes comprobantes de recibo disponibles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const isConsolidated = r.is_consolidated === 1 || r.receipt_type === 'CONSOLIDADO';
            return (
              <div
                key={r.id}
                className="bg-[#13111E] border border-[#231E33] rounded-3xl p-5 hover:border-[#8B5CF6]/50 transition-all shadow-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-black text-[#A78BFA]">
                      {r.receipt_code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        isConsolidated
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isConsolidated ? 'Consolidado' : 'Individual'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-neutral-400">
                      Fecha: <strong className="text-white">{formatDate(r.receipt_date)}</strong>
                    </p>
                    <p className="text-neutral-400">
                      Valor Recibido: <strong className="text-emerald-400 font-black text-sm">{formatCOP(r.total_amount)}</strong>
                    </p>
                    {r.notes && (
                      <p className="text-[11px] text-neutral-300 line-clamp-2">{r.notes}</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#231E33] flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReceipt(r)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-bold transition-all text-center shadow-md shadow-purple-950/60 cursor-pointer"
                  >
                    Ver Ticket PNG
                  </button>
                  <a
                    href={`https://wa.me/573152076489?text=Hola,%20adjunto%20el%20recibo%20${r.receipt_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] transition-colors"
                    title="Compartir por WhatsApp"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                    </svg>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReceipt && (
        <ReceiptModal
          isOpen={Boolean(selectedReceipt)}
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
