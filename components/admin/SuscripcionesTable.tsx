"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import { claveDia, formatearDia, formatearFechaHora } from "@/lib/fechas";
import { crearXlsx, descargarArchivo } from "@/lib/xlsx";
import type { EstadoPagoSuscripcion, EstadoSuscripcion, MetodoPago, PagoSuscripcion, Suscripcion } from "@/lib/types";
import {
  diasHasta,
  estadoDeuda,
  ETIQUETA_ENTREGA,
  ETIQUETA_ESTADO_PAGO,
  ETIQUETA_ESTADO_SUSCRIPCION,
} from "@/lib/types";

export interface SuscripcionAdminRow extends Suscripcion {
  clienteId: string;
  cliente: string;
  numeroCliente: number | null;
  telefono: string | null;
  direccion: string | null;
  comentario: string | null;
  /** Último pedido (no cancelado) generado después de que venció el pago. */
  ultimoEnvioAdeudando: string | null;
}

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

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

const BOTON =
  "whitespace-nowrap rounded-lg border border-muted/70 px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand/40 disabled:pointer-events-none disabled:opacity-40";

const MOTIVO_SUGERIDO = "Adeuda pagos";

const ULTIMOS_PAGOS = 5;

/** Los últimos pagos (vienen ordenados del más nuevo al más viejo); un comprobante por revisar se muestra siempre. */
function ultimosPagos(pagos: PagoSuscripcion[]) {
  const ultimos = pagos.slice(0, ULTIMOS_PAGOS);
  const pendientesViejos = pagos.slice(ULTIMOS_PAGOS).filter((p) => p.estado === "pendiente");
  return [...ultimos, ...pendientesViejos];
}

/** Descarga en Excel todos los pagos de las suscripciones indicadas. */
function descargarPagos(suscripciones: SuscripcionAdminRow[], nombre: string) {
  const filas = suscripciones
    .flatMap((s) => s.pagos.map((p) => ({ s, p })))
    .sort((a, b) => b.p.creadoEn.localeCompare(a.p.creadoEn))
    .map(({ s, p }) => [
      formatearFechaHora(p.creadoEn),
      s.numeroCliente,
      s.cliente,
      s.cajaNombre,
      `Cada ${s.frecuenciaDias} días`,
      p.metodoPago === "efectivo" ? "Efectivo" : "Transferencia",
      Math.round(p.monto),
      ETIQUETA_ESTADO_PAGO[p.estado],
      p.comprobanteUrl ? "Sí" : "No",
    ]);

  const archivo = crearXlsx(
    "Pagos",
    ["Fecha", "N° cliente", "Cliente", "Caja", "Frecuencia", "Método", "Monto ($)", "Estado", "Comprobante"],
    filas
  );
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  descargarArchivo(archivo, `${limpio || "pagos"}.xlsx`);
}

export function SuscripcionesTable({
  suscripcionesIniciales,
  hoy,
}: {
  suscripcionesIniciales: SuscripcionAdminRow[];
  hoy: string;
}) {
  const [suscripciones, setSuscripciones] = useState(suscripcionesIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; esError: boolean } | null>(null);
  const [historialCliente, setHistorialCliente] = useState<string | null>(null);
  const [pausando, setPausando] = useState<SuscripcionAdminRow | null>(null);
  const [motivo, setMotivo] = useState(MOTIVO_SUGERIDO);

  // Agrupadas por cliente, para mostrar el historial de pagos una sola vez.
  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim()).replace(/^n[°º]?\s*/, "");
    const filtradas = suscripciones.filter(
      (s) =>
        !texto ||
        normalizar(s.cliente).includes(texto) ||
        (s.numeroCliente !== null && String(s.numeroCliente) === texto)
    );
    const orden = new Map<string, number>();
    filtradas.forEach((s, i) => {
      if (!orden.has(s.clienteId)) orden.set(s.clienteId, i);
    });
    return [...filtradas].sort((a, b) => orden.get(a.clienteId)! - orden.get(b.clienteId)!);
  }, [suscripciones, busqueda]);

  const suscripcionesDelHistorial = suscripciones.filter((s) => s.clienteId === historialCliente);

  function actualizarLocal(id: string, cambios: Partial<SuscripcionAdminRow>) {
    setSuscripciones((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
  }

  async function ejecutar(id: string, accion: () => Promise<string | null>) {
    setProcesando(id);
    setMensaje(null);
    const error = await accion();
    setProcesando(null);
    if (error) setMensaje({ texto: error, esError: true });
  }

  function generarPedido(s: SuscripcionAdminRow) {
    const deuda = estadoDeuda(s, hoy);
    if (
      deuda.adeuda &&
      !window.confirm(
        `${s.cliente} adeuda el pago hace ${deuda.diasAdeuda} día${deuda.diasAdeuda === 1 ? "" : "s"}. ¿Generar el pedido igual?`
      )
    ) {
      return;
    }
    ejecutar(s.id, async () => {
      const { data: pedidoId, error } = await createClient().rpc("generar_pedido_suscripcion", {
        p_suscripcion_id: s.id,
      });
      if (error || !pedidoId) return error?.message || "No se pudo generar el pedido.";

      const siguiente = new Date(`${(s.proximaEntrega ?? hoy).slice(0, 10)}T12:00:00Z`);
      siguiente.setUTCDate(siguiente.getUTCDate() + s.frecuenciaDias);
      actualizarLocal(s.id, {
        proximaEntrega: siguiente.toISOString().slice(0, 10),
        ultimoEnvioAdeudando: deuda.adeuda ? new Date().toISOString() : s.ultimoEnvioAdeudando,
      });
      setMensaje({ texto: `Pedido #${String(pedidoId).slice(0, 8)} creado para ${s.cliente}.`, esError: false });
      return null;
    });
  }

  function abrirPausa(s: SuscripcionAdminRow) {
    setMotivo(estadoDeuda(s, hoy).adeuda ? MOTIVO_SUGERIDO : "");
    setPausando(s);
  }

  function confirmarPausa() {
    const s = pausando;
    if (!s) return;
    const motivoLimpio = motivo.trim();
    ejecutar(s.id, async () => {
      const { error } = await createClient()
        .from("suscripciones")
        .update({ estado: "pausada", motivo_pausa: motivoLimpio || null })
        .eq("id", s.id);
      if (error) return "No se pudo pausar la suscripción.";
      actualizarLocal(s.id, { estado: "pausada", motivoPausa: motivoLimpio || null, pausadaEn: hoy });
      setPausando(null);
      return null;
    });
  }

  function reactivar(s: SuscripcionAdminRow) {
    ejecutar(s.id, async () => {
      const { data, error } = await createClient()
        .from("suscripciones")
        .update({ estado: "activa" })
        .eq("id", s.id)
        .select("proxima_entrega, pagado_hasta")
        .single();
      if (error || !data) return "No se pudo reactivar la suscripción.";
      actualizarLocal(s.id, {
        estado: "activa",
        motivoPausa: null,
        pausadaEn: null,
        proximaEntrega: data.proxima_entrega,
        pagadoHasta: data.pagado_hasta,
      });
      return null;
    });
  }

  function cancelar(s: SuscripcionAdminRow) {
    if (!window.confirm(`¿Cancelar la suscripción de ${s.cliente} (${s.cajaNombre})? No se puede reactivar después.`)) {
      return;
    }
    ejecutar(s.id, async () => {
      const { error } = await createClient().from("suscripciones").update({ estado: "cancelada" }).eq("id", s.id);
      if (error) return "No se pudo cancelar la suscripción.";
      actualizarLocal(s.id, { estado: "cancelada", motivoPausa: null, pausadaEn: null });
      return null;
    });
  }

  function eliminar(s: SuscripcionAdminRow) {
    if (
      !window.confirm(
        `¿Eliminar la suscripción de ${s.cliente} (${s.cajaNombre})?\n\nSe borra junto con su historial de pagos. Los pedidos que ya generó quedan como pedidos sueltos. No se puede deshacer.`
      )
    ) {
      return;
    }
    ejecutar(s.id, async () => {
      const { error } = await createClient().from("suscripciones").delete().eq("id", s.id);
      if (error) return "No se pudo eliminar la suscripción.";
      setSuscripciones((prev) => prev.filter((x) => x.id !== s.id));
      return null;
    });
  }

  function revisarPago(s: SuscripcionAdminRow, pago: PagoSuscripcion, aprobar: boolean) {
    if (!aprobar && !window.confirm("¿Rechazar este comprobante? El cliente va a tener que subir otro.")) return;
    ejecutar(pago.id, async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("revisar_pago_suscripcion", { p_pago_id: pago.id, p_aprobar: aprobar });
      if (error) return error.message || "No se pudo revisar el pago.";
      const { data } = await supabase.from("suscripciones").select("pagado_hasta").eq("id", s.id).single();
      actualizarLocal(s.id, {
        pagadoHasta: data?.pagado_hasta ?? s.pagadoHasta,
        pagos: s.pagos.map((p) => (p.id === pago.id ? { ...p, estado: aprobar ? "aprobado" : "rechazado" } : p)),
      });
      return null;
    });
  }

  function registrarPago(s: SuscripcionAdminRow, metodo: MetodoPago) {
    const monto = formatoMoneda(s.precio + s.costoEnvio);
    if (!window.confirm(`¿Registrar un pago de ${monto} en ${metodo} para ${s.cajaNombre}? Cubre un período.`)) return;
    ejecutar(s.id, async () => {
      const supabase = createClient();
      const { data: pagoId, error } = await supabase.rpc("registrar_pago_suscripcion", {
        p_suscripcion_id: s.id,
        p_metodo_pago: metodo,
      });
      if (error || !pagoId) return error?.message || "No se pudo registrar el pago.";
      const { data } = await supabase.from("suscripciones").select("pagado_hasta").eq("id", s.id).single();
      const nuevo: PagoSuscripcion = {
        id: String(pagoId),
        suscripcionId: s.id,
        monto: s.precio + s.costoEnvio,
        metodoPago: metodo,
        comprobanteUrl: null,
        estado: "aprobado",
        creadoEn: new Date().toISOString(),
      };
      actualizarLocal(s.id, { pagadoHasta: data?.pagado_hasta ?? s.pagadoHasta, pagos: [nuevo, ...s.pagos] });
      return null;
    });
  }

  async function verComprobante(ruta: string) {
    const ventana = window.open("", "_blank");
    const { data, error } = await createClient().storage.from("comprobantes").createSignedUrl(ruta, 600);
    if (error || !data) {
      ventana?.close();
      setMensaje({ texto: "No se pudo abrir el comprobante.", esError: true });
      return;
    }
    if (ventana) ventana.location.href = data.signedUrl;
  }

  if (suscripciones.length === 0) {
    return <p className="mt-6 text-sm text-muted">Todavía no hay suscripciones.</p>;
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {suscripciones.filter((s) => s.estado === "activa").length} activas ·{" "}
          {suscripciones.filter((s) => estadoDeuda(s, hoy).adeuda).length} adeudan
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => descargarPagos(suscripciones, `pagos-suscripciones-${claveDia(new Date())}`)}
            className={BOTON}
          >
            📥 Todos los pagos (Excel)
          </button>
          <label className="sr-only" htmlFor="buscar-suscripcion">
            Buscar suscripción
          </label>
          <input
            id="buscar-suscripcion"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Cliente o N° de cliente"
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand sm:w-64"
          />
        </div>
      </div>

      {mensaje && (
        <p role={mensaje.esError ? "alert" : "status"} className={`mt-3 text-sm ${mensaje.esError ? "text-red-400" : "text-emerald-400"}`}>
          {mensaje.texto}
        </p>
      )}

      <div className="relative mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Cliente</th>
              <th scope="col" className="px-4 py-3">Caja</th>
              <th scope="col" className="px-4 py-3">Próxima entrega</th>
              <th scope="col" className="px-4 py-3">Pago</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((s, i) => {
              const primeraDelCliente = i === 0 || visibles[i - 1].clienteId !== s.clienteId;
              const deuda = estadoDeuda(s, hoy);
              const pendiente = s.pagos.find((p) => p.estado === "pendiente");
              const faltan = s.proximaEntrega ? diasHasta(s.proximaEntrega, hoy) : null;
              const ocupado = procesando === s.id;

              return (
                <tr
                  key={s.id}
                  className={`align-top ${primeraDelCliente ? "border-t border-border" : "border-t border-dashed border-border/50"}`}
                >
                  <td className="px-4 py-3">
                    {primeraDelCliente ? (
                      <>
                        <p className="font-medium">{s.cliente}</p>
                        {s.numeroCliente !== null && <p className="text-xs text-muted">Cliente N° {s.numeroCliente}</p>}
                        {s.telefono && (
                          <a href={`tel:${s.telefono}`} className="block text-xs text-brand underline">
                            {s.telefono}
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setHistorialCliente(s.clienteId)}
                          className={`${BOTON} mt-2`}
                        >
                          💳 Historial de pagos
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-muted">↳ mismo cliente</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.cajaNombre}
                    <p className="text-xs text-muted">
                      Cada {s.frecuenciaDias} días · {formatoMoneda(s.precio + s.costoEnvio)}
                    </p>
                    <p className="text-xs text-muted">{s.tematicas.join(", ")}</p>
                    <p className="text-xs text-muted">
                      {ETIQUETA_ENTREGA[s.tipoEntrega]}
                      {s.tipoEntrega === "envio" && s.direccion && ` · ${s.direccion}`}
                    </p>
                    {s.comentario && <p className="text-xs italic text-muted">“{s.comentario}”</p>}
                  </td>
                  <td className="px-4 py-3">
                    {s.proximaEntrega ? formatearDia(s.proximaEntrega) : "—"}
                    {s.estado === "activa" && faltan !== null && (
                      <p className={`text-xs ${faltan <= 0 ? "font-medium text-brand" : "text-muted"}`}>
                        {faltan > 0
                          ? `Faltan ${faltan} día${faltan === 1 ? "" : "s"}`
                          : faltan === 0
                            ? "Es hoy"
                            : `Atrasada ${-faltan} día${faltan === -1 ? "" : "s"}`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.estado === "cancelada" ? (
                      <span className="text-xs text-muted">—</span>
                    ) : deuda.adeuda ? (
                      <>
                        <span className="inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                          Adeuda · {deuda.diasAdeuda} día{deuda.diasAdeuda === 1 ? "" : "s"}
                        </span>
                        {s.ultimoEnvioAdeudando && (
                          <p className="mt-1 text-xs font-medium text-brand">
                            📦 Caja enviada igual ({formatearDia(s.ultimoEnvioAdeudando)})
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-emerald-400">
                        Al día{s.pagadoHasta && ` · vence ${formatearDia(s.pagadoHasta)}`}
                      </span>
                    )}
                    {pendiente && <p className="mt-1 text-xs text-brand">⏳ Comprobante por revisar</p>}
                    <p className="text-xs text-muted">{s.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILO_ESTADO[s.estado]}`}>
                      {ETIQUETA_ESTADO_SUSCRIPCION[s.estado]}
                    </span>
                    {s.estado === "pausada" && s.motivoPausa && (
                      <p className="mt-1 text-xs text-muted">{s.motivoPausa}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      {s.estado === "activa" && (
                        <button type="button" disabled={ocupado} onClick={() => generarPedido(s)} className={BOTON}>
                          {ocupado ? "Procesando..." : "Generar pedido"}
                        </button>
                      )}
                      {s.estado === "activa" && (
                        <button type="button" disabled={ocupado} onClick={() => abrirPausa(s)} className={BOTON}>
                          Pausar
                        </button>
                      )}
                      {s.estado === "pausada" && (
                        <button type="button" disabled={ocupado} onClick={() => reactivar(s)} className={BOTON}>
                          Reactivar
                        </button>
                      )}
                      {s.estado !== "cancelada" && (
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => cancelar(s)}
                          className={`${BOTON} text-red-400`}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => eliminar(s)}
                        className={`${BOTON} border-red-400/40 text-red-400`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pausando && (
        <Modal titulo={`Pausar suscripción de ${pausando.cliente}`} onClose={() => setPausando(null)}>
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Mientras está pausada no corren los días de entrega ni de pago. Si ponés un motivo, el cliente lo ve en Mis
              suscripciones y no puede reactivarla solo.
            </p>
            <div>
              <label htmlFor="motivo-pausa" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Motivo (opcional)
              </label>
              <input
                id="motivo-pausa"
                value={motivo}
                maxLength={200}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: adeuda pagos"
                className="mt-1 w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 outline-none focus:border-brand"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPausando(null)} className={BOTON}>
                Volver
              </button>
              <button
                type="button"
                disabled={procesando === pausando.id}
                onClick={confirmarPausa}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-brand-foreground hover:opacity-90 disabled:opacity-40"
              >
                Pausar suscripción
              </button>
            </div>
          </div>
        </Modal>
      )}

      {historialCliente && suscripcionesDelHistorial.length > 0 && (
        <Modal
          titulo={`Pagos de ${suscripcionesDelHistorial[0].cliente}`}
          onClose={() => setHistorialCliente(null)}
        >
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background/60 px-3 py-2">
              <span className="text-xs text-muted">
                {suscripcionesDelHistorial.reduce((total, s) => total + s.pagos.length, 0)} pagos en total
              </span>
              <button
                type="button"
                onClick={() =>
                  descargarPagos(
                    suscripcionesDelHistorial,
                    `pagos-${suscripcionesDelHistorial[0].numeroCliente ?? ""}-${suscripcionesDelHistorial[0].cliente}`
                  )
                }
                className={BOTON}
              >
                📥 Descargar Excel
              </button>
            </div>
            {suscripcionesDelHistorial.map((s) => {
              const deuda = estadoDeuda(s, hoy);
              return (
                <section key={s.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">
                      {s.cajaNombre} · cada {s.frecuenciaDias} días
                    </h3>
                    <span className="text-xs text-muted">
                      {ETIQUETA_ESTADO_SUSCRIPCION[s.estado]}
                      {deuda.adeuda && (
                        <span className="text-red-400"> · adeuda {deuda.diasAdeuda} días</span>
                      )}
                    </span>
                  </div>
                  {s.pagos.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">Sin pagos registrados.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                      {ultimosPagos(s.pagos).map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                          <span>
                            {formatearFechaHora(p.creadoEn)} · {formatoMoneda(p.monto)} ·{" "}
                            {p.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}{" "}
                            <span className={`text-xs font-medium ${ESTILO_PAGO[p.estado]}`}>
                              · {ETIQUETA_ESTADO_PAGO[p.estado]}
                            </span>
                          </span>
                          <span className="flex gap-1.5">
                            {p.comprobanteUrl && (
                              <button type="button" onClick={() => verComprobante(p.comprobanteUrl!)} className={BOTON}>
                                Ver comprobante
                              </button>
                            )}
                            {p.estado === "pendiente" && (
                              <>
                                <button
                                  type="button"
                                  disabled={procesando === p.id}
                                  onClick={() => revisarPago(s, p, true)}
                                  className={`${BOTON} text-emerald-400`}
                                >
                                  Aprobar
                                </button>
                                <button
                                  type="button"
                                  disabled={procesando === p.id}
                                  onClick={() => revisarPago(s, p, false)}
                                  className={`${BOTON} text-red-400`}
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.pagos.length > ultimosPagos(s.pagos).length && (
                    <p className="mt-1 text-xs text-muted">
                      Mostrando los últimos {ULTIMOS_PAGOS} de {s.pagos.length} pagos. Los ves todos en el Excel.
                    </p>
                  )}
                  {s.estado !== "cancelada" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={procesando === s.id}
                        onClick={() => registrarPago(s, "efectivo")}
                        className={BOTON}
                      >
                        + Registrar pago en efectivo
                      </button>
                      <button
                        type="button"
                        disabled={procesando === s.id}
                        onClick={() => registrarPago(s, "transferencia")}
                        className={BOTON}
                      >
                        + Registrar transferencia recibida
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
