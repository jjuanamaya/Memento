import { formatearFechaHora, formatoMoneda } from "@/lib/fechas";
import { ETIQUETA_ESTADO, type EstadoPedido, type MetodoPago, type TipoEntrega } from "@/lib/types";

export interface MiPedido {
  id: string;
  total: number;
  costoEnvio: number;
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  tipo: "unico" | "suscripcion";
  personalizada: boolean;
  tipoEntrega: TipoEntrega;
  direccion: string;
  comentario: string;
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
  efectivo: "Efectivo",
};

export function MisPedidosList({ pedidos }: { pedidos: MiPedido[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {pedidos.map((pedido, i) => (
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
                    {/* Solo la caja personalizada se cobra producto por producto. */}
                    {pedido.personalizada && <span>{formatoMoneda(it.subtotal)}</span>}
                  </div>
                ))
              ) : (
                <p>{pedido.tipo === "suscripcion" ? "Caja sorpresa de tu suscripción." : "Caja armada."}</p>
              )}
              <div className="flex justify-between gap-3 border-t border-border pt-2">
                <span>Subtotal</span>
                <span>{formatoMoneda(pedido.total - pedido.costoEnvio)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>{pedido.tipoEntrega === "retiro" ? "Retiro en el local" : "Envío"}</span>
                <span>{pedido.costoEnvio === 0 ? "Sin cargo" : formatoMoneda(pedido.costoEnvio)}</span>
              </div>
              <div className="flex justify-between gap-3 font-medium text-foreground">
                <span>Total</span>
                <span>{formatoMoneda(pedido.total)}</span>
              </div>
              {pedido.tipoEntrega === "envio" && pedido.direccion && (
                <p className="pt-1">Entrega en: {pedido.direccion}</p>
              )}
              {pedido.comentario && <p>Indicaciones: {pedido.comentario}</p>}
            </div>
          </details>

          {pedido.metodoPago === "transferencia" && pedido.tieneComprobante && (
            <p className="mt-2 text-xs text-emerald-400">Comprobante de transferencia recibido.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
