"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ZonaForm } from "@/components/admin/catalogo/ZonaForm";
import { formatoMoneda } from "@/lib/fechas";
import type { ZonaReparto } from "@/lib/types";

type ModalState = { tipo: "crear" } | { tipo: "editar"; zona: ZonaReparto } | null;

export function ZonasTable({ zonasIniciales }: { zonasIniciales: ZonaReparto[] }) {
  const [zonas, setZonas] = useState(zonasIniciales);
  const [modal, setModal] = useState<ModalState>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function guardarZona(actualizada: ZonaReparto) {
    setZonas((prev) => {
      const existe = prev.some((z) => z.id === actualizada.id);
      return existe ? prev.map((z) => (z.id === actualizada.id ? actualizada : z)) : [...prev, actualizada];
    });
    setModal(null);
    setMensaje(`"${actualizada.nombre}" se guardó correctamente.`);
    setError("");
  }

  async function eliminarZona(zona: ZonaReparto) {
    if (
      !window.confirm(
        `¿Eliminar "${zona.nombre}"? Si ya tiene pedidos o suscripciones, se va a desactivar en vez de borrarse.`
      )
    ) {
      return;
    }

    setEliminando(zona.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    const [pedidos, suscripciones] = await Promise.all([
      supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("zona_reparto_id", zona.id),
      supabase.from("suscripciones").select("id", { count: "exact", head: true }).eq("zona_reparto_id", zona.id),
    ]);

    if ((pedidos.count ?? 0) > 0 || (suscripciones.count ?? 0) > 0) {
      const { error: errorUpdate } = await supabase.from("zonas_reparto").update({ disponible: false }).eq("id", zona.id);
      setEliminando(null);
      if (errorUpdate) {
        setError(`No se pudo desactivar "${zona.nombre}". Probá de nuevo.`);
        return;
      }
      setZonas((prev) => prev.map((z) => (z.id === zona.id ? { ...z, disponible: false } : z)));
      setMensaje(`"${zona.nombre}" ya tiene pedidos, así que se desactivó en vez de borrarse.`);
      return;
    }

    const { error: errorDelete } = await supabase.from("zonas_reparto").delete().eq("id", zona.id);
    setEliminando(null);
    if (errorDelete) {
      setError(`No se pudo eliminar "${zona.nombre}". Probá de nuevo.`);
      return;
    }
    setZonas((prev) => prev.filter((z) => z.id !== zona.id));
    setMensaje(`"${zona.nombre}" se eliminó.`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Los barrios o zonas donde entregás y cuánto cobrás de envío en cada una. Si no cargás ninguna, el cliente no
          elige zona y el envío no se cobra.
        </p>
        <button
          type="button"
          onClick={() => setModal({ tipo: "crear" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          + Nueva zona
        </button>
      </div>

      {mensaje && (
        <p role="status" className="mt-3 text-sm text-emerald-400">
          {mensaje}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {zonas.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no cargaste zonas de reparto.</p>
      ) : (
        <div className="mt-6 relative overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Zona</th>
                <th scope="col" className="px-4 py-3">Costo de envío</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {zonas.map((z) => (
                <tr key={z.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{z.nombre}</td>
                  <td className="px-4 py-3">{z.costoEnvio === 0 ? "Gratis" : formatoMoneda(z.costoEnvio)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        z.disponible
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                          : "rounded-full bg-muted/15 px-3 py-1 text-xs font-medium text-muted"
                      }
                    >
                      {z.disponible ? "Disponible" : "No disponible"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-label={`Editar ${z.nombre}`}
                        onClick={() => setModal({ tipo: "editar", zona: z })}
                        className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar ${z.nombre}`}
                        onClick={() => eliminarZona(z)}
                        disabled={eliminando === z.id}
                        className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {eliminando === z.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.tipo === "crear" && <ZonaForm onClose={() => setModal(null)} onSaved={guardarZona} />}
      {modal?.tipo === "editar" && (
        <ZonaForm zona={modal.zona} onClose={() => setModal(null)} onSaved={guardarZona} />
      )}
    </div>
  );
}
