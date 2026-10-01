"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FrecuenciaForm } from "@/components/admin/catalogo/FrecuenciaForm";
import type { FrecuenciaSuscripcion } from "@/lib/types";

type ModalState = { tipo: "crear" } | { tipo: "editar"; frecuencia: FrecuenciaSuscripcion } | null;

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

export function FrecuenciasTable({ frecuenciasIniciales }: { frecuenciasIniciales: FrecuenciaSuscripcion[] }) {
  const [frecuencias, setFrecuencias] = useState(
    [...frecuenciasIniciales].sort((a, b) => a.orden - b.orden)
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function guardarFrecuencia(actualizada: FrecuenciaSuscripcion) {
    setFrecuencias((prev) => {
      const existe = prev.some((f) => f.id === actualizada.id);
      const siguiente = existe ? prev.map((f) => (f.id === actualizada.id ? actualizada : f)) : [...prev, actualizada];
      return siguiente.sort((a, b) => a.orden - b.orden);
    });
    setModal(null);
    setMensaje(`"${actualizada.etiqueta}" se guardó correctamente.`);
    setError("");
  }

  async function eliminarFrecuencia(frecuencia: FrecuenciaSuscripcion) {
    const confirmado = window.confirm(
      `¿Eliminar "${frecuencia.etiqueta}"? Si ya hay suscripciones con esta frecuencia, se va a desactivar en vez de borrarse definitivamente.`
    );
    if (!confirmado) return;

    setEliminando(frecuencia.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    const { count } = await supabase
      .from("suscripciones")
      .select("id", { count: "exact", head: true })
      .eq("frecuencia_dias", frecuencia.dias);

    if ((count ?? 0) > 0) {
      const { error: errorUpdate } = await supabase
        .from("frecuencias_suscripcion")
        .update({ activa: false })
        .eq("id", frecuencia.id);
      setEliminando(null);

      if (errorUpdate) {
        setError(`No se pudo desactivar "${frecuencia.etiqueta}". Probá de nuevo.`);
        return;
      }

      setFrecuencias((prev) => prev.map((f) => (f.id === frecuencia.id ? { ...f, activa: false } : f)));
      setMensaje(`"${frecuencia.etiqueta}" ya tiene suscripciones, así que se desactivó en vez de borrarse.`);
      return;
    }

    const { error: errorDelete } = await supabase.from("frecuencias_suscripcion").delete().eq("id", frecuencia.id);
    setEliminando(null);

    if (errorDelete) {
      setError(`No se pudo eliminar "${frecuencia.etiqueta}". Probá de nuevo.`);
      return;
    }

    setFrecuencias((prev) => prev.filter((f) => f.id !== frecuencia.id));
    setMensaje(`"${frecuencia.etiqueta}" se eliminó.`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Cuánto se cobra por entrega según cada cuánto se manda la caja de la suscripción.
        </p>
        <button
          onClick={() => setModal({ tipo: "crear" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          + Nueva frecuencia
        </button>
      </div>

      {mensaje && <p className="mt-3 text-sm text-emerald-400">{mensaje}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {frecuencias.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no hay frecuencias cargadas.</p>
      ) : (
        <div className="mt-6 relative overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Cada cuántos días</th>
                <th className="px-4 py-3">Precio por entrega</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {frecuencias.map((f) => (
                <tr key={f.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium">{f.etiqueta}</td>
                  <td className="px-4 py-3 text-muted">{f.dias} días</td>
                  <td className="px-4 py-3 font-semibold text-brand">{formatoMoneda(f.precio)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        f.activa
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                          : "rounded-full bg-muted/15 px-3 py-1 text-xs font-medium text-muted"
                      }
                    >
                      {f.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        aria-label={`Editar ${f.etiqueta}`}
                        onClick={() => setModal({ tipo: "editar", frecuencia: f })}
                        className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                      >
                        Editar
                      </button>
                      <button
                        aria-label={`Eliminar ${f.etiqueta}`}
                        onClick={() => eliminarFrecuencia(f)}
                        disabled={eliminando === f.id}
                        className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {eliminando === f.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.tipo === "crear" && <FrecuenciaForm onClose={() => setModal(null)} onSaved={guardarFrecuencia} />}
      {modal?.tipo === "editar" && (
        <FrecuenciaForm frecuencia={modal.frecuencia} onClose={() => setModal(null)} onSaved={guardarFrecuencia} />
      )}
    </div>
  );
}
