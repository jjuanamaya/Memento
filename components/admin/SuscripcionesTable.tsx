"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EstadoSuscripcion } from "@/lib/types";
import { ETIQUETA_ESTADO_SUSCRIPCION } from "@/lib/types";

export interface SuscripcionAdminRow {
  id: string;
  cliente: string;
  cajaNombre: string;
  frecuenciaDias: number;
  proximaEntrega: string | null;
  estado: EstadoSuscripcion;
  tematicas: string[];
}

const ESTILO_ESTADO: Record<EstadoSuscripcion, string> = {
  activa: "bg-emerald-500/15 text-emerald-400",
  pausada: "bg-brand/15 text-brand",
  cancelada: "bg-red-500/15 text-red-400",
};

export function SuscripcionesTable({ suscripcionesIniciales }: { suscripcionesIniciales: SuscripcionAdminRow[] }) {
  const suscripciones = suscripcionesIniciales;
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; esError: boolean } | null>(null);

  async function generarPedido(id: string) {
    setProcesando(id);
    setMensaje(null);

    const supabase = createClient();
    const { data: pedidoId, error } = await supabase.rpc("generar_pedido_suscripcion", {
      p_suscripcion_id: id,
    });

    setProcesando(null);

    if (error || !pedidoId) {
      setMensaje({ id, texto: error?.message || "No se pudo generar el pedido.", esError: true });
      return;
    }

    setMensaje({ id, texto: `Pedido #${pedidoId.slice(0, 8)} creado.`, esError: false });
  }

  if (suscripciones.length === 0) {
    return <p className="mt-6 text-sm text-muted">Todavía no hay suscripciones.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Caja</th>
            <th className="px-4 py-3">Temáticas</th>
            <th className="px-4 py-3">Frecuencia</th>
            <th className="px-4 py-3">Próxima entrega</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {suscripciones.map((s) => (
            <tr key={s.id} className="border-t border-border align-top">
              <td className="px-4 py-3">{s.cliente}</td>
              <td className="px-4 py-3">{s.cajaNombre}</td>
              <td className="px-4 py-3 text-muted">{s.tematicas.join(", ")}</td>
              <td className="px-4 py-3 text-muted">cada {s.frecuenciaDias} días</td>
              <td className="px-4 py-3 text-muted">
                {s.proximaEntrega ? new Date(s.proximaEntrega).toLocaleDateString("es-AR") : "—"}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILO_ESTADO[s.estado]}`}>
                  {ETIQUETA_ESTADO_SUSCRIPCION[s.estado]}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  disabled={s.estado !== "activa" || procesando === s.id}
                  onClick={() => generarPedido(s.id)}
                  className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand/40 disabled:pointer-events-none disabled:opacity-40"
                >
                  {procesando === s.id ? "Generando..." : "Generar pedido"}
                </button>
                {mensaje?.id === s.id && (
                  <p className={`mt-1 text-xs ${mensaje.esError ? "text-red-400" : "text-emerald-400"}`}>
                    {mensaje.texto}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
