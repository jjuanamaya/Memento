"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import { formatearFechaHora, formatoMoneda } from "@/lib/fechas";
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO, type EstadoPedido, type MetodoPago, type Repartidor } from "@/lib/types";

export interface PedidoAdminItem {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface PedidoAdminRow {
  id: string;
  total: number;
  subtotal: number;
  costoEnvio: number;
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  tipo: "unico" | "suscripcion";
  cliente: string;
  telefono: string | null;
  cajaNombre: string;
  tematicaNombre: string;
  direccion: string;
  zonaNombre: string | null;
  comprobanteUrl: string | null;
  creadoEn: string;
  repartidorId: string | null;
  items: PedidoAdminItem[];
}

type Filtro = "por_hacer" | "entregado" | "cancelado" | "todos";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "por_hacer", label: "Por hacer" },
  { id: "entregado", label: "Entregados" },
  { id: "cancelado", label: "Cancelados" },
  { id: "todos", label: "Todos" },
];

const POR_HACER: EstadoPedido[] = ["armado", "confirmado", "en_preparacion", "en_camino"];

const ETIQUETA_PAGO: Record<MetodoPago, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function cumpleFiltro(estado: EstadoPedido, filtro: Filtro) {
  if (filtro === "todos") return true;
  if (filtro === "por_hacer") return POR_HACER.includes(estado);
  return estado === filtro;
}

export function PedidosTable({
  pedidosIniciales,
  repartidores,
}: {
  pedidosIniciales: PedidoAdminRow[];
  repartidores: Repartidor[];
}) {
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
        (!texto || normalizar(p.cliente).includes(texto) || p.id.startsWith(texto))
    );
  }, [pedidos, filtro, busqueda]);

  const conteo = (f: Filtro) => pedidos.filter((p) => cumpleFiltro(p.estado, f)).length;
  const detalle = pedidos.find((p) => p.id === detalleId) ?? null;

  async function moverStock(pedido: PedidoAdminRow, tipo: "entrada" | "salida") {
    const supabase = createClient();
    const motivo = `Pedido #${pedido.id.slice(0, 8)} ${tipo === "entrada" ? "cancelado" : "reactivado"}`;
    const hechos: PedidoAdminItem[] = [];
    for (const item of pedido.items) {
      const { error: errorMov } = await supabase.rpc("registrar_movimiento_stock", {
        p_producto_id: item.productoId,
        p_tipo: tipo,
        p_cantidad: item.cantidad,
        p_motivo: motivo,
      });
      if (errorMov) return { ok: false as const, fallo: item, hechos };
      hechos.push(item);
    }
    return { ok: true as const, hechos };
  }

  async function deshacerSalidas(pedido: PedidoAdminRow, items: PedidoAdminItem[]) {
    const supabase = createClient();
    for (const item of items) {
      await supabase.rpc("registrar_movimiento_stock", {
        p_producto_id: item.productoId,
        p_tipo: "entrada",
        p_cantidad: item.cantidad,
        p_motivo: `Corrección: reactivación fallida del pedido #${pedido.id.slice(0, 8)}`,
      });
    }
  }

  async function actualizarEstado(pedido: PedidoAdminRow, estado: EstadoPedido) {
    const anterior = pedido.estado;
    if (estado === anterior) return;

    const unidades = pedido.items.reduce((acc, it) => acc + it.cantidad, 0);
    const cancela = estado === "cancelado";
    const reactiva = anterior === "cancelado";

    if (cancela) {
      const aviso =
        unidades > 0
          ? `¿Cancelar el pedido #${pedido.id.slice(0, 8)}? Los ${unidades} productos vuelven al stock.`
          : `¿Cancelar el pedido #${pedido.id.slice(0, 8)}?`;
      if (!window.confirm(aviso)) return;
    }
    if (reactiva && unidades > 0) {
      if (!window.confirm(`Este pedido estaba cancelado. Se van a volver a descontar ${unidades} productos del stock.`)) {
        return;
      }
    }

    setGuardando(pedido.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    if (reactiva && unidades > 0) {
      const resultado = await moverStock(pedido, "salida");
      if (!resultado.ok) {
        await deshacerSalidas(pedido, resultado.hechos);
        setGuardando(null);
        setError(`No hay stock suficiente de "${resultado.fallo.nombre}" para reactivar este pedido.`);
        return;
      }
    }

    const { error: errorUpdate } = await supabase.from("pedidos").update({ estado }).eq("id", pedido.id);

    if (errorUpdate) {
      if (reactiva && unidades > 0) await deshacerSalidas(pedido, pedido.items);
      setGuardando(null);
      setError(`No se pudo actualizar el pedido #${pedido.id.slice(0, 8)}. Probá de nuevo.`);
      return;
    }

    if (cancela && unidades > 0) {
      const resultado = await moverStock(pedido, "entrada");
      if (!resultado.ok) {
        setError(
          `El pedido se canceló, pero no se pudo devolver al stock "${resultado.fallo.nombre}". Cargalo a mano en Stock → Registrar movimiento.`
        );
      } else {
        setMensaje(`Pedido #${pedido.id.slice(0, 8)} cancelado: ${unidades} productos volvieron al stock.`);
      }
    }

    setGuardando(null);
    setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? { ...p, estado } : p)));
  }

  async function actualizarRepartidor(id: string, repartidorId: string) {
    setGuardando(id);
    setError("");
    const supabase = createClient();
    const { error: errorUpdate } = await supabase
      .from("pedidos")
      .update({ repartidor_id: repartidorId || null })
      .eq("id", id);
    setGuardando(null);

    if (errorUpdate) {
      setError(`No se pudo asignar el repartidor del pedido #${id.slice(0, 8)}. Probá de nuevo.`);
      return;
    }

    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, repartidorId: repartidorId || null } : p)));
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
    return (
      <select
        aria-label={`Estado del pedido #${pedido.id.slice(0, 8)}`}
        value={pedido.estado}
        disabled={guardando === pedido.id}
        onChange={(e) => actualizarEstado(pedido, e.target.value as EstadoPedido)}
        className="rounded-lg border border-muted/70 bg-transparent px-2 py-1 disabled:opacity-50"
      >
        {ESTADOS_PEDIDO.map((estado) => (
          <option key={estado} value={estado} className="bg-background">
            {ETIQUETA_ESTADO[estado]}
          </option>
        ))}
      </select>
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
          placeholder="Buscar por cliente o #pedido"
          className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand sm:w-64"
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
        <div className="mt-4 relative overflow-x-auto rounded-xl border border-border">
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
                  <td className="px-4 py-3">{pedido.cliente}</td>
                  <td className="px-4 py-3">
                    {pedido.cajaNombre}
                    <p className="text-xs text-muted">{pedido.tematicaNombre}</p>
                  </td>
                  <td className="px-4 py-3">
                    {formatoMoneda(pedido.total)}
                    <p className="text-xs text-muted">{ETIQUETA_PAGO[pedido.metodoPago]}</p>
                  </td>
                  <td className="px-4 py-3">
                    {selectorEstado(pedido)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDetalleId(pedido.id)}
                      aria-label={`Ver detalle del pedido #${pedido.id.slice(0, 8)}`}
                      className="whitespace-nowrap rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                    >
                      Ver detalle
                    </button>
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
            <p className="text-muted">
              {formatearFechaHora(detalle.creadoEn)}
              {detalle.tipo === "suscripcion" && " · Generado por una suscripción"}
            </p>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</h3>
              <p className="mt-1 font-medium">{detalle.cliente}</p>
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
              <p className="mt-1">{detalle.direccion || "—"}</p>
              {detalle.zonaNombre && <p className="text-xs text-muted">Zona: {detalle.zonaNombre}</p>}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Qué lleva</h3>
              <p className="mt-1 font-medium">
                {detalle.cajaNombre} · {detalle.tematicaNombre}
              </p>
              {detalle.items.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {detalle.items.map((it) => (
                    <li key={it.productoId} className="flex justify-between gap-3">
                      <span>
                        {it.cantidad}× {it.nombre}
                      </span>
                      <span className="text-muted">{formatoMoneda(it.cantidad * it.precioUnitario)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  {detalle.tipo === "suscripcion"
                    ? "Caja sorpresa de suscripción: elegí vos los productos según la temática."
                    : "Sin productos extra."}
                </p>
              )}
            </section>

            <section className="space-y-1 rounded-xl border border-border p-4">
              {detalle.tipo === "unico" && (
                <>
                  <div className="flex justify-between text-muted">
                    <span>Caja</span>
                    <span>{formatoMoneda(detalle.total - detalle.subtotal - detalle.costoEnvio)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Productos</span>
                    <span>{formatoMoneda(detalle.subtotal)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-muted">
                <span>Envío</span>
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
              {detalle.metodoPago === "transferencia" &&
                (detalle.comprobanteUrl ? (
                  <button
                    type="button"
                    onClick={() => verComprobante(detalle.comprobanteUrl!)}
                    className="mt-2 rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                  >
                    Ver comprobante de transferencia
                  </button>
                ) : (
                  <p className="text-xs text-muted">El cliente todavía no subió el comprobante.</p>
                ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Estado</p>
                <div className="mt-1">
                  {selectorEstado(detalle)}
                </div>
              </div>
              <div>
                <label
                  htmlFor="detalle-repartidor"
                  className="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Repartidor
                </label>
                <select
                  id="detalle-repartidor"
                  value={detalle.repartidorId ?? ""}
                  disabled={guardando === detalle.id || repartidores.length === 0}
                  onChange={(e) => actualizarRepartidor(detalle.id, e.target.value)}
                  className="mt-1 block rounded-lg border border-muted/70 bg-transparent px-2 py-1 disabled:opacity-50"
                >
                  <option value="" className="bg-background">
                    {repartidores.length === 0 ? "Sin repartidores" : "Sin asignar"}
                  </option>
                  {repartidores.map((r) => (
                    <option key={r.id} value={r.id} className="bg-background">
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
}
