"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import type { CategoriaProducto, Producto } from "@/lib/types";

const CATEGORIAS: { value: CategoriaProducto; label: string }[] = [
  { value: "snack", label: "Snack" },
  { value: "dulce", label: "Dulce" },
  { value: "bebida", label: "Bebida" },
  { value: "otro", label: "Otro" },
];

interface ProductoFormProps {
  producto?: Producto;
  onClose: () => void;
  onSaved: (producto: Producto) => void;
}

export function ProductoForm({ producto, onClose, onSaved }: ProductoFormProps) {
  const esEdicion = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [categoria, setCategoria] = useState<CategoriaProducto>(producto?.categoria ?? "snack");
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
    const stockActualNum = Number(stockActual);
    const stockMinimoNum = Number(stockMinimo);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
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
      categoria,
      precio: precioNum,
      stock_actual: stockActualNum,
      stock_minimo: stockMinimoNum,
      imagen_url: imagenUrl.trim() || null,
      activo,
    };

    const resultado = esEdicion
      ? await supabase.from("productos").update(payload).eq("id", producto!.id).select().single()
      : await supabase.from("productos").insert(payload).select().single();

    setGuardando(false);

    if (resultado.error || !resultado.data) {
      setError(esEdicion ? "No se pudo guardar el producto. Probá de nuevo." : "No se pudo crear el producto. Probá de nuevo.");
      return;
    }

    const p = resultado.data;
    onSaved({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      precio: Number(p.precio),
      categoria: p.categoria,
      imagen: p.imagen_url ?? "",
      stockActual: p.stock_actual,
      stockMinimo: p.stock_minimo,
      activo: p.activo,
    });
  }

  return (
    <Modal titulo={esEdicion ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaProducto)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value} className="bg-background">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Precio</label>
            <input
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Stock actual</label>
            <input
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
            <label className="mb-1 block text-xs font-medium text-muted">Stock mínimo</label>
            <input
              inputMode="numeric"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">URL de imagen (opcional)</label>
          <input
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
