import Link from "next/link";
import { ETIQUETA_TIPO_MOVIMIENTO, type MovimientoStock } from "@/lib/types";

export function MovimientosTable({ movimientos }: { movimientos: MovimientoStock[] }) {
  if (movimientos.length === 0) {
    return <p className="mt-6 text-sm text-muted">Todavía no hay movimientos de stock registrados.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Cantidad</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">Motivo</th>
            <th className="px-4 py-3">Registrado por</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id} className="border-t border-border align-top">
              <td className="px-4 py-3 text-muted">{new Date(m.creadoEn).toLocaleDateString("es-AR")}</td>
              <td className="px-4 py-3 font-medium">{m.productoNombre}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    m.tipo === "entrada"
                      ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                      : "rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400"
                  }
                >
                  {ETIQUETA_TIPO_MOVIMIENTO[m.tipo]}
                </span>
              </td>
              <td className="px-4 py-3">{m.tipo === "entrada" ? "+" : "-"}{m.cantidad}</td>
              <td className="px-4 py-3 text-muted">{m.proveedorNombre ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{m.motivo ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{m.usuarioNombre}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/stock/movimientos/${m.id}`}
                  className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                >
                  Ver / imprimir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
