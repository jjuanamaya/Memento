"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import type { CategoriaProducto } from "@/lib/types";

const INPUT =
  "w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

type ModalState = { tipo: "crear" } | { tipo: "editar"; categoria: CategoriaProducto } | null;

function mapear(c: Record<string, unknown>): CategoriaProducto {
  return {
    id: c.id as string,
    nombre: c.nombre as string,
    icono: (c.icono as string | null) ?? "",
    orden: c.orden as number,
    activa: c.activa as boolean,
  };
}

function CategoriaForm({
  categoria,
  ordenSugerido,
  onClose,
  onSaved,
}: {
  categoria?: CategoriaProducto;
  ordenSugerido: number;
  onClose: () => void;
  onSaved: (categoria: CategoriaProducto) => void;
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [icono, setIcono] = useState(categoria?.icono ?? "");
  const [orden, setOrden] = useState(String(categoria?.orden ?? ordenSugerido));
  const [activa, setActiva] = useState(categoria?.activa ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const ordenNum = Number(orden);
    if (!nombre.trim() || nombre.trim().length > 40) {
      setError("El nombre es obligatorio (hasta 40 caracteres).");
      return;
    }
    if (!Number.isInteger(ordenNum)) {
      setError("El orden tiene que ser un número entero.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();
    const payload = { nombre: nombre.trim(), icono: icono.trim() || null, orden: ordenNum, activa };
    const resultado = categoria
      ? await supabase.from("categorias_producto").update(payload).eq("id", categoria.id).select().single()
      : await supabase.from("categorias_producto").insert(payload).select().single();
    setGuardando(false);

    if (resultado.error || !resultado.data) {
      setError(
        resultado.error?.code === "23505"
          ? "Ya existe una categoría con ese nombre."
          : "No se pudo guardar la categoría. Probá de nuevo."
      );
      return;
    }

    onSaved(mapear(resultado.data));
  }

  return (
    <Modal titulo={categoria ? "Editar categoría" : "Nueva categoría"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <div>
            <label htmlFor="categoria-nombre" className="mb-1 block text-xs font-medium text-muted">
              Nombre
            </label>
            <input
              id="categoria-nombre"
              value={nombre}
              maxLength={40}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Snacks salados"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="categoria-icono" className="mb-1 block text-xs font-medium text-muted">
              Ícono
            </label>
            <input
              id="categoria-icono"
              value={icono}
              maxLength={8}
              onChange={(e) => setIcono(e.target.value)}
              placeholder="🍿"
              className={`${INPUT} text-center`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="categoria-orden" className="mb-1 block text-xs font-medium text-muted">
            Orden (en qué lugar aparece al armar la caja)
          </label>
          <input
            id="categoria-orden"
            inputMode="numeric"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className={INPUT}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="h-4 w-4" />
          Categoría activa (se muestra a los clientes)
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

export function CategoriasTable({
  categoriasIniciales,
  productosPorCategoria,
}: {
  categoriasIniciales: CategoriaProducto[];
  productosPorCategoria: Record<string, number>;
}) {
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [modal, setModal] = useState<ModalState>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function guardar(actualizada: CategoriaProducto) {
    setCategorias((prev) => {
      const lista = prev.some((c) => c.id === actualizada.id)
        ? prev.map((c) => (c.id === actualizada.id ? actualizada : c))
        : [...prev, actualizada];
      return lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
    });
    setModal(null);
    setMensaje(`"${actualizada.nombre}" se guardó correctamente.`);
    setError("");
  }

  async function eliminar(categoria: CategoriaProducto) {
    const enUso = productosPorCategoria[categoria.id] ?? 0;
    if (enUso > 0) {
      setMensaje("");
      setError(
        `"${categoria.nombre}" tiene ${enUso} producto${enUso === 1 ? "" : "s"}. Pasalos a otra categoría o desactivala en vez de borrarla.`
      );
      return;
    }
    if (!window.confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;

    setEliminando(categoria.id);
    setError("");
    setMensaje("");
    const { error: errorDelete } = await createClient().from("categorias_producto").delete().eq("id", categoria.id);
    setEliminando(null);

    if (errorDelete) {
      setError(`No se pudo eliminar "${categoria.nombre}". Probá de nuevo.`);
      return;
    }
    setCategorias((prev) => prev.filter((c) => c.id !== categoria.id));
    setMensaje(`"${categoria.nombre}" se eliminó.`);
  }

  const ordenSugerido = (categorias.at(-1)?.orden ?? 0) + 1;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Agrupan los productos al armar la caja personalizada.</p>
        <button
          onClick={() => setModal({ tipo: "crear" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          + Nueva categoría
        </button>
      </div>

      {mensaje && <p className="mt-3 text-sm text-emerald-400">{mensaje}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {categorias.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no hay categorías.</p>
      ) : (
        <div className="relative mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Productos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted">{c.orden}</td>
                  <td className="px-4 py-3 font-medium">
                    {c.icono && <span aria-hidden="true">{c.icono} </span>}
                    {c.nombre}
                  </td>
                  <td className="px-4 py-3 text-muted">{productosPorCategoria[c.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.activa
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
                          : "rounded-full bg-muted/15 px-3 py-1 text-xs font-medium text-muted"
                      }
                    >
                      {c.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        aria-label={`Editar ${c.nombre}`}
                        onClick={() => setModal({ tipo: "editar", categoria: c })}
                        className="rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium hover:border-brand/40"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(c)}
                        disabled={eliminando === c.id}
                        className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {eliminando === c.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.tipo === "crear" && (
        <CategoriaForm ordenSugerido={ordenSugerido} onClose={() => setModal(null)} onSaved={guardar} />
      )}
      {modal?.tipo === "editar" && (
        <CategoriaForm
          categoria={modal.categoria}
          ordenSugerido={ordenSugerido}
          onClose={() => setModal(null)}
          onSaved={guardar}
        />
      )}
    </div>
  );
}
