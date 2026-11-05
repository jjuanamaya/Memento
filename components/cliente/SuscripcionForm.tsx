"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { guardarTelefono, telefonoValido } from "@/components/cliente/telefono";
import { ACCEPT_COMPROBANTE, borrarComprobante, errorComprobante, subirComprobante } from "@/components/cliente/comprobante";
import { DatosTransferencia } from "@/components/cliente/DatosTransferencia";
import { EntregaFields } from "@/components/cliente/EntregaFields";
import type {
  Caja,
  Configuracion,
  FrecuenciaSuscripcion,
  MetodoPago,
  Producto,
  Tematica,
  TipoEntrega,
} from "@/lib/types";

const MIN_TEMATICAS = 2;
const INPUT =
  "mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]";

// Errores de la base que se le pueden mostrar tal cual al cliente.
const ERRORES_CONOCIDOS = ["sesión", "temática", "frecuencia", "caja", "dirección", "comprobante", "envío", "comentario"];

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

interface SuscripcionFormProps {
  cajas: Caja[];
  tematicas: Tematica[];
  productos: Producto[];
  frecuencias: FrecuenciaSuscripcion[];
  config: Configuracion;
  telefonoInicial: string;
}

export function SuscripcionForm({
  cajas,
  tematicas,
  productos,
  frecuencias,
  config,
  telefonoInicial,
}: SuscripcionFormProps) {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [tematicasElegidas, setTematicasElegidas] = useState<Tematica[]>([]);
  const [frecuenciaDias, setFrecuenciaDias] = useState(frecuencias[0]?.dias ?? 30);
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega | null>(null);
  const [direccion, setDireccion] = useState("");
  const [comentario, setComentario] = useState("");
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [creada, setCreada] = useState(false);

  // En cada entrega la caja se llena sola con la temática sorteada, así que
  // la Personalizada (y las temáticas todavía sin productos) no van.
  const tematicasSuscribibles = tematicas.filter((t) => !t.personalizada && t.productoIds.length > 0);
  const nombreProducto = new Map(productos.map((p) => [p.id, p.nombre]));

  const frecuenciaElegida = frecuencias.find((f) => f.dias === frecuenciaDias) ?? null;
  const costoEnvio = tipoEntrega === "envio" ? config.costoEnvio : 0;
  const totalPorEntrega = (frecuenciaElegida?.precio ?? 0) + costoEnvio;

  function alternarTematica(tematica: Tematica) {
    setTematicasElegidas((prev) =>
      prev.some((t) => t.id === tematica.id)
        ? prev.filter((t) => t.id !== tematica.id)
        : [...prev, tematica]
    );
  }

  function elegirComprobante(archivo: File | null, input: HTMLInputElement) {
    if (archivo) {
      const problema = errorComprobante(archivo);
      if (problema) {
        input.value = "";
        setComprobante(null);
        setError(problema);
        return;
      }
    }
    setError("");
    setComprobante(archivo);
  }

  async function suscribirse() {
    if (!caja || !metodoPago || !tipoEntrega || !acepta || tematicasElegidas.length < MIN_TEMATICAS) return;
    if (metodoPago === "transferencia" && !comprobante) {
      setError("Subí el comprobante de la transferencia para confirmar la suscripción.");
      return;
    }

    setEnviando(true);
    setError("");

    const supabase = createClient();

    if (telefono.trim() !== telefonoInicial.trim()) {
      await guardarTelefono(supabase, telefono);
    }

    let rutaComprobante: string | null = null;
    if (metodoPago === "transferencia" && comprobante) {
      try {
        rutaComprobante = await subirComprobante(supabase, "suscripcion", comprobante);
      } catch (errorSubida) {
        console.error("Error al subir el comprobante:", errorSubida);
        setEnviando(false);
        setError("No pudimos subir el comprobante. Probá de nuevo.");
        return;
      }
    }

    const { error: errorSuscripcion } = await supabase.rpc("crear_suscripcion", {
      p_caja_id: caja.id,
      p_frecuencia_dias: frecuenciaDias,
      p_metodo_pago: metodoPago,
      p_tipo_entrega: tipoEntrega,
      p_direccion_entrega: tipoEntrega === "envio" ? direccion : null,
      p_comentario: comentario,
      p_tematica_ids: tematicasElegidas.map((t) => t.id),
      p_comprobante_url: rutaComprobante,
    });

    setEnviando(false);

    if (errorSuscripcion) {
      console.error("Error al crear suscripción:", errorSuscripcion);
      if (rutaComprobante) await borrarComprobante(supabase, rutaComprobante);
      const mensaje = errorSuscripcion.message ?? "";
      setError(
        ERRORES_CONOCIDOS.some((clave) => mensaje.includes(clave))
          ? mensaje
          : "No pudimos crear la suscripción. Probá de nuevo."
      );
      return;
    }

    setCreada(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (creada) {
    return (
      <div role="status" className="mx-auto max-w-md px-6 py-24 text-center">
        <span aria-hidden="true" className="animate-fade-in-up inline-block text-5xl">
          🎁
        </span>
        <h1 className="animate-fade-in-up mt-4 text-3xl font-semibold [animation-delay:80ms]">
          ¡Ya estás suscripto!
        </h1>
        <p className="animate-fade-in-up mt-4 text-muted [animation-delay:140ms]">
          {frecuenciaElegida
            ? `${frecuenciaElegida.etiqueta} te va a llegar tu ${caja?.nombre ?? "caja"} con una temática sorpresa entre las que elegiste.`
            : "En cada entrega te va a llegar una sorpresa entre las temáticas que elegiste."}{" "}
          {metodoPago === "transferencia"
            ? "Estamos revisando tu comprobante; en cada período vas a poder subir el siguiente desde Mis suscripciones."
            : "Te contactamos antes de cada entrega para coordinar."}
        </p>
        <Link
          href="/mis-suscripciones"
          className="animate-fade-in-up mt-8 inline-block rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all [animation-delay:200ms] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
        >
          Ver mis suscripciones
        </Link>
      </div>
    );
  }

  const puedeConfirmar =
    !!caja &&
    !!metodoPago &&
    !!tipoEntrega &&
    (tipoEntrega === "retiro" || !!direccion.trim()) &&
    telefonoValido(telefono) &&
    (metodoPago !== "transferencia" || !!comprobante) &&
    acepta &&
    tematicasElegidas.length >= MIN_TEMATICAS &&
    !enviando;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="animate-fade-in-up text-2xl font-semibold">Suscribite a una sorpresa</h1>
      <p className="animate-fade-in-up mt-1 text-sm text-muted [animation-delay:60ms]">
        Elegí una caja y las temáticas que te gustan — en cada entrega te llega una al azar entre esas, sin repetir
        hasta que salgan todas.
      </p>

      <div className="animate-fade-in-up mt-8 [animation-delay:100ms]">
        <h2 id="sus-caja" className="text-sm font-medium uppercase tracking-wide text-muted">
          Caja
        </h2>
        {cajas.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Estamos preparando las cajas. Volvé a mirar en un rato.</p>
        ) : (
          <div role="group" aria-labelledby="sus-caja" className="mt-3 grid gap-4 sm:grid-cols-3">
            {cajas.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={caja?.id === c.id}
                onClick={() => setCaja(c)}
                className={`flex flex-col rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 ${
                  caja?.id === c.id
                    ? "border-brand bg-surface shadow-lg shadow-brand/10"
                    : "border-muted/70 hover:border-brand/40 hover:bg-surface"
                }`}
              >
                <p className="font-medium">{c.nombre}</p>
                {c.descripcion && <p className="mt-1 text-sm text-muted">{c.descripcion}</p>}
                <p className="mt-3 text-sm text-muted">Lleva {c.capacidad} productos</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 id="sus-tematicas" className="text-sm font-medium uppercase tracking-wide text-muted">
          Temáticas que te gustan (elegí al menos {MIN_TEMATICAS})
        </h2>
        <div role="group" aria-labelledby="sus-tematicas" className="mt-3 grid gap-3 sm:grid-cols-2">
          {tematicasSuscribibles.map((t) => {
            const elegida = tematicasElegidas.some((el) => el.id === t.id);
            const trae = t.productoIds
              .map((id) => nombreProducto.get(id))
              .filter(Boolean)
              .join(", ");
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
                <div>
                  <p className="font-medium">{t.nombre}</p>
                  {t.descripcion && <p className="mt-1 text-sm text-muted">{t.descripcion}</p>}
                  {trae && <p className="mt-1 text-xs text-muted">Trae: {trae}</p>}
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
        <EntregaFields
          idPrefix="sus"
          config={config}
          tipo={tipoEntrega}
          onTipo={setTipoEntrega}
          direccion={direccion}
          onDireccion={setDireccion}
          comentario={comentario}
          onComentario={setComentario}
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
          className={INPUT}
        />
        <p id="sus-telefono-ayuda" className="mt-1 text-xs text-muted">
          {telefono && !telefonoValido(telefono)
            ? "Revisá el número: tiene que tener entre 8 y 15 dígitos."
            : "Lo usamos solo para coordinar las entregas."}
        </p>
      </div>

      <div className="mt-6">
        <p id="sus-metodo" className="text-sm font-medium">
          Método de pago
        </p>
        <div role="group" aria-labelledby="sus-metodo" className="mt-2 grid grid-cols-2 gap-3">
          {(
            [
              { id: "transferencia", icono: "🏦", label: "Transferencia" },
              {
                id: "efectivo",
                icono: "💵",
                label: tipoEntrega === "retiro" ? "Efectivo al retirar" : "Efectivo al recibir",
              },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={metodoPago === m.id}
              onClick={() => setMetodoPago(m.id)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                metodoPago === m.id ? "border-brand bg-surface" : "border-muted/70 hover:border-brand/40"
              }`}
            >
              <span aria-hidden="true" className="text-2xl">
                {m.icono}
              </span>
              <span className="text-sm font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {frecuenciaElegida && (
        <div className="mt-6 space-y-1 rounded-xl border border-border bg-surface px-5 py-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal ({frecuenciaElegida.etiqueta.toLowerCase()})</span>
            <span>{formatoMoneda(frecuenciaElegida.precio)}</span>
          </div>
          {tipoEntrega && (
            <div className="flex justify-between text-muted">
              <span>{tipoEntrega === "envio" ? "Envío" : "Retiro en el local"}</span>
              <span>{costoEnvio === 0 ? "Sin cargo" : formatoMoneda(costoEnvio)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-medium">Total por entrega</span>
            <span className="text-lg font-semibold text-brand">{formatoMoneda(totalPorEntrega)}</span>
          </div>
        </div>
      )}

      {metodoPago === "transferencia" && (
        <div className="mt-6 space-y-4">
          <DatosTransferencia config={config} monto={totalPorEntrega} />
          <div className="rounded-2xl border border-dashed border-border p-5">
            <label htmlFor="sus-comprobante" className="text-sm font-medium">
              Comprobante del primer período <span className="text-brand">(obligatorio)</span>
            </label>
            <p id="sus-comprobante-ayuda" className="mt-1 text-xs text-muted">
              Subí la captura o el PDF (hasta 5 MB). Los siguientes períodos los pagás desde Mis suscripciones.
            </p>
            <input
              id="sus-comprobante"
              aria-describedby="sus-comprobante-ayuda"
              type="file"
              required
              accept={ACCEPT_COMPROBANTE}
              onChange={(e) => elegirComprobante(e.target.files?.[0] ?? null, e.target)}
              className="mt-3 w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-foreground"
            />
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
          Entiendo que es una suscripción con entregas periódicas al precio indicado, que pago cada período y que puedo
          pausarla o cancelarla cuando quiera, y acepto los{" "}
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
          disabled={!puedeConfirmar}
          onClick={suscribirse}
          className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
        >
          {enviando ? "Creando..." : "Confirmar suscripción"}
        </button>
      </div>
    </div>
  );
}
