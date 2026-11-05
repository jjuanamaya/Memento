"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import { borrarImagenCatalogo, subirImagenCatalogo } from "@/components/admin/catalogo/imagenCatalogo";
import { mapearTematica, SELECT_TEMATICA } from "@/lib/mapeos";
import type { Producto, Tematica } from "@/lib/types";

interface TematicaFormProps {
  tematica?: Tematica;
  productos: Producto[];
  onClose: () => void;
  onSaved: (tematica: Tematica) => void;
}

export function TematicaForm({ tematica, productos, onClose, onSaved }: TematicaFormProps) {
  const esEdicion = !!tematica;
  const esPersonalizada = !!tematica?.personalizada;

  const [nombre, setNombre] = useState(tematica?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(tematica?.descripcion ?? "");
  const [productoIds, setProductoIds] = useState<string[]>(tematica?.productoIds ?? []);
  const [imagenUrl, setImagenUrl] = useState(tematica?.imagen ?? "");
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState(tematica?.imagen ?? "");
  const [activa, setActiva] = useState(tematica?.activa ?? true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState("");

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setArchivoNuevo(archivo);
    setPrevisualizacion(URL.createObjectURL(archivo));
  }

  function quitarImagen() {
    setArchivoNuevo(null);
    setImagenUrl("");
    setPrevisualizacion("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    const supabase = createClient();
    let urlFinal = imagenUrl;

    if (archivoNuevo) {
      setSubiendoImagen(true);
      try {
        urlFinal = await subirImagenCatalogo(supabase, archivoNuevo, "tematicas");
      } catch {
        setSubiendoImagen(false);
        setError("No se pudo subir la imagen. Probá con otro archivo.");
        return;
      }
      setSubiendoImagen(false);
      if (esEdicion && tematica?.imagen && tematica.imagen !== urlFinal) {
        borrarImagenCatalogo(supabase, tematica.imagen).catch(() => {});
      }
    } else if (esEdicion && tematica?.imagen && !imagenUrl) {
      borrarImagenCatalogo(supabase, tematica.imagen).catch(() => {});
    }

    setGuardando(true);

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      imagen_url: urlFinal || null,
      activa,
    };

    const resultado = esEdicion
      ? await supabase.from("tematicas").update(payload).eq("id", tematica!.id).select("id").single()
      : await supabase.from("tematicas").insert(payload).select("id").single();

    if (resultado.error || !resultado.data) {
      console.error("Error al guardar la temática:", resultado.error);
      setGuardando(false);
      setError(esEdicion ? "No se pudo guardar la temática. Probá de nuevo." : "No se pudo crear la temática. Probá de nuevo.");
      return;
    }

    const tematicaId = resultado.data.id as string;

    // Reemplaza los productos con los que se llena la caja.
    let errorContenido = null;
    if (!esPersonalizada) {
      const { error: errorBorrar } = await supabase.from("tematica_productos").delete().eq("tematica_id", tematicaId);
      errorContenido = errorBorrar;
      if (!errorBorrar && productoIds.length > 0) {
        const { error: errorInsert } = await supabase
          .from("tematica_productos")
          .insert(productoIds.map((productoId) => ({ tematica_id: tematicaId, producto_id: productoId })));
        errorContenido = errorInsert;
      }
    }

    const { data: final } = await supabase.from("tematicas").select(SELECT_TEMATICA).eq("id", tematicaId).single();
    setGuardando(false);

    if (errorContenido) {
      console.error("Error al guardar los productos de la temática:", errorContenido);
      setError("La temática se guardó, pero no sus productos. Revisalos y guardá de nuevo.");
      return;
    }
    if (!final) {
      setError("La temática se guardó, pero no se pudo recargar. Actualizá la página.");
      return;
    }

    onSaved(mapearTematica(final));
  }

  function alternarProducto(id: string) {
    setProductoIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <Modal titulo={esEdicion ? "Editar temática" : "Nueva temática"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="tematica-campo-1" className="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <input id="tematica-campo-1"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label htmlFor="tematica-campo-2" className="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <textarea id="tematica-campo-2"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        {esPersonalizada ? (
          <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm">
            Esta es la temática <strong>Personalizada</strong>: el cliente elige cada producto, así que no lleva
            productos fijos.
          </p>
        ) : (
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-1 text-xs font-medium text-muted">
              Productos con los que se llena la caja ({productoIds.length})
            </legend>
            <p className="text-[11px] text-muted">
              La caja se llena hasta su capacidad repartiendo estos productos según el stock que haya.
            </p>
            <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
              {productos.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-background">
                  <input
                    type="checkbox"
                    checked={productoIds.includes(p.id)}
                    onChange={() => alternarProducto(p.id)}
                    className="h-4 w-4"
                  />
                  <span className="truncate">
                    {p.nombre}
                    {!p.activo && <span className="text-muted"> (inactivo)</span>}
                    {p.costo <= 0 && <span className="text-yellow-400"> · sin costo</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="tematica-foto" className="mb-1 block text-xs font-medium text-muted">Foto de la temática</label>
          {previsualizacion ? (
            <div className="mb-2 flex items-center gap-3">
              <img src={previsualizacion} alt="Vista previa de la foto" className="h-20 w-20 rounded-lg border border-border object-cover" />
              <button
                type="button"
                onClick={quitarImagen}
                className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
              >
                Quitar foto
              </button>
            </div>
          ) : (
            <p className="mb-2 text-xs text-muted">Todavía no hay foto cargada.</p>
          )}
          <input
            id="tematica-foto"
            type="file"
            accept="image/*"
            onChange={elegirArchivo}
            className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-muted/70 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-brand/40"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="h-4 w-4" />
          Temática activa (visible para clientes)
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
            disabled={guardando || subiendoImagen}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            {subiendoImagen ? "Subiendo foto..." : guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
