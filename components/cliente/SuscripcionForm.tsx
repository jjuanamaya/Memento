"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Caja, MetodoPago, Tematica, ZonaReparto } from "@/lib/types";

const FRECUENCIAS = [
  { dias: 7, label: "Cada semana" },
  { dias: 15, label: "Cada 15 días" },
  { dias: 30, label: "Cada mes" },
];

const MIN_TEMATICAS = 2;

interface SuscripcionFormProps {
  cajas: Caja[];
  tematicas: Tematica[];
  zonas: ZonaReparto[];
}

export function SuscripcionForm({ cajas, tematicas, zonas }: SuscripcionFormProps) {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [tematicasElegidas, setTematicasElegidas] = useState<Tematica[]>([]);
  const [frecuenciaDias, setFrecuenciaDias] = useState(30);
  const [direccion, setDireccion] = useState("");
  const [zona, setZona] = useState<ZonaReparto | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [creada, setCreada] = useState(false);

  function alternarTematica(tematica: Tematica) {
    setTematicasElegidas((prev) =>
      prev.some((t) => t.id === tematica.id)
        ? prev.filter((t) => t.id !== tematica.id)
        : [...prev, tematica]
    );
  }

  async function suscribirse() {
    if (!caja || !metodoPago || tematicasElegidas.length < MIN_TEMATICAS) return;

    setEnviando(true);
    setError("");

    const supabase = createClient();
    const { error: errorSuscripcion } = await supabase.rpc("crear_suscripcion", {
      p_caja_id: caja.id,
      p_frecuencia_dias: frecuenciaDias,
      p_metodo_pago: metodoPago,
      p_direccion_entrega: direccion,
      p_zona_reparto_id: zona?.id ?? null,
      p_tematica_ids: tematicasElegidas.map((t) => t.id),
    });

    setEnviando(false);

    if (errorSuscripcion) {
      setError("No pudimos crear la suscripción. Probá de nuevo.");
      return;
    }

    setCreada(true);
  }

  if (creada) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <span className="animate-fade-in-up inline-block text-5xl">🎁</span>
        <h1 className="animate-fade-in-up mt-4 text-3xl font-semibold [animation-delay:80ms]">
          ¡Ya estás suscripto!
        </h1>
        <p className="animate-fade-in-up mt-4 text-muted [animation-delay:140ms]">
          Cada {frecuenciaDias === 7 ? "semana" : frecuenciaDias === 15 ? "15 días" : "mes"} te va a llegar una
          sorpresa entre las temáticas que elegiste. Te contactamos antes de cada entrega para coordinar.
        </p>
        <a
          href="/mis-suscripciones"
          className="animate-fade-in-up mt-8 inline-block rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all [animation-delay:200ms] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
        >
          Ver mis suscripciones
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="animate-fade-in-up text-2xl font-semibold">Suscribite a una sorpresa</h1>
      <p className="animate-fade-in-up mt-1 text-sm text-muted [animation-delay:60ms]">
        Elegí un tamaño de caja y las temáticas que te gustan — en cada entrega te llega una al azar entre
        esas, sin repetir hasta que salgan todas.
      </p>

      <div className="animate-fade-in-up mt-8 [animation-delay:100ms]">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Tamaño de caja</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {cajas.map((c) => (
            <button
              key={c.id}
              onClick={() => setCaja(c)}
              className={`rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 ${
                caja?.id === c.id
                  ? "border-brand bg-surface shadow-lg shadow-brand/10"
                  : "border-muted/70 hover:border-brand/40 hover:bg-surface"
              }`}
            >
              <p className="font-medium">{c.nombre}</p>
              <p className="mt-1 text-sm text-muted">{c.descripcion}</p>
              <p className="mt-3 font-semibold text-brand">${c.precio}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          Temáticas que te gustan (elegí al menos {MIN_TEMATICAS})
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tematicas.map((t) => {
            const elegida = tematicasElegidas.some((el) => el.id === t.id);
            return (
              <button
                key={t.id}
                onClick={() => alternarTematica(t)}
                className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                  elegida ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
                }`}
              >
                <div>
                  <p className="font-medium">{t.nombre}</p>
                  <p className="mt-1 text-sm text-muted">{t.descripcion}</p>
                </div>
                <span
                  className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs ${
                    elegida ? "border-brand bg-brand text-brand-foreground" : "border-muted/70"
                  }`}
                >
                  {elegida ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Frecuencia</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {FRECUENCIAS.map((f) => (
            <button
              key={f.dias}
              onClick={() => setFrecuenciaDias(f.dias)}
              className={`rounded-xl border p-3 text-center text-sm transition-all ${
                frecuenciaDias === f.dias ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label className="text-sm font-medium">Dirección de entrega en Cañada de Gómez</label>
        <input
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Calle, número y referencia"
          className="mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]"
        />
      </div>

      {zonas.length > 0 && (
        <div className="mt-6">
          <label className="text-sm font-medium">Zona de reparto</label>
          <select
            value={zona?.id ?? ""}
            onChange={(e) => setZona(zonas.find((z) => z.id === e.target.value) ?? null)}
            className="mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]"
          >
            <option value="" disabled className="bg-background">
              Elegí tu zona
            </option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id} className="bg-background">
                {z.nombre} — {z.costoEnvio === 0 ? "envío gratis" : `$${z.costoEnvio}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium">Método de pago</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => setMetodoPago("transferencia")}
            className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              metodoPago === "transferencia" ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
            }`}
          >
            Transferencia
          </button>
          <button
            onClick={() => setMetodoPago("efectivo")}
            className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              metodoPago === "efectivo" ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
            }`}
          >
            Efectivo al recibir
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex justify-end">
        <button
          disabled={!caja || !metodoPago || !direccion || tematicasElegidas.length < MIN_TEMATICAS || enviando}
          onClick={suscribirse}
          className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
        >
          {enviando ? "Creando..." : "Confirmar suscripción"}
        </button>
      </div>
    </div>
  );
}
