"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatearFechaHora, formatoMoneda } from "@/lib/fechas";
import { ETIQUETA_ESTADO, type EstadoPedido, type MetodoPago } from "@/lib/types";

export interface MiPedido {
  id: string;
  total: number;
  costoEnvio: number;
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  tipo: "unico" | "suscripcion";
  direccion: string;
  tieneComprobante: boolean;
  creadoEn: string;
  cajaNombre: string;
  tematicaNombre: string;
  items: { id: string; nombre: string; cantidad: number; subtotal: number }[];
}

const ESTILO_ESTADO: Record<EstadoPedido, string> = {
  armado: "bg-surface text-muted",
  confirmado: "bg-surface text-muted",
  en_preparacion: "bg-brand/15 text-brand",
  en_camino: "bg-brand/15 text-brand",
  entregado: "bg-emerald-500/15 text-emerald-400",
  cancelado: "bg-red-500/15 text-red-400",
};

const ETIQUETA_METODO: Record<MetodoPago, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo al recibir",
};

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function rutaComprobante(usuarioId: string, pedidoId: string, archivo: File) {
  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${usuarioId}/${pedidoId}-${Date.now()}.${extension}`;
}

export function MisPedidosList({ usuarioId, pedidosIniciales }: { usuarioId: string; pedidosIniciales: MiPedido[] }) {
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ id: string; texto: string; error: boolean } | null>(null);

  async function subirComprobante(pedido: MiPedido, archivo: File | undefined) {
    if (!archivo) return;
    if (!TIPOS_PERMITIDOS.includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setAviso({
        id: pedido.id,
        texto: "Tiene que ser una imagen (JPG, PNG o WEBP) o un PDF de hasta 5 MB.",
        error: true,
      });
      return;
    }

    setSubiendo(pedido.id);
    setAviso(null);
    const supabase = createClient();
    const ruta = rutaComprobante(usuarioId, pedido.id, archivo);

    const { error: errorSubida } = await supabase.storage.from("comprobantes").upload(ruta, archivo);
    if (errorSubida) {
      setSubiendo(null);
      setAviso({ id: pedido.id, texto: "No se pudo subir el comprobante. Probá de nuevo.", error: true });
      return;
    }

    const { error: errorUpdate } = await supabase.from("pedidos").update({ comprobante_url: ruta }).eq("id", pedido.id);
    setSubiendo(null);

    if (errorUpdate) {
      setAviso({ id: pedido.id, texto: "No se pudo asociar el comprobante al pedido. Probá de nuevo.", error: true });
      return;
    }

    setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? { ...p, tieneComprobante: true } : p)));
    setAviso({ id: pedido.id, texto: "¡Listo! Recibimos tu comprobante.", error: false });
  }

  return (
    <ul className="mt-6 space-y-3">
      {pedidos.map((pedido, i) => {
        const puedeSubir =
          pedido.metodoPago === "transferencia" && !pedido.tieneComprobante && pedido.estado !== "cancelado";
        return (
          <li
            key={pedido.id}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-fade-in-up rounded-xl border border-border p-4 transition-colors hover:border-brand/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {pedido.cajaNombre}
                {pedido.tematicaNombre && ` · ${pedido.tematicaNombre}`}
              </p>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILO_ESTADO[pedido.estado]}`}>
                {ETIQUETA_ESTADO[pedido.estado]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Pedido #{pedido.id.slice(0, 8)} · {formatearFechaHora(pedido.creadoEn)} · {formatoMoneda(pedido.total)} ·{" "}
              {ETIQUETA_METODO[pedido.metodoPago]}
            </p>

            <details className="group mt-2">
              <summary className="cursor-pointer text-sm text-brand">Ver detalle</summary>
              <div className="mt-3 space-y-1 text-sm text-muted">
                {pedido.items.length > 0 ? (
                  pedido.items.map((it) => (
                    <div key={it.id} className="flex justify-between gap-3">
                      <span>
                        {it.cantidad}× {it.nombre}
                      </span>
                      <span>{formatoMoneda(it.subtotal)}</span>
                    </div>
                  ))
                ) : (
                  <p>{pedido.tipo === "suscripcion" ? "Caja sorpresa de tu suscripción." : "Sin productos extra."}</p>
                )}
                <div className="flex justify-between gap-3">
                  <span>Envío</span>
                  <span>{pedido.costoEnvio === 0 ? "Sin cargo" : formatoMoneda(pedido.costoEnvio)}</span>
                </div>
                <p className="pt-1">Entrega en: {pedido.direccion}</p>
              </div>
            </details>

            {pedido.metodoPago === "transferencia" && pedido.tieneComprobante && (
              <p className="mt-2 text-xs text-emerald-400">Comprobante de transferencia recibido.</p>
            )}

            {puedeSubir && (
              <div className="mt-3 rounded-lg border border-dashed border-border p-3">
                <label htmlFor={`comprobante-${pedido.id}`} className="text-sm font-medium">
                  Subir comprobante de transferencia
                </label>
                <input
                  id={`comprobante-${pedido.id}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={subiendo === pedido.id}
                  onChange={(e) => subirComprobante(pedido, e.target.files?.[0])}
                  className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-foreground disabled:opacity-50"
                />
                {subiendo === pedido.id && <p className="mt-2 text-xs text-muted">Subiendo...</p>}
              </div>
            )}

            {aviso?.id === pedido.id && (
              <p role={aviso.error ? "alert" : "status"} className={`mt-2 text-sm ${aviso.error ? "text-red-400" : "text-emerald-400"}`}>
                {aviso.texto}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
