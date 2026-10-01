"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { guardarTelefono, telefonoValido } from "@/components/cliente/telefono";
import type { Caja, FrecuenciaSuscripcion, MetodoPago, Tematica, ZonaReparto } from "@/lib/types";

const MIN_TEMATICAS = 2;

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

interface SuscripcionFormProps {
  cajas: Caja[];
  tematicas: Tematica[];
  zonas: ZonaReparto[];
  frecuencias: FrecuenciaSuscripcion[];
  telefonoInicial: string;
}

export function SuscripcionForm({ cajas, tematicas, zonas, frecuencias, telefonoInicial }: SuscripcionFormProps) {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [tematicasElegidas, setTematicasElegidas] = useState<Tematica[]>([]);
  const [frecuenciaDias, setFrecuenciaDias] = useState(frecuencias[0]?.dias ?? 30);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [zona, setZona] = useState<ZonaReparto | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [acepta, setAcepta] = useState(false);
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
    if (!caja || !metodoPago || !acepta || tematicasElegidas.length < MIN_TEMATICAS) return;

    setEnviando(true);
    setError("");

    const supabase = createClient();

    if (telefono.trim() !== telefonoInicial.trim()) {
      await guardarTelefono(supabase, telefono);
    }
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
      console.error("Error al crear suscripción:", errorSuscripcion);
      const mensajeConocido =
        errorSuscripcion.message?.includes("sesión") ||
        errorSuscripcion.message?.includes("temática") ||
        errorSuscripcion.message?.includes("frecuencia") ||
        errorSuscripcion.message?.includes("caja") ||
        errorSuscripcion.message?.includes("dirección");
      setError(mensajeConocido ? errorSuscripcion.message : "No pudimos crear la suscripción. Probá de nuevo.");
      return;
    }

    setCreada(true);
  }

  const frecuenciaElegida = frecuencias.find((f) => f.dias === frecuenciaDias) ?? null;

  if (creada) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <span aria-hidden="true" className="animate-fade-in-up inline-block text-5xl">
          🎁
        </span>
        <h1 className="animate-fade-in-up mt-4 text-3xl font-semibold [animation-delay:80ms]">
          ¡Ya estás suscripto!
        </h1>
        <p className="animate-fade-in-up mt-4 text-muted [animation-delay:140ms]">
          {frecuenciaElegida
            ? `${frecuenciaElegida.etiqueta} (${formatoMoneda(frecuenciaElegida.precio)}) te va a llegar una sorpresa entre las temáticas que elegiste.`
            : "En cada entrega te va a llegar una sorpresa entre las temáticas que elegiste."}{" "}
          Te contactamos antes de cada entrega para coordinar.
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
        <h2 id="sus-caja" className="text-sm font-medium uppercase tracking-wide text-muted">
          Tamaño de caja
        </h2>
        <div role="group" aria-labelledby="sus-caja" className="mt-3 grid gap-4 sm:grid-cols-3">
          {cajas.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={caja?.id === c.id}
              onClick={() => setCaja(c)}
              className={`rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 ${
                caja?.id === c.id
                  ? "border-brand bg-surface shadow-lg shadow-brand/10"
                  : "border-muted/70 hover:border-brand/40 hover:bg-surface"
              }`}
            >
              {c.imagen && (
                <img src={c.imagen} alt="" className="mb-3 h-28 w-full rounded-xl object-cover" />
              )}
              <p className="font-medium">{c.nombre}</p>
              <p className="mt-1 text-sm text-muted">{c.descripcion}</p>
              {c.capacidad > 0 && <p className="mt-3 text-sm text-muted">Hasta {c.capacidad} productos</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 id="sus-tematicas" className="text-sm font-medium uppercase tracking-wide text-muted">
          Temáticas que te gustan (elegí al menos {MIN_TEMATICAS})
        </h2>
        <div role="group" aria-labelledby="sus-tematicas" className="mt-3 grid gap-3 sm:grid-cols-2">
          {tematicas.map((t) => {
            const elegida = tematicasElegidas.some((el) => el.id === t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={elegida}
                onClick={() => alternarTematica(t)}
                className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                  elegida ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  {t.imagen && (
                    <img src={t.imagen} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="font-medium">{t.nombre}</p>
                    <p className="mt-1 text-sm text-muted">{t.descripcion}</p>
                  </div>
                </div>
                <span
                  aria-hidden="true"
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
        <h2 id="sus-frecuencia" className="text-sm font-medium uppercase tracking-wide text-muted">
          Frecuencia de envío
        </h2>
        <div role="group" aria-labelledby="sus-frecuencia" className="mt-3 grid gap-3 sm:grid-cols-3">
          {frecuencias.map((f) => (
            <button
              key={f.dias}
              type="button"
              aria-pressed={frecuenciaDias === f.dias}
              onClick={() => setFrecuenciaDias(f.dias)}
              className={`rounded-xl border p-4 text-center transition-all ${
                frecuenciaDias === f.dias ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
              }`}
            >
              <p className="text-sm font-medium">{f.etiqueta}</p>
              <p className="mt-1 text-sm font-semibold text-brand">{formatoMoneda(f.precio)}</p>
              <p className="text-xs text-muted">por entrega</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label htmlFor="sus-direccion" className="text-sm font-medium">
          Dirección de entrega en Cañada de Gómez
        </label>
        <input
          id="sus-direccion"
          required
          autoComplete="street-address"
          maxLength={200}
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Calle, número y referencia"
          className="mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]"
        />
      </div>

      <div className="mt-6">
        <label htmlFor="sus-telefono" className="text-sm font-medium">
          Teléfono para coordinar las entregas
        </label>
        <input
          id="sus-telefono"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          maxLength={30}
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 3471 123456"
          aria-describedby="sus-telefono-ayuda"
          className="mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]"
        />
        <p id="sus-telefono-ayuda" className="mt-1 text-xs text-muted">
          {telefono && !telefonoValido(telefono)
            ? "Revisá el número: tiene que tener entre 8 y 15 dígitos."
            : "Lo usamos solo para coordinar las entregas."}
        </p>
      </div>

      {zonas.length > 0 && (
        <div className="mt-6">
          <label htmlFor="sus-zona" className="text-sm font-medium">
            Zona de reparto
          </label>
          <select
            id="sus-zona"
            value={zona?.id ?? ""}
            onChange={(e) => setZona(zonas.find((z) => z.id === e.target.value) ?? null)}
            className="mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]"
          >
            <option value="" disabled className="bg-background">
              Elegí tu zona
            </option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id} className="bg-background">
                {z.nombre} — {z.costoEnvio === 0 ? "envío gratis" : formatoMoneda(z.costoEnvio)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-6">
        <p id="sus-metodo" className="text-sm font-medium">
          Método de pago
        </p>
        <div role="group" aria-labelledby="sus-metodo" className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={metodoPago === "transferencia"}
            onClick={() => setMetodoPago("transferencia")}
            className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              metodoPago === "transferencia" ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
            }`}
          >
            Transferencia
          </button>
          <button
            type="button"
            aria-pressed={metodoPago === "efectivo"}
            onClick={() => setMetodoPago("efectivo")}
            className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              metodoPago === "efectivo" ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
            }`}
          >
            Efectivo al recibir
          </button>
        </div>
      </div>

      {frecuenciaElegida && (
        <div className="mt-6 space-y-1 rounded-xl border border-border bg-surface px-5 py-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>Caja ({frecuenciaElegida.etiqueta.toLowerCase()})</span>
            <span>{formatoMoneda(frecuenciaElegida.precio)}</span>
          </div>
          {zona && (
            <div className="flex justify-between text-muted">
              <span>Envío · {zona.nombre}</span>
              <span>{zona.costoEnvio === 0 ? "Gratis" : formatoMoneda(zona.costoEnvio)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-medium">Total por entrega</span>
            <span className="text-lg font-semibold text-brand">
              {formatoMoneda(frecuenciaElegida.precio + (zona?.costoEnvio ?? 0))}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-start gap-3">
        <input
          id="sus-acepta"
          type="checkbox"
          required
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-1 h-4 w-4 flex-shrink-0 accent-[var(--brand)]"
        />
        <label htmlFor="sus-acepta" className="text-sm text-muted">
          Entiendo que es una suscripción con entregas periódicas al precio indicado, que puedo pausar o cancelar cuando
          quiera, y acepto los{" "}
          <Link href="/terminos" target="_blank" className="text-brand underline underline-offset-2">
            Términos y condiciones
          </Link>
          , la{" "}
          <Link href="/cambios-y-devoluciones" target="_blank" className="text-brand underline underline-offset-2">
            Política de cambios y devoluciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="text-brand underline underline-offset-2">
            Política de privacidad
          </Link>
          .
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={
            !caja || !metodoPago || !direccion.trim() || !telefonoValido(telefono) || !acepta || tematicasElegidas.length < MIN_TEMATICAS || enviando
          }
          onClick={suscribirse}
          className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
        >
          {enviando ? "Creando..." : "Confirmar suscripción"}
        </button>
      </div>
    </div>
  );
}
