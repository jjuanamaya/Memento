"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import { borrarImagenCatalogo, subirImagenCatalogo } from "@/components/admin/catalogo/imagenCatalogo";
import { mapearCaja } from "@/lib/mapeos";
import type { Caja } from "@/lib/types";

const INPUT =
  "w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

interface CajaFormProps {
  caja?: Caja;
  onClose: () => void;
  onSaved: (caja: Caja) => void;
}

export function CajaForm({ caja, onClose, onSaved }: CajaFormProps) {
  const esEdicion = !!caja;

  const [nombre, setNombre] = useState(caja?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(caja?.descripcion ?? "");
  const [capacidad, setCapacidad] = useState(String(caja?.capacidad || ""));
  const [ganancia, setGanancia] = useState(String(caja?.gananciaPorcentaje ?? 40));
  const [precioBase, setPrecioBase] = useState(String(caja?.precio ?? "0"));
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

    const capacidadNum = Number(capacidad);
    const gananciaNum = Number(ganancia);
    const precioBaseNum = Number(precioBase || 0);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!Number.isInteger(capacidadNum) || capacidadNum <= 0) {
      setError("Indicá cuántos productos lleva la caja (un número entero mayor a 0).");
      return;
    }
    if (!Number.isFinite(gananciaNum) || gananciaNum < 0 || gananciaNum > 1000) {
      setError("El % de ganancia tiene que ser un número entre 0 y 1000.");
      return;
    }
    if (!Number.isFinite(precioBaseNum) || precioBaseNum < 0) {
      setError("El precio base tiene que ser un número válido.");
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
      capacidad: capacidadNum,
      ganancia_porcentaje: gananciaNum,
      precio: precioBaseNum,
      imagen_url: urlFinal || null,
      activa,
    };

    const resultado = esEdicion
      ? await supabase.from("cajas").update(payload).eq("id", caja!.id).select().single()
      : await supabase.from("cajas").insert(payload).select().single();

    setGuardando(false);

    if (resultado.error || !resultado.data) {
      console.error("Error al guardar la caja:", resultado.error);
      setError(esEdicion ? "No se pudo guardar la caja. Probá de nuevo." : "No se pudo crear la caja. Probá de nuevo.");
      return;
    }

    onSaved(mapearCaja(resultado.data));
  }

  return (
    <Modal titulo={esEdicion ? "Editar caja" : "Nueva caja"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="caja-campo-1" className="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <input id="caja-campo-1" value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} />
        </div>

        <div>
          <label htmlFor="caja-campo-2" className="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <textarea
            id="caja-campo-2"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Ej: Ideal para un detalle: 10 productos de la temática que elijas."
            className={INPUT}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="caja-campo-4" className="mb-1 block text-xs font-medium text-muted">
              Capacidad (productos)
            </label>
            <input
              id="caja-campo-4"
              inputMode="numeric"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="caja-ganancia" className="mb-1 block text-xs font-medium text-muted">
              % de ganancia
            </label>
            <input
              id="caja-ganancia"
              inputMode="decimal"
              value={ganancia}
              onChange={(e) => setGanancia(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-muted">
          Con una temática, la caja se llena sola hasta su capacidad y cuesta: costo de esos productos + este %.
        </p>

        <div>
          <label htmlFor="caja-precio-base" className="mb-1 block text-xs font-medium text-muted">
            Precio base para la temática Personalizada
          </label>
          <input
            id="caja-precio-base"
            inputMode="decimal"
            value={precioBase}
            onChange={(e) => setPrecioBase(e.target.value)}
            className={INPUT}
          />
          <p className="mt-1 text-[11px] text-muted">
            Lo que cuesta la caja vacía; se suma al precio de los productos que elija el cliente. Puede ser $0.
          </p>
        </div>

        <div>
          <label htmlFor="caja-foto" className="mb-1 block text-xs font-medium text-muted">
            Foto de la caja (opcional)
          </label>
          {previsualizacion ? (
            <div className="mb-2 flex items-center gap-3">
              <img
                src={previsualizacion}
                alt="Vista previa de la foto"
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={quitarImagen}
                className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
              >
                Quitar foto
              </button>
            </div>
          ) : (
            <p className="mb-2 text-xs text-muted">Sin foto: se muestra un ícono.</p>
          )}
          <input
            id="caja-foto"
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
