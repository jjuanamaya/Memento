"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatearFechaHora } from "@/lib/fechas";

export interface SolicitudArrepentimiento {
  id: string;
  codigo: string;
  nombre: string;
  email: string;
  numeroPedido: string | null;
  detalle: string | null;
  estado: "pendiente" | "resuelta";
  creadoEn: string;
}

export function ArrepentimientosTable({ iniciales }: { iniciales: SolicitudArrepentimiento[] }) {
  const [solicitudes, setSolicitudes] = useState(iniciales);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function cambiarEstado(s: SolicitudArrepentimiento) {
    const estado = s.estado === "pendiente" ? "resuelta" : "pendiente";
    setGuardando(s.id);
    setError("");
    const { error: errorUpdate } = await createClient()
      .from("solicitudes_arrepentimiento")
      .update({ estado })
      .eq("id", s.id);
    setGuardando(null);

    if (errorUpdate) {
      setError("No se pudo actualizar la solicitud. Probá de nuevo.");
      return;
    }
    setSolicitudes((prev) => prev.map((x) => (x.id === s.id ? { ...x, estado } : x)));
  }

  if (solicitudes.length === 0) {
    return <p className="mt-6 text-sm text-muted">No hay solicitudes de arrepentimiento.</p>;
  }

  return (
    <div className="mt-6">
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="relative overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Código</th>
              <th scope="col" className="px-4 py-3">Fecha</th>
              <th scope="col" className="px-4 py-3">Cliente</th>
              <th scope="col" className="px-4 py-3">Pedido</th>
              <th scope="col" className="px-4 py-3">Comentario</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-mono text-xs">{s.codigo}</td>
                <td className="px-4 py-3 text-muted">{formatearFechaHora(s.creadoEn)}</td>
                <td className="px-4 py-3">
                  {s.nombre}
                  <br />
                  <a href={`mailto:${s.email}`} className="text-xs text-brand underline">
                    {s.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted">{s.numeroPedido ?? "—"}</td>
                <td className="max-w-xs px-4 py-3 text-muted">{s.detalle ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      s.estado === "pendiente"
                        ? "rounded-full bg-brand/15 px-3 py-1 text-xs font-medium text-brand"
                        : "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                    }
                  >
                    {s.estado === "pendiente" ? "Pendiente" : "Resuelta"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => cambiarEstado(s)}
                    disabled={guardando === s.id}
                    className="whitespace-nowrap rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40 disabled:opacity-50"
                  >
                    {s.estado === "pendiente" ? "Marcar como resuelta" : "Volver a pendiente"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
