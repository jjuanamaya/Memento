"use client";

import { useState } from "react";
import { IconoRegalo } from "@/components/site/IconoRegalo";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CajaForm } from "@/components/admin/catalogo/CajaForm";
import { borrarImagenCatalogo } from "@/components/admin/catalogo/imagenCatalogo";
import { MOTIVO_COTIZACION, type Caja, type Cotizacion, type Tematica } from "@/lib/types";

type ModalState = { tipo: "crear" } | { tipo: "editar"; caja: Caja } | null;

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

export function CajasTable({
  cajasIniciales,
  tematicas,
  cotizaciones,
}: {
  cajasIniciales: Caja[];
  tematicas: Tematica[];
  cotizaciones: Cotizacion[];
}) {
  const router = useRouter();
  const [cajas, setCajas] = useState(cajasIniciales);
  const [modal, setModal] = useState<ModalState>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const nombreTematica = new Map(tematicas.map((t) => [t.id, t.nombre]));

  function guardarCaja(actualizada: Caja) {
    setCajas((prev) => {
      const existe = prev.some((c) => c.id === actualizada.id);
      if (existe) return prev.map((c) => (c.id === actualizada.id ? actualizada : c));
      return [...prev, actualizada];
    });
    setModal(null);
    setMensaje(`"${actualizada.nombre}" se guardó correctamente.`);
    setError("");
    // Los precios por temática los calcula la base: se vuelven a pedir.
    router.refresh();
  }

  async function eliminarCaja(caja: Caja) {
    const confirmado = window.confirm(
      `¿Eliminar "${caja.nombre}"? Si ya tiene pedidos o suscripciones, se va a desactivar en vez de borrarse definitivamente.`
    );
    if (!confirmado) return;

    setEliminando(caja.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    const [pedidos, suscripciones] = await Promise.all([
      supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("caja_id", caja.id),
      supabase.from("suscripciones").select("id", { count: "exact", head: true }).eq("caja_id", caja.id),
    ]);
    const enUso = (pedidos.count ?? 0) > 0 || (suscripciones.count ?? 0) > 0;

    if (enUso) {
      const { error: errorUpdate } = await supabase.from("cajas").update({ activa: false }).eq("id", caja.id);
      setEliminando(null);

      if (errorUpdate) {
        setError(`No se pudo desactivar "${caja.nombre}". Probá de nuevo.`);
        return;
      }

      setCajas((prev) => prev.map((c) => (c.id === caja.id ? { ...c, activa: false } : c)));
      setMensaje(`"${caja.nombre}" ya tiene pedidos o suscripciones, así que se desactivó en vez de borrarse.`);
      return;
    }

    const { error: errorDelete } = await supabase.from("cajas").delete().eq("id", caja.id);
    setEliminando(null);

    if (errorDelete) {
      setError(`No se pudo eliminar "${caja.nombre}". Probá de nuevo.`);
      return;
    }

    if (caja.imagen) borrarImagenCatalogo(supabase, caja.imagen).catch(() => {});

    setCajas((prev) => prev.filter((c) => c.id !== caja.id));
    setMensaje(`"${caja.nombre}" se eliminó.`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Cada caja es un tamaño. Con una temática se llena sola con los productos de esa temática y el precio se
          calcula solo: costo de esos productos + % de ganancia.
        </p>
        <button
          onClick={() => setModal({ tipo: "crear" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          + Nueva caja
        </button>
      </div>

      {mensaje && <p className="mt-3 text-sm text-emerald-400">{mensaje}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {cajas.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no hay cajas cargadas.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cajas.map((c) => (
            <div key={c.id} className="flex flex-col rounded-xl border border-border bg-surface p-4">
              {c.imagen ? (
                <img src={c.imagen} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-background text-muted">
                  <IconoRegalo className="h-10 w-10" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{c.nombre}</p>
                <span
                  className={
                    c.activa
                      ? "flex-shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                      : "flex-shrink-0 rounded-full bg-muted/15 px-3 py-1 text-xs font-medium text-muted"
                  }
                >
                  {c.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{c.descripcion || "Sin descripción."}</p>
              <p className="mt-2 text-sm text-muted">
                {c.capacidad || "—"} productos · ganancia {c.gananciaPorcentaje}%
              </p>
              <p className="text-xs text-muted">
                Personalizada: {c.precio > 0 ? `base ${formatoMoneda(c.precio)} + productos` : "solo los productos elegidos"}
              </p>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Precio por temática</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {cotizaciones
                  .filter((cot) => cot.cajaId === c.id)
                  .map((cot) => (
                    <li key={cot.tematicaId} className="flex justify-between gap-2">
                      <span className="truncate text-muted">{nombreTematica.get(cot.tematicaId) ?? "Temática"}</span>
                      {cot.estado === "disponible" ? (
                        <span className="flex-shrink-0 font-medium text-brand">{formatoMoneda(cot.precio)}</span>
                      ) : (
                        <span className="flex-shrink-0 text-xs text-yellow-400">
                          {cot.estado === "sin_precio"
                            ? "Falta cargar costos"
                            : cot.estado === "sin_contenido"
                              ? "Temática sin productos"
                              : MOTIVO_COTIZACION[cot.estado]}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
              <div className="mt-auto" />

              <div className="mt-4 flex gap-2">
                <button
                  aria-label={`Editar ${c.nombre}`}
                  onClick={() => setModal({ tipo: "editar", caja: c })}
                  className="flex-1 rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                >
                  Editar
                </button>
                <button
                  aria-label={`Eliminar ${c.nombre}`}
                  onClick={() => eliminarCaja(c)}
                  disabled={eliminando === c.id}
                  className="flex-1 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {eliminando === c.id ? "..." : "Eliminar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.tipo === "crear" && <CajaForm onClose={() => setModal(null)} onSaved={guardarCaja} />}
      {modal?.tipo === "editar" && (
        <CajaForm caja={modal.caja} onClose={() => setModal(null)} onSaved={guardarCaja} />
      )}
    </div>
  );
}
