"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO, type EstadoPedido, type Repartidor } from "@/lib/types";

export interface PedidoAdminRow {
  id: string;
  total: number;
  estado: EstadoPedido;
  metodo_pago: string;
  cliente: string;
  cajaNombre: string;
  tematicaNombre: string;
  repartidorId: string | null;
}

export function PedidosTable({
  pedidosIniciales,
  repartidores,
}: {
  pedidosIniciales: PedidoAdminRow[];
  repartidores: Repartidor[];
}) {
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function actualizarEstado(id: string, estado: EstadoPedido) {
    setGuardando(id);
    setError("");
    const supabase = createClient();
    const { error: errorUpdate } = await supabase.from("pedidos").update({ estado }).eq("id", id);
    setGuardando(null);

    if (errorUpdate) {
      setError(`No se pudo actualizar el pedido #${id.slice(0, 8)}. Probá de nuevo.`);
      return;
    }

    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
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

  if (pedidos.length === 0) {
    return <p className="mt-6 text-sm text-muted">Todavía no hay pedidos.</p>;
  }

  return (
    <div className="mt-6">
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Caja</th>
            <th className="px-4 py-3">Pago</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Repartidor</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id} className="border-t border-border">
              <td className="px-4 py-3">#{pedido.id.slice(0, 8)}</td>
              <td className="px-4 py-3">{pedido.cliente}</td>
              <td className="px-4 py-3">
                {pedido.cajaNombre} · {pedido.tematicaNombre}
              </td>
              <td className="px-4 py-3 capitalize">{pedido.metodo_pago}</td>
              <td className="px-4 py-3">${pedido.total}</td>
              <td className="px-4 py-3">
                <select
                  value={pedido.estado}
                  disabled={guardando === pedido.id}
                  onChange={(e) => actualizarEstado(pedido.id, e.target.value as EstadoPedido)}
                  className="rounded-lg border border-muted/70 bg-transparent px-2 py-1 disabled:opacity-50"
                >
                  {ESTADOS_PEDIDO.map((estado) => (
                    <option key={estado} value={estado} className="bg-background">
                      {ETIQUETA_ESTADO[estado]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  value={pedido.repartidorId ?? ""}
                  disabled={guardando === pedido.id || repartidores.length === 0}
                  onChange={(e) => actualizarRepartidor(pedido.id, e.target.value)}
                  className="rounded-lg border border-muted/70 bg-transparent px-2 py-1 disabled:opacity-50"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
