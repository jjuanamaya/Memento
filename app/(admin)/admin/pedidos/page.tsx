import { unstable_rethrow } from "next/navigation";
import { PedidosTable, type PedidoAdminRow } from "@/components/admin/PedidosTable";
import { fetchPedidosAdmin } from "@/lib/supabase/queries";

export default async function AdminPedidosPage() {
  let pedidos: PedidoAdminRow[] = [];
  let huboError = false;
  try {
    pedidos = await fetchPedidosAdmin();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error al cargar pedidos:", error);
    huboError = true;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <p className="mt-1 text-sm text-muted">
        Tocá &quot;Ver detalle&quot; para ver la entrega, los productos y el comprobante, o &quot;Imprimir
        comanda&quot;. Un pedido entregado o cancelado ya no cambia de estado.
      </p>

      {huboError && <p className="mt-4 text-sm text-red-400">No se pudieron cargar los pedidos.</p>}

      <PedidosTable pedidosIniciales={pedidos} />
    </div>
  );
}
