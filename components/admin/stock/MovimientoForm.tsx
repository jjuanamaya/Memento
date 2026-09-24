"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import type { Proveedor, TipoMovimientoStock } from "@/lib/types";

interface MovimientoFormProps {
  producto: { id: string; nombre: string; stockActual: number };
  proveedores: Proveedor[];
  onClose: () => void;
  onSaved: (nuevoStock: number) => void;
}

export function MovimientoForm({ producto, proveedores, onClose, onSaved }: MovimientoFormProps) {
  const [tipo, setTipo] = useState<TipoMovimientoStock>("entrada");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const cantidadNum = Number(cantidad);
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setError("La cantidad tiene que ser un número entero mayor a 0.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();

    const { error: errorRpc } = await supabase.rpc("registrar_movimiento_stock", {
      p_producto_id: producto.id,
      p_tipo: tipo,
      p_cantidad: cantidadNum,
      p_motivo: motivo.trim() || null,
      p_proveedor_id: tipo === "entrada" && proveedorId ? proveedorId : null,
      p_costo_unitario: tipo === "entrada" && costoUnitario ? Number(costoUnitario) : null,
    });

    setGuardando(false);

    if (errorRpc) {
      setError(errorRpc.message || "No se pudo registrar el movimiento. Probá de nuevo.");
      return;
    }

    const nuevoStock = producto.stockActual + (tipo === "entrada" ? cantidadNum : -cantidadNum);
    onSaved(nuevoStock);
  }

  return (
    <Modal titulo={`Registrar movimiento — ${producto.nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-muted">Stock actual: {producto.stockActual} unidades</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo("entrada")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              tipo === "entrada" ? "border-brand bg-brand/15 text-brand" : "border-muted/70 text-muted"
            }`}
          >
            Entrada (+)
          </button>
          <button
            type="button"
            onClick={() => setTipo("salida")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              tipo === "salida" ? "border-brand bg-brand/15 text-brand" : "border-muted/70 text-muted"
            }`}
          >
            Salida (-)
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Cantidad</label>
          <input
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        {tipo === "entrada" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Proveedor (opcional)</label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="" className="bg-background">
                  Sin especificar
                </option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id} className="bg-background">
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Costo unitario (opcional)</label>
              <input
                inputMode="decimal"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                placeholder="$"
                className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Motivo (opcional)</label>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={tipo === "entrada" ? "Ej: compra mensual" : "Ej: producto vencido, ajuste de conteo"}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

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
            {guardando ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
