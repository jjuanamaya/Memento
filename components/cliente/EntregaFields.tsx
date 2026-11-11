"use client";

import type { Configuracion, TipoEntrega } from "@/lib/types";

const INPUT =
  "mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]";

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

interface EntregaFieldsProps {
  idPrefix: string;
  config: Configuracion;
  tipo: TipoEntrega | null;
  onTipo: (tipo: TipoEntrega) => void;
  direccion: string;
  onDireccion: (valor: string) => void;
  comentario: string;
  onComentario: (valor: string) => void;
}

/** Envío a domicilio o retiro en el local, con dirección y comentario opcional. */
export function EntregaFields({
  idPrefix,
  config,
  tipo,
  onTipo,
  direccion,
  onDireccion,
  comentario,
  onComentario,
}: EntregaFieldsProps) {
  const opciones = [
    {
      id: "envio" as const,
      label: "Envío a domicilio",
      detalle: config.costoEnvio === 0 ? "Sin cargo" : formatoMoneda(config.costoEnvio),
    },
    { id: "retiro" as const, label: "Retiro en el local", detalle: "Sin cargo" },
  ];

  return (
    <div>
      <p id={`${idPrefix}-entrega`} className="text-sm font-medium">
        ¿Cómo la recibís?
      </p>
      <div role="group" aria-labelledby={`${idPrefix}-entrega`} className="mt-2 grid grid-cols-2 gap-3">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={tipo === o.id}
            onClick={() => onTipo(o.id)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              tipo === o.id ? "border-brand bg-surface ring-1 ring-brand" : "border-border hover:border-brand/40"
            }`}
          >
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-muted">{o.detalle}</span>
            </span>
          </button>
        ))}
      </div>

      {tipo === "envio" && (
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor={`${idPrefix}-direccion`} className="text-sm font-medium">
              Dirección de entrega en Cañada de Gómez
            </label>
            <input
              id={`${idPrefix}-direccion`}
              required
              autoComplete="street-address"
              maxLength={200}
              value={direccion}
              onChange={(e) => onDireccion(e.target.value)}
              placeholder="Calle y número"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-comentario`} className="text-sm font-medium">
              Indicaciones para encontrarte <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id={`${idPrefix}-comentario`}
              rows={2}
              maxLength={300}
              value={comentario}
              onChange={(e) => onComentario(e.target.value)}
              placeholder="Ej: casa de la esquina con reja negra, timbre 2"
              className={INPUT}
            />
          </div>
        </div>
      )}

      {tipo === "retiro" && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="font-medium">Lo retirás en nuestro local</p>
          <p className="mt-1 text-muted">
            {config.direccionLocal || "Te pasamos la dirección cuando confirmemos el pedido."}
            {config.horarioRetiro && ` · ${config.horarioRetiro}`}
          </p>
          <label htmlFor={`${idPrefix}-comentario`} className="mt-4 block text-sm font-medium">
            Comentario <span className="font-normal text-muted">(opcional)</span>
          </label>
          <textarea
            id={`${idPrefix}-comentario`}
            rows={2}
            maxLength={300}
            value={comentario}
            onChange={(e) => onComentario(e.target.value)}
            placeholder="Ej: paso a retirarlo el sábado a la tarde"
            className={INPUT}
          />
        </div>
      )}
    </div>
  );
}
