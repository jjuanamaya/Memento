"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import type { ZonaReparto } from "@/lib/types";

const INPUT =
  "w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

interface ZonaFormProps {
  zona?: ZonaReparto;
  onClose: () => void;
  onSaved: (zona: ZonaReparto) => void;
}

export function ZonaForm({ zona, onClose, onSaved }: ZonaFormProps) {
  const esEdicion = !!zona;
  const [nombre, setNombre] = useState(zona?.nombre ?? "");
  const [costoEnvio, setCostoEnvio] = useState(String(zona?.costoEnvio ?? "0"));
  const [disponible, setDisponible] = useState(zona?.disponible ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const costo = Number(costoEnvio);
    if (!nombre.trim()) {
      setError("Ponele un nombre a la zona, por ejemplo \"Centro\".");
      return;
    }
    if (!Number.isFinite(costo) || costo < 0) {
      setError("El costo de envío tiene que ser un número mayor o igual a 0.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();
    const payload = { nombre: nombre.trim(), costo_envio: costo, disponible };

    const resultado = esEdicion
      ? await supabase.from("zonas_reparto").update(payload).eq("id", zona!.id).select().single()
      : await supabase.from("zonas_reparto").insert(payload).select().single();

    setGuardando(false);

    if (resultado.error || !resultado.data) {
      setError(esEdicion ? "No se pudo guardar la zona. Probá de nuevo." : "No se pudo crear la zona. Probá de nuevo.");
      return;
    }

    const z = resultado.data;
    onSaved({ id: z.id, nombre: z.nombre, costoEnvio: Number(z.costo_envio), disponible: z.disponible });
  }

  return (
    <Modal titulo={esEdicion ? "Editar zona de reparto" : "Nueva zona de reparto"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="zona-nombre" className="mb-1 block text-xs font-medium text-muted">
            Nombre (barrio o zona)
          </label>
          <input id="zona-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} />
        </div>

        <div>
          <label htmlFor="zona-costo" className="mb-1 block text-xs font-medium text-muted">
            Costo de envío (0 = gratis)
          </label>
          <input
            id="zona-costo"
            inputMode="decimal"
            value={costoEnvio}
            onChange={(e) => setCostoEnvio(e.target.value)}
            className={INPUT}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="h-4 w-4"
          />
          Zona disponible (el cliente la puede elegir)
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

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
