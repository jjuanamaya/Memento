import { PedidosTable, type PedidoAdminRow } from "@/components/admin/PedidosTable";
import { fetchRepartidores } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPedidosPage() {
  const supabase = await createClient();

  const [{ data, error }, repartidores] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, total, estado, metodo_pago, repartidor_id, cajas(nombre), tematicas(nombre), perfiles!pedidos_usuario_id_fkey(nombre, apellido)"
      )
      .order("creado_en", { ascending: false }),
    fetchRepartidores(),
  ]);

  const pedidos: PedidoAdminRow[] = (data ?? []).map((row) => {
    const p = row as unknown as {
      id: string;
      total: number;
      estado: PedidoAdminRow["estado"];
      metodo_pago: string;
      repartidor_id: string | null;
      cajas: { nombre: string } | null;
      tematicas: { nombre: string } | null;
      perfiles: { nombre: string; apellido: string | null } | null;
    };

    return {
      id: p.id,
      total: Number(p.total),
      estado: p.estado,
      metodo_pago: p.metodo_pago,
      cliente: [p.perfiles?.nombre, p.perfiles?.apellido].filter(Boolean).join(" ") || "—",
      cajaNombre: p.cajas?.nombre ?? "—",
      tematicaNombre: p.tematicas?.nombre ?? "—",
      repartidorId: p.repartidor_id,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <p className="mt-1 text-sm text-muted">Datos reales desde Supabase.</p>

      {error && <p className="mt-4 text-sm text-red-400">No se pudieron cargar los pedidos.</p>}

      <PedidosTable pedidosIniciales={pedidos} repartidores={repartidores} />
    </div>
  );
}
