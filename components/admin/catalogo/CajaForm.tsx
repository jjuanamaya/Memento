"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import { borrarImagenCatalogo, subirImagenCatalogo } from "@/components/admin/catalogo/imagenCatalogo";
import type { Caja } from "@/lib/types";

interface CajaFormProps {
  caja?: Caja;
  onClose: () => void;
  onSaved: (caja: Caja) => void;
}

export function CajaForm({ caja, onClose, onSaved }: CajaFormProps) {
  const esEdicion = !!caja;

  const [nombre, setNombre] = useState(caja?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(caja?.descripcion ?? "");
  const [precio, setPrecio] = useState(String(caja?.precio ?? ""));
  const [capacidad, setCapacidad] = useState(String(caja?.capacidad ?? ""));
  const [imagenUrl, setImagenUrl] = useState(caja?.imagen ?? "");
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState(caja?.imagen ?? "");
  const [activa, setActiva] = useState(caja?.activa ?? true);
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

    const precioNum = Number(precio);
    const capacidadNum = capacidad.trim() ? Number(capacidad) : null;

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setError("El precio tiene que ser un número válido.");
      return;
    }
    if (capacidadNum !== null && (!Number.isInteger(capacidadNum) || capacidadNum < 0)) {
      setError("La capacidad tiene que ser un número entero, mayor o igual a 0.");
      return;
    }

    const supabase = createClient();
    let urlFinal = imagenUrl;

    if (archivoNuevo) {
      setSubiendoImagen(true);
      try {
        urlFinal = await subirImagenCatalogo(supabase, archivoNuevo, "cajas");
      } catch {
        setSubiendoImagen(false);
        setError("No se pudo subir la imagen. Probá con otro archivo.");
        return;
      }
      setSubiendoImagen(false);
      if (esEdicion && caja?.imagen && caja.imagen !== urlFinal) {
        borrarImagenCatalogo(supabase, caja.imagen).catch(() => {});
      }
    } else if (esEdicion && caja?.imagen && !imagenUrl) {
      borrarImagenCatalogo(supabase, caja.imagen).catch(() => {});
    }

    setGuardando(true);

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: precioNum,
      capacidad: capacidadNum,
      imagen_url: urlFinal || null,
      activa,
    };

    const resultado = esEdicion
      ? await supabase.from("cajas").update(payload).eq("id", caja!.id).select().single()
      : await supabase.from("cajas").insert(payload).select().single();

    setGuardando(false);

    if (resultado.error || !resultado.data) {
      setError(esEdicion ? "No se pudo guardar la caja. Probá de nuevo." : "No se pudo crear la caja. Probá de nuevo.");
      return;
    }

    const c = resultado.data;
    onSaved({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion ?? "",
      precio: Number(c.precio),
      capacidad: c.capacidad ?? 0,
      imagen: c.imagen_url ?? "",
      activa: c.activa,
    });
  }

  return (
    <Modal titulo={esEdicion ? "Editar caja" : "Nueva caja"} onClose={onClose}>
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
            <label className="mb-1 block text-xs font-medium text-muted">Precio</label>
            <input
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Capacidad (productos)</label>
            <input
              inputMode="numeric"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Foto de la caja</label>
          {previsualizacion ? (
            <div className="mb-2 flex items-center gap-3">
              <img src={previsualizacion} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
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
            type="file"
            accept="image/*"
            onChange={elegirArchivo}
            className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-muted/70 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-brand/40"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="h-4 w-4" />
          Caja activa (visible para clientes)
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
