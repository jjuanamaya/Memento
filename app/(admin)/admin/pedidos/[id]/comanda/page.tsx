import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { fetchPedidosAdmin } from "@/lib/supabase/queries";
import { ETIQUETA_ENTREGA, ETIQUETA_ESTADO } from "@/lib/types";
import { formatearFechaHora, formatoMoneda } from "@/lib/fechas";
import { ImprimirButton } from "@/components/admin/stock/ImprimirButton";

export default async function ComandaPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Un id con formato inválido hace fallar la consulta: se trata como "no existe".
  let pedido;
  try {
    [pedido] = await fetchPedidosAdmin(id);
  } catch (error) {
    unstable_rethrow(error);
  }

  if (!pedido) notFound();

  const cobrar = pedido.metodoPago === "efectivo";

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/admin/pedidos" className="text-sm text-muted hover:text-foreground">
          ← Volver a pedidos
        </Link>
        <ImprimirButton texto="Imprimir comanda" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 text-sm print:border-none print:bg-white print:p-0 print:text-black">
        <div className="flex items-start justify-between border-b border-dashed border-border pb-4 print:border-black/40">
          <div>
            <p className="text-lg font-semibold uppercase tracking-wide">Memento</p>
            <p className="text-xs text-muted print:text-black/60">Comanda de pedido</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-base font-semibold">#{pedido.id.slice(0, 8)}</p>
            <p className="text-xs text-muted print:text-black/60">{formatearFechaHora(pedido.creadoEn)}</p>
            <p className="text-xs text-muted print:text-black/60">{ETIQUETA_ESTADO[pedido.estado]}</p>
          </div>
        </div>

        <section className="border-b border-dashed border-border py-4 print:border-black/40">
          <p className="text-xs uppercase tracking-wide text-muted print:text-black/60">Cliente</p>
          <p className="mt-1 font-medium">
            {pedido.cliente}
            {pedido.numeroCliente !== null && ` · N° ${pedido.numeroCliente}`}
          </p>
          {pedido.telefono && <p>Tel: {pedido.telefono}</p>}
        </section>

        <section className="border-b border-dashed border-border py-4 print:border-black/40">
          <p className="text-xs uppercase tracking-wide text-muted print:text-black/60">
            {ETIQUETA_ENTREGA[pedido.tipoEntrega]}
          </p>
          {pedido.tipoEntrega === "envio" && <p className="mt-1 text-base font-medium">{pedido.direccion || "—"}</p>}
          {pedido.comentario && <p className="mt-1 italic">“{pedido.comentario}”</p>}
        </section>

        <section className="border-b border-dashed border-border py-4 print:border-black/40">
          <p className="text-xs uppercase tracking-wide text-muted print:text-black/60">Armar</p>
          <p className="mt-1 text-base font-semibold">
            {pedido.cajaNombre}
            {pedido.tematicaNombre && ` · ${pedido.tematicaNombre}`}
          </p>
          {pedido.items.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {pedido.items.map((it) => (
                <li key={it.productoId} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 flex-shrink-0 rounded border border-muted print:border-black"
                  />
                  <span className="font-mono font-semibold">{it.cantidad}×</span>
                  <span>{it.nombre}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted print:text-black/60">
              {pedido.tipo === "suscripcion" ? "Caja sorpresa: elegir productos según la temática." : "Sin productos cargados."}
            </p>
          )}
        </section>

        <section className="space-y-1 py-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatoMoneda(pedido.total - pedido.costoEnvio)}</span>
          </div>
          <div className="flex justify-between">
            <span>{pedido.tipoEntrega === "retiro" ? "Retiro" : "Envío"}</span>
            <span>{pedido.costoEnvio === 0 ? "Sin cargo" : formatoMoneda(pedido.costoEnvio)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold print:border-black/40">
            <span>Total</span>
            <span>{formatoMoneda(pedido.total)}</span>
          </div>
          <p className="pt-2 text-center text-base font-semibold">
            {cobrar
              ? `COBRAR EN EFECTIVO: ${formatoMoneda(pedido.total)}`
              : pedido.tipo === "suscripcion"
                ? "SUSCRIPCIÓN · SE PAGA POR PERÍODO"
                : pedido.comprobanteUrl
                  ? "PAGADO POR TRANSFERENCIA"
                  : "TRANSFERENCIA · VERIFICAR PAGO"}
          </p>
        </section>
      </div>
    </div>
  );
}
