"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import { mapearProducto } from "@/lib/mapeos";
import type { CategoriaProducto, Producto, Proveedor } from "@/lib/types";

interface ProductoFormProps {
  producto?: Producto;
  categorias: CategoriaProducto[];
  proveedores: Proveedor[];
  onClose: () => void;
  onSaved: (producto: Producto) => void;
}

export function ProductoForm({ producto, categorias, proveedores, onClose, onSaved }: ProductoFormProps) {
  const esEdicion = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [categoriaId, setCategoriaId] = useState(producto?.categoriaId ?? categorias[0]?.id ?? "");
  const [proveedorId, setProveedorId] = useState(producto?.proveedorId ?? "");
  const [costo, setCosto] = useState(producto?.costo ? String(producto.costo) : "");
  const [precio, setPrecio] = useState(String(producto?.precio ?? ""));
  const [stockActual, setStockActual] = useState(String(producto?.stockActual ?? "0"));
  const [stockMinimo, setStockMinimo] = useState(String(producto?.stockMinimo ?? "5"));
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen ?? "");
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const precioNum = Number(precio);
    const costoNum = Number(costo || 0);
    const stockActualNum = Number(stockActual);
    const stockMinimoNum = Number(stockMinimo);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!categoriaId) {
      setError("Elegí una categoría (podés crearlas en Stock → Categorías).");
      return;
    }
    if (!Number.isFinite(costoNum) || costoNum < 0) {
      setError("El costo tiene que ser un número válido.");
      return;
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setError("El precio tiene que ser un número válido.");
      return;
    }
    if (!Number.isInteger(stockActualNum) || stockActualNum < 0) {
      setError("El stock actual tiene que ser un número entero, mayor o igual a 0.");
      return;
    }
    if (!Number.isInteger(stockMinimoNum) || stockMinimoNum < 0) {
      setError("El stock mínimo tiene que ser un número entero, mayor o igual a 0.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      categoria_id: categoriaId,
      proveedor_id: proveedorId || null,
      costo: costoNum,
      precio: precioNum,
      stock_actual: stockActualNum,
      stock_minimo: stockMinimoNum,
      imagen_url: imagenUrl.trim() || null,
      activo,
    };

    const resultado = esEdicion
      ? await supabase
          .from("productos")
          .update(payload)
          .eq("id", producto!.id)
          .select("*, categorias_producto(nombre)")
          .single()
      : await supabase.from("productos").insert(payload).select("*, categorias_producto(nombre)").single();

    setGuardando(false);

    if (resultado.error || !resultado.data) {
      console.error("Error al guardar el producto:", resultado.error);
      setError(esEdicion ? "No se pudo guardar el producto. Probá de nuevo." : "No se pudo crear el producto. Probá de nuevo.");
      return;
    }

    onSaved(mapearProducto(resultado.data));
  }

  const costoVista = Number(costo);
  const precioVista = Number(precio);
  const margen =
    costoVista > 0 && precioVista > 0 ? Math.round(((precioVista - costoVista) / costoVista) * 100) : null;

  return (
    <Modal titulo={esEdicion ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="producto-campo-1" className="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <input id="producto-campo-1"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label htmlFor="producto-campo-2" className="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <textarea id="producto-campo-2"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="producto-campo-3" className="mb-1 block text-xs font-medium text-muted">Categoría</label>
            <select id="producto-campo-3"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {categorias.length === 0 && (
                <option value="" className="bg-background">
                  Creá una categoría primero
                </option>
              )}
              {categorias.map((c) => (
                <option key={c.id} value={c.id} className="bg-background">
                  {c.nombre}
                  {!c.activa ? " (inactiva)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="producto-proveedor" className="mb-1 block text-xs font-medium text-muted">Proveedor</label>
            <select id="producto-proveedor"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="" className="bg-background">
                Sin proveedor
              </option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id} className="bg-background">
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="producto-costo" className="mb-1 block text-xs font-medium text-muted">Costo (lo que te sale)</label>
            <input id="producto-costo"
              inputMode="decimal"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="mt-1 text-[11px] text-muted">Con esto se calcula el precio de las cajas con temática.</p>
          </div>
          <div>
            <label htmlFor="producto-campo-4" className="mb-1 block text-xs font-medium text-muted">Precio de venta</label>
            <input id="producto-campo-4"
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="mt-1 text-[11px] text-muted">
              Lo que paga el cliente en la temática Personalizada{margen !== null ? ` · ganancia ${margen}%` : ""}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="producto-campo-5" className="mb-1 block text-xs font-medium text-muted">Stock actual</label>
            <input id="producto-campo-5"
              inputMode="numeric"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
            {esEdicion && (
              <p className="mt-1 text-[11px] text-muted">
                Para entradas o salidas del día a día, mejor usá &quot;Registrar movimiento&quot; — así queda el registro.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="producto-campo-6" className="mb-1 block text-xs font-medium text-muted">Stock mínimo</label>
            <input id="producto-campo-6"
              inputMode="numeric"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label htmlFor="producto-campo-7" className="mb-1 block text-xs font-medium text-muted">URL de imagen (opcional)</label>
          <input id="producto-campo-7"
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
          Producto activo (visible para clientes)
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-muted/70 px-4 py-2 text-sm font-medium hover:border-brand/40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
