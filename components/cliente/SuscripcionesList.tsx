"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatearDia, formatearFechaHora } from "@/lib/fechas";
import { ACCEPT_COMPROBANTE, borrarComprobante, errorComprobante, subirComprobante } from "@/components/cliente/comprobante";
import { DatosTransferencia } from "@/components/cliente/DatosTransferencia";
import type { Configuracion, EstadoPagoSuscripcion, EstadoSuscripcion, Suscripcion } from "@/lib/types";
import {
  diasHasta,
  estadoDeuda,
  ETIQUETA_ENTREGA,
  ETIQUETA_ESTADO_PAGO,
  ETIQUETA_ESTADO_SUSCRIPCION,
} from "@/lib/types";

const ESTILO_ESTADO: Record<EstadoSuscripcion, string> = {
  activa: "bg-emerald-500/15 text-emerald-400",
  pausada: "bg-brand/15 text-brand",
  cancelada: "bg-red-500/15 text-red-400",
};

const ESTILO_PAGO: Record<EstadoPagoSuscripcion, string> = {
  pendiente: "text-brand",
  aprobado: "text-emerald-400",
  rechazado: "text-red-400",
};

const FRECUENCIA_LABEL: Record<number, string> = {
  7: "Cada semana",
  15: "Cada 15 días",
  30: "Cada mes",
};

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

interface SuscripcionesListProps {
  suscripcionesIniciales: Suscripcion[];
  config: Configuracion;
  hoy: string;
}

export function SuscripcionesList({ suscripcionesIniciales, config, hoy }: SuscripcionesListProps) {
  const [suscripciones, setSuscripciones] = useState(suscripcionesIniciales);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [historial, setHistorial] = useState<string | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function cambiarEstado(id: string, estado: EstadoSuscripcion) {
    if (
      estado === "cancelada" &&
      !window.confirm("¿Cancelar la suscripción? No vas a recibir más entregas y no se puede reactivar después.")
    ) {
      return;
    }
    setGuardando(id);
    setError("");
    setAviso("");

    const supabase = createClient();
    const { error: errorUpdate } = await supabase.from("suscripciones").update({ estado }).eq("id", id);

    setGuardando(null);

    if (errorUpdate) {
      console.error("Error al actualizar la suscripción:", errorUpdate);
      setError("No pudimos actualizar la suscripción. Probá de nuevo.");
      return;
    }

    setSuscripciones((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, estado, pausadaEn: estado === "pausada" ? hoy : estado === "activa" ? null : s.pausadaEn }
          : s
      )
    );
  }

  function abrirPago(id: string) {
    setPagando((actual) => (actual === id ? null : id));
    setComprobante(null);
    setError("");
    setAviso("");
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

  async function enviarComprobante(s: Suscripcion) {
    if (!comprobante) return;
    setGuardando(s.id);
    setError("");

    const supabase = createClient();
    let ruta: string;
    try {
      ruta = await subirComprobante(supabase, "suscripcion", comprobante);
    } catch (errorSubida) {
      console.error("Error al subir el comprobante:", errorSubida);
      setGuardando(null);
      setError("No pudimos subir el comprobante. Probá de nuevo.");
      return;
    }

    const { data: pagoId, error: errorPago } = await supabase.rpc("subir_pago_suscripcion", {
      p_suscripcion_id: s.id,
      p_comprobante_url: ruta,
    });

    setGuardando(null);

    if (errorPago || !pagoId) {
      console.error("Error al registrar el pago:", errorPago);
      await borrarComprobante(supabase, ruta);
      const mensaje = errorPago?.message ?? "";
      setError(
        mensaje.includes("revisión") || mensaje.includes("comprobante") || mensaje.includes("cancelada")
          ? mensaje
          : "No pudimos registrar el pago. Probá de nuevo."
      );
      return;
    }

    const nuevoPago = {
      id: pagoId as string,
      suscripcionId: s.id,
      monto: s.precio + s.costoEnvio,
      metodoPago: "transferencia" as const,
      comprobanteUrl: ruta,
      estado: "pendiente" as const,
      creadoEn: new Date().toISOString(),
    };
    setSuscripciones((prev) => prev.map((x) => (x.id === s.id ? { ...x, pagos: [nuevoPago, ...x.pagos] } : x)));
    setPagando(null);
    setComprobante(null);
    setAviso("¡Recibimos tu comprobante! Te avisamos apenas lo confirmemos.");
  }

  if (suscripciones.length === 0) {
    return (
      <div className="animate-fade-in-up mt-8 rounded-2xl border border-muted/30 bg-surface p-8 text-center">
        <span aria-hidden="true" className="text-3xl">
          🎁
        </span>
        <p className="mt-3 font-medium">Todavía no tenés ninguna suscripción.</p>
        <p className="mt-1 text-sm text-muted">Elegí tus temáticas favoritas y dejá que la sorpresa llegue sola.</p>
        <Link
          href="/suscribirse"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
        >
          Suscribirme
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm text-emerald-400">
          {aviso}
        </p>
      )}

      {suscripciones.map((s, i) => {
        const deuda = estadoDeuda(s, hoy);
        const pendiente = s.pagos.find((p) => p.estado === "pendiente");
        const montoPeriodo = s.precio + s.costoEnvio;
        const diasProxima = s.proximaEntrega ? diasHasta(s.proximaEntrega, hoy) : null;

        return (
          <div
            key={s.id}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-fade-in-up rounded-xl border border-muted/20 p-4 transition-all duration-300 hover:border-brand/30"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{s.cajaNombre}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILO_ESTADO[s.estado]}`}>
                {ETIQUETA_ESTADO_SUSCRIPCION[s.estado]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {FRECUENCIA_LABEL[s.frecuenciaDias] ?? `Cada ${s.frecuenciaDias} días`} · {formatoMoneda(montoPeriodo)} por
              entrega · {ETIQUETA_ENTREGA[s.tipoEntrega]}
            </p>
            <p className="mt-2 text-sm text-muted">Entre: {s.tematicas.join(", ")}</p>

            {s.estado === "pausada" && s.motivoPausa && (
              <p className="mt-3 rounded-lg bg-brand/10 px-3 py-2 text-sm">
                <span className="font-medium text-brand">Pausada por nosotros:</span> {s.motivoPausa}
              </p>
            )}

            {s.proximaEntrega && s.estado === "activa" && diasProxima !== null && (
              <p className="mt-2 text-xs text-muted">
                Próxima entrega desde el {formatearDia(s.proximaEntrega)}
                {diasProxima > 0 ? ` (faltan ${diasProxima} día${diasProxima === 1 ? "" : "s"})` : " (esta semana)"}
              </p>
            )}

            {s.estado !== "cancelada" && (
              <p className="mt-2 text-sm">
                {pendiente ? (
                  <span className="text-brand">⏳ Comprobante en revisión</span>
                ) : deuda.adeuda ? (
                  <span className="text-red-400">
                    ⚠️ Adeudás el pago del período ({deuda.diasAdeuda} día{deuda.diasAdeuda === 1 ? "" : "s"})
                  </span>
                ) : s.pagadoHasta ? (
                  <span className="text-emerald-400">
                    ✓ Pagos al día · el próximo vence el {formatearDia(s.pagadoHasta)}
                  </span>
                ) : null}
              </p>
            )}

            {pagando === s.id && (
              <div className="mt-4 space-y-3">
                <DatosTransferencia config={config} monto={montoPeriodo} />
                <div className="rounded-xl border border-dashed border-border p-4">
                  <label htmlFor={`pago-${s.id}`} className="text-sm font-medium">
                    Comprobante de la transferencia
                  </label>
                  <input
                    id={`pago-${s.id}`}
                    type="file"
                    accept={ACCEPT_COMPROBANTE}
                    onChange={(e) => elegirComprobante(e.target.files?.[0] ?? null, e.target)}
                    className="mt-2 w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-foreground"
                  />
                  <button
                    type="button"
                    disabled={!comprobante || guardando === s.id}
                    onClick={() => enviarComprobante(s)}
                    className="mt-3 rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {guardando === s.id ? "Enviando..." : "Enviar comprobante"}
                  </button>
                </div>
              </div>
            )}

            {historial === s.id && (
              <div className="mt-4 rounded-xl border border-border p-4">
                <p className="text-sm font-medium">Historial de pagos</p>
                {s.pagos.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    {s.metodoPago === "efectivo"
                      ? "Todavía no hay pagos registrados. Los pagos en efectivo los cargamos nosotros al cobrarlos."
                      : "Todavía no hay pagos registrados."}
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-border text-sm">
                    {s.pagos.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-muted">
                          {formatearFechaHora(p.creadoEn)} · {p.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}
                        </span>
                        <span className="flex-shrink-0">
                          {formatoMoneda(p.monto)}{" "}
                          <span className={`text-xs font-medium ${ESTILO_PAGO[p.estado]}`}>
                            · {ETIQUETA_ESTADO_PAGO[p.estado]}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {s.estado !== "cancelada" && !pendiente && (
                <button
                  onClick={() => abrirPago(s.id)}
                  className="text-sm font-medium text-brand transition-opacity hover:opacity-80"
                >
                  {pagando === s.id ? "Cerrar pago" : "Pagar por transferencia"}
                </button>
              )}
              <button
                onClick={() => setHistorial((actual) => (actual === s.id ? null : s.id))}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {historial === s.id ? "Ocultar pagos" : "Ver pagos"}
              </button>
              {s.estado === "activa" && (
                <button
                  disabled={guardando === s.id}
                  onClick={() => cambiarEstado(s.id, "pausada")}
                  className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Pausar suscripción
                </button>
              )}
              {s.estado === "pausada" && !s.motivoPausa && (
                <button
                  disabled={guardando === s.id}
                  onClick={() => cambiarEstado(s.id, "activa")}
                  className="text-sm text-brand transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  Reactivar suscripción
                </button>
              )}
              {s.estado !== "cancelada" && (
                <button
                  disabled={guardando === s.id}
                  onClick={() => cambiarEstado(s.id, "cancelada")}
                  className="text-sm text-red-400 transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  Cancelar suscripción
                </button>
              )}
            </div>
            {s.estado === "pausada" && s.motivoPausa && (
              <p className="mt-2 text-xs text-muted">
                Cuando lo resolvamos la reactivamos nosotros. Si ya pagaste, subí el comprobante y escribinos.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
