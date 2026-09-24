import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchMovimientoStock } from "@/lib/supabase/queries";
import { ETIQUETA_TIPO_MOVIMIENTO } from "@/lib/types";
import { ImprimirButton } from "@/components/admin/stock/ImprimirButton";

export default async function ComprobanteMovimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movimiento = await fetchMovimientoStock(id);

  if (!movimiento) notFound();

  const total =
    movimiento.costoUnitario !== null ? movimiento.costoUnitario * movimiento.cantidad : null;
  const fecha = new Date(movimiento.creadoEn);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/admin/stock/movimientos" className="text-sm text-muted hover:text-foreground">
          ← Volver a movimientos
        </Link>
        <ImprimirButton />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8 print:border-none print:bg-white print:p-0 print:text-black">
        <div className="flex items-center justify-between border-b border-border pb-4 print:border-black/20">
          <div>
            <p className="text-lg font-semibold uppercase tracking-wide">Memento</p>
            <p className="text-xs text-muted print:text-black/60">Comprobante interno de stock</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted print:text-black/60">Comprobante</p>
            <p className="font-mono text-sm">#{movimiento.id.slice(0, 8)}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted print:text-black/60">Tipo de movimiento</p>
            <p className="mt-1 font-medium">{ETIQUETA_TIPO_MOVIMIENTO[movimiento.tipo]}</p>
          </div>
          <div>
            <p className="text-xs text-muted print:text-black/60">Fecha</p>
            <p className="mt-1 font-medium">
              {fecha.toLocaleDateString("es-AR")} · {fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted print:text-black/60">Producto</p>
            <p className="mt-1 font-medium">{movimiento.productoNombre}</p>
          </div>
          <div>
            <p className="text-xs text-muted print:text-black/60">Cantidad</p>
            <p className="mt-1 font-medium">
              {movimiento.tipo === "entrada" ? "+" : "-"}
              {movimiento.cantidad} unidades
            </p>
          </div>
          {movimiento.proveedorNombre && (
            <div>
              <p className="text-xs text-muted print:text-black/60">Proveedor</p>
              <p className="mt-1 font-medium">{movimiento.proveedorNombre}</p>
            </div>
          )}
          {movimiento.costoUnitario !== null && (
            <div>
              <p className="text-xs text-muted print:text-black/60">Costo unitario</p>
              <p className="mt-1 font-medium">${movimiento.costoUnitario.toLocaleString("es-AR")}</p>
            </div>
          )}
        </div>

        {movimiento.motivo && (
          <div className="mt-4 text-sm">
            <p className="text-xs text-muted print:text-black/60">Motivo</p>
            <p className="mt-1">{movimiento.motivo}</p>
          </div>
        )}

        {total !== null && (
          <div className="mt-6 flex justify-between border-t border-border pt-4 text-base font-semibold print:border-black/20">
            <span>Total</span>
            <span>${total.toLocaleString("es-AR")}</span>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4 text-xs text-muted print:border-black/20 print:text-black/60">
          Registrado por {movimiento.usuarioNombre}. Este comprobante es un registro interno de Memento, no reemplaza una factura fiscal.
        </div>
      </div>
    </div>
  );
}
