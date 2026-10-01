"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TematicaForm } from "@/components/admin/catalogo/TematicaForm";
import { borrarImagenCatalogo } from "@/components/admin/catalogo/imagenCatalogo";
import type { Tematica } from "@/lib/types";

type ModalState = { tipo: "crear" } | { tipo: "editar"; tematica: Tematica } | null;

export function TematicasTable({ tematicasIniciales }: { tematicasIniciales: Tematica[] }) {
  const [tematicas, setTematicas] = useState(tematicasIniciales);
  const [modal, setModal] = useState<ModalState>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function guardarTematica(actualizada: Tematica) {
    setTematicas((prev) => {
      const existe = prev.some((t) => t.id === actualizada.id);
      if (existe) return prev.map((t) => (t.id === actualizada.id ? actualizada : t));
      return [...prev, actualizada];
    });
    setModal(null);
    setMensaje(`"${actualizada.nombre}" se guardó correctamente.`);
    setError("");
  }

  async function eliminarTematica(tematica: Tematica) {
    const confirmado = window.confirm(
      `¿Eliminar "${tematica.nombre}"? Si ya tiene pedidos o suscripciones, se va a desactivar en vez de borrarse definitivamente.`
    );
    if (!confirmado) return;

    setEliminando(tematica.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    const [pedidos, suscripciones] = await Promise.all([
      supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("tematica_id", tematica.id),
      supabase
        .from("suscripcion_tematicas")
        .select("tematica_id", { count: "exact", head: true })
        .eq("tematica_id", tematica.id),
    ]);
    const enUso = (pedidos.count ?? 0) > 0 || (suscripciones.count ?? 0) > 0;

    if (enUso) {
      const { error: errorUpdate } = await supabase.from("tematicas").update({ activa: false }).eq("id", tematica.id);
      setEliminando(null);

      if (errorUpdate) {
        setError(`No se pudo desactivar "${tematica.nombre}". Probá de nuevo.`);
        return;
      }

      setTematicas((prev) => prev.map((t) => (t.id === tematica.id ? { ...t, activa: false } : t)));
      setMensaje(`"${tematica.nombre}" ya tiene pedidos o suscripciones, así que se desactivó en vez de borrarse.`);
      return;
    }

    const { error: errorDelete } = await supabase.from("tematicas").delete().eq("id", tematica.id);
    setEliminando(null);

    if (errorDelete) {
      setError(`No se pudo eliminar "${tematica.nombre}". Probá de nuevo.`);
      return;
    }

    if (tematica.imagen) borrarImagenCatalogo(supabase, tematica.imagen).catch(() => {});

    setTematicas((prev) => prev.filter((t) => t.id !== tematica.id));
    setMensaje(`"${tematica.nombre}" se eliminó.`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Las temáticas con las que se arma o sortea cada caja.</p>
        <button
          onClick={() => setModal({ tipo: "crear" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          + Nueva temática
        </button>
      </div>

      {mensaje && <p className="mt-3 text-sm text-emerald-400">{mensaje}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {tematicas.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no hay temáticas cargadas.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tematicas.map((t) => (
            <div key={t.id} className="flex flex-col rounded-xl border border-border bg-surface p-4">
              {t.imagen ? (
                <img src={t.imagen} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-background text-2xl">
                  ✨
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{t.nombre}</p>
                <span
                  className={
                    t.activa
                      ? "flex-shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                      : "flex-shrink-0 rounded-full bg-muted/15 px-3 py-1 text-xs font-medium text-muted"
                  }
                >
                  {t.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{t.descripcion || "Sin descripción."}</p>

              <div className="mt-4 flex gap-2">
                <button
                  aria-label={`Editar ${t.nombre}`}
                  onClick={() => setModal({ tipo: "editar", tematica: t })}
                  className="flex-1 rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                >
                  Editar
                </button>
                <button
                  aria-label={`Eliminar ${t.nombre}`}
                  onClick={() => eliminarTematica(t)}
                  disabled={eliminando === t.id}
                  className="flex-1 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {eliminando === t.id ? "..." : "Eliminar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.tipo === "crear" && <TematicaForm onClose={() => setModal(null)} onSaved={guardarTematica} />}
      {modal?.tipo === "editar" && (
        <TematicaForm tematica={modal.tematica} onClose={() => setModal(null)} onSaved={guardarTematica} />
      )}
    </div>
  );
}
