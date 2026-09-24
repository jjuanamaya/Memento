"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EstadoSuscripcion, Suscripcion } from "@/lib/types";
import { ETIQUETA_ESTADO_SUSCRIPCION } from "@/lib/types";

const ESTILO_ESTADO: Record<EstadoSuscripcion, string> = {
  activa: "bg-emerald-500/15 text-emerald-400",
  pausada: "bg-brand/15 text-brand",
  cancelada: "bg-red-500/15 text-red-400",
};

const FRECUENCIA_LABEL: Record<number, string> = {
  7: "Cada semana",
  15: "Cada 15 días",
  30: "Cada mes",
};

export function SuscripcionesList({ suscripcionesIniciales }: { suscripcionesIniciales: Suscripcion[] }) {
  const [suscripciones, setSuscripciones] = useState(suscripcionesIniciales);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function cambiarEstado(id: string, estado: EstadoSuscripcion) {
    setGuardando(id);
    setError("");

    const supabase = createClient();
    const { error: errorUpdate } = await supabase.from("suscripciones").update({ estado }).eq("id", id);

    setGuardando(null);

    if (errorUpdate) {
      setError("No pudimos actualizar la suscripción. Probá de nuevo.");
      return;
    }

    setSuscripciones((prev) => prev.map((s) => (s.id === id ? { ...s, estado } : s)));
  }

  if (suscripciones.length === 0) {
    return (
      <div className="animate-fade-in-up mt-8 rounded-2xl border border-muted/30 bg-surface p-8 text-center">
        <span className="text-3xl">🎁</span>
        <p className="mt-3 font-medium">Todavía no tenés ninguna suscripción.</p>
        <p className="mt-1 text-sm text-muted">Elegí tus temáticas favoritas y dejá que la sorpresa llegue sola.</p>
        <a
          href="/suscribirse"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
        >
          Suscribirme
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {suscripciones.map((s, i) => (
        <div
          key={s.id}
          style={{ animationDelay: `${i * 60}ms` }}
          className="animate-fade-in-up rounded-xl border border-muted/20 p-4 transition-all duration-300 hover:border-brand/30"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium">{s.cajaNombre}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILO_ESTADO[s.estado]}`}>
              {ETIQUETA_ESTADO_SUSCRIPCION[s.estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{FRECUENCIA_LABEL[s.frecuenciaDias] ?? `Cada ${s.frecuenciaDias} días`} · ${s.cajaPrecio}</p>
          <p className="mt-2 text-sm text-muted">Entre: {s.tematicas.join(", ")}</p>
          {s.proximaEntrega && s.estado === "activa" && (
            <p className="mt-1 text-xs text-muted">
              Próxima entrega desde el {new Date(s.proximaEntrega).toLocaleDateString("es-AR")}
            </p>
          )}

          <div className="mt-3 flex gap-3">
            {s.estado === "activa" && (
              <button
                disabled={guardando === s.id}
                onClick={() => cambiarEstado(s.id, "pausada")}
                className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                Pausar
              </button>
            )}
            {s.estado === "pausada" && (
              <button
                disabled={guardando === s.id}
                onClick={() => cambiarEstado(s.id, "activa")}
                className="text-sm text-brand transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                Reactivar
              </button>
            )}
            {s.estado !== "cancelada" && (
              <button
                disabled={guardando === s.id}
                onClick={() => cambiarEstado(s.id, "cancelada")}
                className="text-sm text-red-400 transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
