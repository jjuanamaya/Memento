"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import { formatearFechaHora, formatoMoneda } from "@/lib/fechas";
import {
  ESTADOS_FINALES,
  ESTADOS_PEDIDO,
  ETIQUETA_ENTREGA,
  ETIQUETA_ESTADO,
  type EstadoPedido,
  type MetodoPago,
  type TipoEntrega,
} from "@/lib/types";

export interface PedidoAdminItem {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface PedidoAdminRow {
  id: string;
  total: number;
  costoEnvio: number;
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  tipo: "unico" | "suscripcion";
  personalizada: boolean;
  numeroCliente: number | null;
  cliente: string;
  telefono: string | null;
  cajaNombre: string;
  tematicaNombre: string;
  tipoEntrega: TipoEntrega;
  direccion: string;
  comentario: string;
  comprobanteUrl: string | null;
  creadoEn: string;
  items: PedidoAdminItem[];
}

type Filtro = "por_hacer" | "entregado" | "cancelado" | "todos";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "por_hacer", label: "Por hacer" },
  { id: "entregado", label: "Entregados" },
  { id: "cancelado", label: "Cancelados" },
  { id: "todos", label: "Todos" },
];

const ETIQUETA_PAGO: Record<MetodoPago, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function cumpleFiltro(estado: EstadoPedido, filtro: Filtro) {
  if (filtro === "todos") return true;
  if (filtro === "por_hacer") return !ESTADOS_FINALES.includes(estado);
  return estado === filtro;
}

export function PedidosTable({ pedidosIniciales }: { pedidosIniciales: PedidoAdminRow[] }) {
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [filtro, setFiltro] = useState<Filtro>("por_hacer");
  const [busqueda, setBusqueda] = useState("");
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim()).replace(/^#/, "");
    return pedidos.filter(
      (p) =>
        cumpleFiltro(p.estado, filtro) &&
        (!texto ||
          normalizar(p.cliente).includes(texto) ||
          p.id.startsWith(texto) ||
          (p.numeroCliente !== null && String(p.numeroCliente) === texto))
    );
  }, [pedidos, filtro, busqueda]);

  const conteo = (f: Filtro) => pedidos.filter((p) => cumpleFiltro(p.estado, f)).length;
  const detalle = pedidos.find((p) => p.id === detalleId) ?? null;

  async function devolverStock(pedido: PedidoAdminRow) {
    const supabase = createClient();
    for (const item of pedido.items) {
      const { error: errorMov } = await supabase.rpc("registrar_movimiento_stock", {
        p_producto_id: item.productoId,
        p_tipo: "entrada",
        p_cantidad: item.cantidad,
        p_motivo: `Pedido #${pedido.id.slice(0, 8)} cancelado`,
      });
      if (errorMov) return item;
    }
    return null;
  }

  async function actualizarEstado(pedido: PedidoAdminRow, estado: EstadoPedido) {
    if (estado === pedido.estado || ESTADOS_FINALES.includes(pedido.estado)) return;

    const unidades = pedido.items.reduce((acc, it) => acc + it.cantidad, 0);
    const numero = `#${pedido.id.slice(0, 8)}`;

    if (estado === "cancelado") {
      const aviso =
        unidades > 0
          ? `¿Cancelar el pedido ${numero}? Los ${unidades} productos vuelven al stock.\n\nDespués no se puede cambiar de estado.`
          : `¿Cancelar el pedido ${numero}?\n\nDespués no se puede cambiar de estado.`;
      if (!window.confirm(aviso)) return;
    }
    if (estado === "entregado") {
      if (!window.confirm(`¿Marcar el pedido ${numero} como entregado?\n\nDespués no se puede cambiar de estado.`)) return;
    }

    setGuardando(pedido.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    const { error: errorUpdate } = await supabase.from("pedidos").update({ estado }).eq("id", pedido.id);

    if (errorUpdate) {
      console.error("Error al actualizar el pedido:", errorUpdate);
      setGuardando(null);
      setError(`No se pudo actualizar el pedido ${numero}. Probá de nuevo.`);
      return;
    }

    if (estado === "cancelado" && unidades > 0) {
      const fallo = await devolverStock(pedido);
      if (fallo) {
        setError(
          `El pedido se canceló, pero no se pudo devolver al stock "${fallo.nombre}". Cargalo a mano en Stock → Registrar movimiento.`
        );
      } else {
        setMensaje(
          `Pedido ${numero} cancelado: ${unidades} productos volvieron al stock.` +
            // La base devuelve la entrega a la suscripción (trigger devolver_entrega_suscripcion).
            (pedido.tipo === "suscripcion"
              ? " La entrega volvió a quedar pendiente: generala de nuevo desde Suscripciones."
              : "")
        );
      }
    } else if (estado === "cancelado" && pedido.tipo === "suscripcion") {
      setMensaje(`Pedido ${numero} cancelado. La entrega volvió a quedar pendiente: generala de nuevo desde Suscripciones.`);
    }

    setGuardando(null);
    setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? { ...p, estado } : p)));
  }

  async function verComprobante(ruta: string) {
    const ventana = window.open("", "_blank");
    const { data, error: errorUrl } = await createClient().storage.from("comprobantes").createSignedUrl(ruta, 600);
    if (errorUrl || !data) {
      ventana?.close();
      setError("No se pudo abrir el comprobante. Probá de nuevo.");
      return;
    }
    if (ventana) ventana.location.href = data.signedUrl;
  }

  function selectorEstado(pedido: PedidoAdminRow) {
    if (ESTADOS_FINALES.includes(pedido.estado)) {
      return (
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
            pedido.estado === "entregado" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          }`}
        >
          {ETIQUETA_ESTADO[pedido.estado]}
        </span>
      );
    }
    return (
      <select
        aria-label={`Estado del pedido #${pedido.id.slice(0, 8)}`}
        value={pedido.estado}
        disabled={guardando === pedido.id}
        onChange={(e) => actualizarEstado(pedido, e.target.value as EstadoPedido)}
        className="rounded-lg border border-muted/70 bg-transparent px-2 py-1 disabled:opacity-50"
      >
        {/* Pedidos viejos pueden tener un estado que ya no se usa: se muestra igual. */}
        {!ESTADOS_PEDIDO.includes(pedido.estado) && (
          <option value={pedido.estado} disabled className="bg-background">
            {ETIQUETA_ESTADO[pedido.estado]}
          </option>
        )}
        {ESTADOS_PEDIDO.map((estado) => (
          <option key={estado} value={estado} className="bg-background">
            {ETIQUETA_ESTADO[estado]}
          </option>
        ))}
      </select>
    );
  }

  function botonComanda(pedido: PedidoAdminRow) {
    return (
      <Link
        href={`/admin/pedidos/${pedido.id}/comanda`}
        target="_blank"
        aria-label={`Imprimir comanda del pedido #${pedido.id.slice(0, 8)}`}
        className="whitespace-nowrap rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
      >
        Imprimir comanda
      </Link>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar pedidos" className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                filtro === f.id
                  ? "border-brand bg-brand/15 font-medium text-brand"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {f.label} <span className="text-xs opacity-80">({conteo(f.id)})</span>
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="buscar-pedido">
          Buscar pedido
        </label>
        <input
          id="buscar-pedido"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Cliente, N° de cliente o #pedido"
          className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand sm:w-72"
        />
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

      {visibles.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {pedidos.length === 0 ? "Todavía no hay pedidos." : "No hay pedidos en esta vista."}
        </p>
      ) : (
        <div className="relative mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Pedido</th>
                <th scope="col" className="px-4 py-3">Cliente</th>
                <th scope="col" className="px-4 py-3">Caja</th>
                <th scope="col" className="px-4 py-3">Total</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((pedido) => (
                <tr key={pedido.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">#{pedido.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted">{formatearFechaHora(pedido.creadoEn)}</p>
                    {pedido.tipo === "suscripcion" && (
                      <span className="mt-1 inline-block rounded-full bg-brand/15 px-2 py-0.5 text-[11px] text-brand">
                        Suscripción
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {pedido.cliente}
                    {pedido.numeroCliente !== null && (
                      <p className="text-xs text-muted">Cliente N° {pedido.numeroCliente}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {pedido.cajaNombre}
                    {pedido.tematicaNombre && <p className="text-xs text-muted">{pedido.tematicaNombre}</p>}
                    <p className="text-xs text-muted">{ETIQUETA_ENTREGA[pedido.tipoEntrega]}</p>
                  </td>
                  <td className="px-4 py-3">
                    {formatoMoneda(pedido.total)}
                    <p className="text-xs text-muted">{ETIQUETA_PAGO[pedido.metodoPago]}</p>
                  </td>
                  <td className="px-4 py-3">{selectorEstado(pedido)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDetalleId(pedido.id)}
                        aria-label={`Ver detalle del pedido #${pedido.id.slice(0, 8)}`}
                        className="whitespace-nowrap rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                      >
                        Ver detalle
                      </button>
                      {botonComanda(pedido)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <Modal titulo={`Pedido #${detalle.id.slice(0, 8)}`} onClose={() => setDetalleId(null)}>
          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted">
                {formatearFechaHora(detalle.creadoEn)}
                {detalle.tipo === "suscripcion" && " · Generado por una suscripción"}
              </p>
              {botonComanda(detalle)}
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</h3>
              <p className="mt-1 font-medium">
                {detalle.cliente}
                {detalle.numeroCliente !== null && (
                  <span className="font-normal text-muted"> · N° {detalle.numeroCliente}</span>
                )}
              </p>
              {detalle.telefono ? (
                <a href={`tel:${detalle.telefono}`} className="text-brand underline underline-offset-2">
                  {detalle.telefono}
                </a>
              ) : (
                <p className="text-xs text-muted">Sin teléfono cargado.</p>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Entrega</h3>
              <p className="mt-1 font-medium">{ETIQUETA_ENTREGA[detalle.tipoEntrega]}</p>
              {detalle.tipoEntrega === "envio" && <p>{detalle.direccion || "—"}</p>}
              {detalle.comentario && <p className="mt-1 text-muted">“{detalle.comentario}”</p>}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Qué lleva</h3>
              <p className="mt-1 font-medium">
                {detalle.cajaNombre}
                {detalle.tematicaNombre && ` · ${detalle.tematicaNombre}`}
              </p>
              {detalle.items.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {detalle.items.map((it) => (
                    <li key={it.productoId} className="flex justify-between gap-3">
                      <span>
                        {it.cantidad}× {it.nombre}
                      </span>
                      {detalle.personalizada && (
                        <span className="text-muted">{formatoMoneda(it.cantidad * it.precioUnitario)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  {detalle.tipo === "suscripcion"
                    ? "Caja sorpresa de suscripción: elegí vos los productos según la temática."
                    : "Sin productos cargados."}
                </p>
              )}
            </section>

            <section className="space-y-1 rounded-xl border border-border p-4">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{formatoMoneda(detalle.total - detalle.costoEnvio)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>{detalle.tipoEntrega === "retiro" ? "Retiro en el local" : "Envío"}</span>
                <span>{detalle.costoEnvio === 0 ? "Sin cargo" : formatoMoneda(detalle.costoEnvio)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span className="text-brand">{formatoMoneda(detalle.total)}</span>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Pago</h3>
              <p className="mt-1">{ETIQUETA_PAGO[detalle.metodoPago]}</p>
              {detalle.tipo === "suscripcion" ? (
                // Las suscripciones se pagan por período, no por pedido.
                <p className="mt-1 text-xs text-muted">
                  Se paga por período: revisá el pago en{" "}
                  <Link href="/admin/suscripciones" className="text-brand underline underline-offset-2">
                    Suscripciones → Historial de pagos
                  </Link>
                  .
                </p>
              ) : (
                detalle.metodoPago === "transferencia" &&
                (detalle.comprobanteUrl ? (
                  <button
                    type="button"
                    onClick={() => verComprobante(detalle.comprobanteUrl!)}
                    className="mt-2 rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                  >
                    Ver comprobante de transferencia
                  </button>
                ) : (
                  // Desde que el comprobante es obligatorio no se puede pedir sin él:
                  // solo quedan así los pedidos anteriores.
                  <p className="mt-1 text-xs text-yellow-400">
                    Pedido hecho antes de que el comprobante fuera obligatorio. Confirmá el pago con el cliente antes
                    de despacharlo.
                  </p>
                ))
              )}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Estado</p>
              <div className="mt-1">{selectorEstado(detalle)}</div>
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
}
