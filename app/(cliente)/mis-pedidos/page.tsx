import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MisPedidosList, type MiPedido } from "@/components/cliente/MisPedidosList";

export const metadata: Metadata = { title: "Mis pedidos — Memento" };

export default async function MisPedidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/mis-pedidos");

  const { data } = await supabase
    .from("pedidos")
    .select(
      "id, total, costo_envio, estado, metodo_pago, tipo, direccion_entrega, comprobante_url, creado_en, cajas(nombre), tematicas(nombre), pedido_items(producto_id, cantidad, precio_unitario, productos(nombre))"
    )
    .eq("usuario_id", user.id)
    .order("creado_en", { ascending: false });

  const pedidos: MiPedido[] = (data ?? []).map((row) => {
    const p = row as unknown as {
      id: string;
      total: number;
      costo_envio: number;
      estado: MiPedido["estado"];
      metodo_pago: MiPedido["metodoPago"];
      tipo: MiPedido["tipo"];
      direccion_entrega: string;
      comprobante_url: string | null;
      creado_en: string;
      cajas: { nombre: string } | null;
      tematicas: { nombre: string } | null;
      pedido_items: { producto_id: string; cantidad: number; precio_unitario: number; productos: { nombre: string } | null }[];
    };
    return {
      id: p.id,
      total: Number(p.total),
      costoEnvio: Number(p.costo_envio),
      estado: p.estado,
      metodoPago: p.metodo_pago,
      tipo: p.tipo,
      direccion: p.direccion_entrega,
      tieneComprobante: !!p.comprobante_url,
      creadoEn: p.creado_en,
      cajaNombre: p.cajas?.nombre ?? "Caja",
      tematicaNombre: p.tematicas?.nombre ?? "",
      items: (p.pedido_items ?? []).map((it) => ({
        id: it.producto_id,
        nombre: it.productos?.nombre ?? "Producto",
        cantidad: it.cantidad,
        subtotal: it.cantidad * Number(it.precio_unitario),
      })),
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="animate-fade-in-up text-2xl font-semibold">Mis pedidos</h1>
      <p className="animate-fade-in-up mt-1 text-sm text-muted [animation-delay:60ms]">
        El estado de cada caja que armaste, en un solo lugar.
      </p>

      {pedidos.length === 0 ? (
        <div className="animate-fade-in-up mt-8 rounded-2xl border border-muted/30 bg-surface p-8 text-center [animation-delay:120ms]">
          <span aria-hidden="true" className="text-3xl">
            🎁
          </span>
          <p className="mt-3 font-medium">Todavía no armaste tu primera caja.</p>
          <p className="mt-1 text-sm text-muted">Elegí una caja, sumale tu toque y convertila en un regalo.</p>
          <Link
            href="/armar"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
          >
            Armar mi caja
          </Link>
        </div>
      ) : (
        <MisPedidosList usuarioId={user.id} pedidosIniciales={pedidos} />
      )}
    </div>
  );
}
