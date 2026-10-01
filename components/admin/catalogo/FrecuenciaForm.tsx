"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import type { FrecuenciaSuscripcion } from "@/lib/types";

interface FrecuenciaFormProps {
  frecuencia?: FrecuenciaSuscripcion;
  onClose: () => void;
  onSaved: (frecuencia: FrecuenciaSuscripcion) => void;
}

export function FrecuenciaForm({ frecuencia, onClose, onSaved }: FrecuenciaFormProps) {
  const esEdicion = !!frecuencia;

  const [etiqueta, setEtiqueta] = useState(frecuencia?.etiqueta ?? "");
  const [dias, setDias] = useState(String(frecuencia?.dias ?? ""));
  const [precio, setPrecio] = useState(String(frecuencia?.precio ?? ""));
  const [activa, setActiva] = useState(frecuencia?.activa ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const diasNum = Number(dias);
    const precioNum = Number(precio);

    if (!etiqueta.trim()) {
      setError("Ponele un nombre a la frecuencia, por ejemplo \"Cada semana\".");
      return;
    }
    if (!Number.isInteger(diasNum) || diasNum <= 0) {
      setError("Los días tienen que ser un número entero mayor a 0.");
      return;
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setError("El precio tiene que ser un número válido.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();

    const payload = {
      etiqueta: etiqueta.trim(),
      dias: diasNum,
      precio: precioNum,
      activa,
    };

    const resultado = esEdicion
      ? await supabase.from("frecuencias_suscripcion").update(payload).eq("id", frecuencia!.id).select().single()
      : await supabase
          .from("frecuencias_suscripcion")
          .insert({ ...payload, orden: diasNum })
          .select()
          .single();

    setGuardando(false);

    if (resultado.error || !resultado.data) {
      const yaExiste = resultado.error?.code === "23505";
      setError(
        yaExiste
          ? "Ya hay una frecuencia con esa cantidad de días."
          : esEdicion
            ? "No se pudo guardar la frecuencia. Probá de nuevo."
            : "No se pudo crear la frecuencia. Probá de nuevo."
      );
      return;
    }

    const f = resultado.data;
    onSaved({
      id: f.id,
      etiqueta: f.etiqueta,
      dias: f.dias,
      precio: Number(f.precio),
      activa: f.activa,
      orden: f.orden,
    });
  }

  return (
    <Modal titulo={esEdicion ? "Editar frecuencia" : "Nueva frecuencia"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="frecuencia-campo-1" className="mb-1 block text-xs font-medium text-muted">Nombre (como lo ve el cliente)</label>
          <input id="frecuencia-campo-1"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Cada semana"
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="frecuencia-campo-2" className="mb-1 block text-xs font-medium text-muted">Cada cuántos días</label>
            <input id="frecuencia-campo-2"
              inputMode="numeric"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="frecuencia-campo-3" className="mb-1 block text-xs font-medium text-muted">Precio por entrega</label>
            <input id="frecuencia-campo-3"
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="h-4 w-4" />
          Frecuencia activa (el cliente puede elegirla al suscribirse)
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
