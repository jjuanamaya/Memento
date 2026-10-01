import { PedidosTable, type PedidoAdminRow } from "@/components/admin/PedidosTable";
import { fetchRepartidores } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPedidosPage() {
  const supabase = await createClient();

  const [{ data, error }, repartidores] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, total, subtotal, costo_envio, estado, metodo_pago, tipo, direccion_entrega, comprobante_url, creado_en, repartidor_id, cajas(nombre), tematicas(nombre), zonas_reparto(nombre), pedido_items(producto_id, cantidad, precio_unitario, productos(nombre)), perfiles!pedidos_usuario_id_fkey(nombre, apellido, telefono)"
      )
      .order("creado_en", { ascending: false }),
    fetchRepartidores(),
  ]);

  const pedidos: PedidoAdminRow[] = (data ?? []).map((row) => {
    const p = row as unknown as {
      id: string;
      total: number;
      subtotal: number;
      costo_envio: number;
      estado: PedidoAdminRow["estado"];
      metodo_pago: PedidoAdminRow["metodoPago"];
      tipo: PedidoAdminRow["tipo"];
      direccion_entrega: string;
      comprobante_url: string | null;
      creado_en: string;
      repartidor_id: string | null;
      cajas: { nombre: string } | null;
      tematicas: { nombre: string } | null;
      zonas_reparto: { nombre: string } | null;
      pedido_items: {
        producto_id: string;
        cantidad: number;
        precio_unitario: number;
        productos: { nombre: string } | null;
      }[];
      perfiles: { nombre: string; apellido: string | null; telefono: string | null } | null;
    };

    return {
      id: p.id,
      total: Number(p.total),
      subtotal: Number(p.subtotal),
      costoEnvio: Number(p.costo_envio),
      estado: p.estado,
      metodoPago: p.metodo_pago,
      tipo: p.tipo,
      cliente: [p.perfiles?.nombre, p.perfiles?.apellido].filter(Boolean).join(" ") || "—",
      telefono: p.perfiles?.telefono ?? null,
      cajaNombre: p.cajas?.nombre ?? "—",
      tematicaNombre: p.tematicas?.nombre ?? "—",
      direccion: p.direccion_entrega,
      zonaNombre: p.zonas_reparto?.nombre ?? null,
      comprobanteUrl: p.comprobante_url,
      creadoEn: p.creado_en,
      repartidorId: p.repartidor_id,
      items: (p.pedido_items ?? []).map((it) => ({
        productoId: it.producto_id,
        nombre: it.productos?.nombre ?? "Producto",
        cantidad: it.cantidad,
        precioUnitario: Number(it.precio_unitario),
      })),
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <p className="mt-1 text-sm text-muted">
        Tocá &quot;Ver detalle&quot; para ver la dirección, los productos y el comprobante de cada pedido.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">No se pudieron cargar los pedidos.</p>}

      <PedidosTable pedidosIniciales={pedidos} repartidores={repartidores} />
    </div>
  );
}
