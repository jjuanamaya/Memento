"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProductoForm } from "@/components/admin/stock/ProductoForm";
import { MovimientoForm } from "@/components/admin/stock/MovimientoForm";
import type { Producto, Proveedor } from "@/lib/types";

type ModalState =
  | { tipo: "crear" }
  | { tipo: "editar"; producto: Producto }
  | { tipo: "movimiento"; producto: Producto }
  | null;

export function ProductosTable({
  productosIniciales,
  proveedores,
}: {
  productosIniciales: Producto[];
  proveedores: Proveedor[];
}) {
  const [productos, setProductos] = useState(productosIniciales);
  const [modal, setModal] = useState<ModalState>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function actualizarProducto(actualizado: Producto) {
    setProductos((prev) => {
      const existe = prev.some((p) => p.id === actualizado.id);
      if (existe) return prev.map((p) => (p.id === actualizado.id ? actualizado : p));
      return [actualizado, ...prev];
    });
    setModal(null);
    setMensaje(`"${actualizado.nombre}" se guardó correctamente.`);
    setError("");
  }

  function actualizarStockLocal(productoId: string, nuevoStock: number) {
    setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, stockActual: nuevoStock } : p)));
    setModal(null);
    setMensaje("Movimiento registrado correctamente.");
    setError("");
  }

  async function eliminarProducto(producto: Producto) {
    const confirmado = window.confirm(
      `¿Eliminar "${producto.nombre}"? Si tiene pedidos o movimientos registrados, se va a desactivar en vez de borrarse definitivamente.`
    );
    if (!confirmado) return;

    setEliminando(producto.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    const [{ count: countItems }, { count: countMov }] = await Promise.all([
      supabase.from("pedido_items").select("id", { count: "exact", head: true }).eq("producto_id", producto.id),
      supabase.from("movimientos_stock").select("id", { count: "exact", head: true }).eq("producto_id", producto.id),
    ]);

    const tieneHistorial = (countItems ?? 0) > 0 || (countMov ?? 0) > 0;

    if (tieneHistorial) {
      const { error: errorUpdate } = await supabase.from("productos").update({ activo: false }).eq("id", producto.id);
      setEliminando(null);

      if (errorUpdate) {
        setError(`No se pudo desactivar "${producto.nombre}". Probá de nuevo.`);
        return;
      }

      setProductos((prev) => prev.map((p) => (p.id === producto.id ? { ...p, activo: false } : p)));
      setMensaje(`"${producto.nombre}" tiene historial de pedidos o movimientos, así que se desactivó en vez de borrarse.`);
      return;
    }

    const { error: errorDelete } = await supabase.from("productos").delete().eq("id", producto.id);
    setEliminando(null);

    if (errorDelete) {
      setError(`No se pudo eliminar "${producto.nombre}". Probá de nuevo.`);
      return;
    }

    setProductos((prev) => prev.filter((p) => p.id !== producto.id));
    setMensaje(`"${producto.nombre}" se eliminó.`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Datos reales desde Supabase.</p>
        <button
          onClick={() => setModal({ tipo: "crear" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          + Nuevo producto
        </button>
      </div>

      {mensaje && <p className="mt-3 text-sm text-emerald-400">{mensaje}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {productos.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no hay productos cargados.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => {
                const sinStock = producto.stockActual === 0;
                const stockBajo = !sinStock && producto.stockActual <= producto.stockMinimo;
                return (
                  <tr key={producto.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-medium">{producto.nombre}</td>
                    <td className="px-4 py-3 capitalize text-muted">{producto.categoria}</td>
                    <td className="px-4 py-3">${producto.precio}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          sinStock
                            ? "rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400"
                            : stockBajo
                              ? "rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-medium text-yellow-400"
                              : "text-foreground"
                        }
                      >
                        {sinStock ? "Sin stock" : `${producto.stockActual} unidades`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          producto.activo
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                            : "rounded-full bg-muted/15 px-3 py-1 text-xs font-medium text-muted"
                        }
                      >
                        {producto.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setModal({ tipo: "movimiento", producto })}
                          className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                        >
                          +/- Stock
                        </button>
                        <button
                          onClick={() => setModal({ tipo: "editar", producto })}
                          className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarProducto(producto)}
                          disabled={eliminando === producto.id}
                          className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {eliminando === producto.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal?.tipo === "crear" && <ProductoForm onClose={() => setModal(null)} onSaved={actualizarProducto} />}
      {modal?.tipo === "editar" && (
        <ProductoForm producto={modal.producto} onClose={() => setModal(null)} onSaved={actualizarProducto} />
      )}
      {modal?.tipo === "movimiento" && (
        <MovimientoForm
          producto={modal.producto}
          proveedores={proveedores}
          onClose={() => setModal(null)}
          onSaved={(nuevoStock) => actualizarStockLocal(modal.producto.id, nuevoStock)}
        />
      )}
    </div>
  );
}
