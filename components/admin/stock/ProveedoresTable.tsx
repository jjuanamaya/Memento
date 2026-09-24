"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProveedorForm } from "@/components/admin/stock/ProveedorForm";
import type { Proveedor } from "@/lib/types";

type ModalState = { tipo: "crear" } | { tipo: "editar"; proveedor: Proveedor } | null;

export function ProveedoresTable({ proveedoresIniciales }: { proveedoresIniciales: Proveedor[] }) {
  const [proveedores, setProveedores] = useState(proveedoresIniciales);
  const [modal, setModal] = useState<ModalState>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function guardarProveedor(actualizado: Proveedor) {
    setProveedores((prev) => {
      const existe = prev.some((p) => p.id === actualizado.id);
      if (existe) return prev.map((p) => (p.id === actualizado.id ? actualizado : p));
      return [actualizado, ...prev];
    });
    setModal(null);
    setMensaje(`"${actualizado.nombre}" se guardó correctamente.`);
    setError("");
  }

  async function eliminarProveedor(proveedor: Proveedor) {
    const confirmado = window.confirm(
      `¿Eliminar "${proveedor.nombre}"? Si tiene movimientos de stock registrados, se va a desactivar en vez de borrarse definitivamente.`
    );
    if (!confirmado) return;

    setEliminando(proveedor.id);
    setError("");
    setMensaje("");
    const supabase = createClient();

    const { count } = await supabase
      .from("movimientos_stock")
      .select("id", { count: "exact", head: true })
      .eq("proveedor_id", proveedor.id);

    if ((count ?? 0) > 0) {
      const { error: errorUpdate } = await supabase.from("proveedores").update({ activo: false }).eq("id", proveedor.id);
      setEliminando(null);

      if (errorUpdate) {
        setError(`No se pudo desactivar "${proveedor.nombre}". Probá de nuevo.`);
        return;
      }

      setProveedores((prev) => prev.map((p) => (p.id === proveedor.id ? { ...p, activo: false } : p)));
      setMensaje(`"${proveedor.nombre}" tiene movimientos registrados, así que se desactivó en vez de borrarse.`);
      return;
    }

    const { error: errorDelete } = await supabase.from("proveedores").delete().eq("id", proveedor.id);
    setEliminando(null);

    if (errorDelete) {
      setError(`No se pudo eliminar "${proveedor.nombre}". Probá de nuevo.`);
      return;
    }

    setProveedores((prev) => prev.filter((p) => p.id !== proveedor.id));
    setMensaje(`"${proveedor.nombre}" se eliminó.`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Datos reales desde Supabase.</p>
        <button
          onClick={() => setModal({ tipo: "crear" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          + Nuevo proveedor
        </button>
      </div>

      {mensaje && <p className="mt-3 text-sm text-emerald-400">{mensaje}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {proveedores.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no hay proveedores cargados.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-muted">{p.contacto ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.activo
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                          : "rounded-full bg-muted/15 px-3 py-1 text-xs font-medium text-muted"
                      }
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setModal({ tipo: "editar", proveedor: p })}
                        className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarProveedor(p)}
                        disabled={eliminando === p.id}
                        className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {eliminando === p.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.tipo === "crear" && <ProveedorForm onClose={() => setModal(null)} onSaved={guardarProveedor} />}
      {modal?.tipo === "editar" && (
        <ProveedorForm proveedor={modal.proveedor} onClose={() => setModal(null)} onSaved={guardarProveedor} />
      )}
    </div>
  );
}
