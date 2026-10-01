"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { guardarTelefono, telefonoValido } from "@/components/cliente/telefono";
import type { Caja, MetodoPago, Producto, Tematica, ZonaReparto } from "@/lib/types";

type Paso = "caja" | "tematica" | "productos" | "resumen" | "exito";
type PasoVisible = Exclude<Paso, "exito">;

const PASOS: { id: PasoVisible; label: string }[] = [
  { id: "caja", label: "Caja" },
  { id: "tematica", label: "Temática" },
  { id: "productos", label: "Productos" },
  { id: "resumen", label: "Pago" },
];

const ENCABEZADOS: Record<PasoVisible, { titulo: string; bajada: string }> = {
  caja: {
    titulo: "Elegí el tamaño de tu caja",
    bajada: "Es el punto de partida — después la llenás con lo que más le guste a esa persona.",
  },
  tematica: {
    titulo: "¿Qué querés contar?",
    bajada: "La temática le da el tono al regalo. Elegí la que mejor va con el momento.",
  },
  productos: {
    titulo: "Llenala a tu gusto",
    bajada: "Sumá snacks, dulces y bebidas hasta completar la caja.",
  },
  resumen: {
    titulo: "Último paso",
    bajada: "Revisá tu caja, decinos dónde la llevamos y cómo vas a pagar.",
  },
};

const CATEGORIAS: { id: Producto["categoria"]; label: string; icono: string }[] = [
  { id: "snack", label: "Snacks", icono: "🍿" },
  { id: "dulce", label: "Dulces", icono: "🍫" },
  { id: "bebida", label: "Bebidas", icono: "🥤" },
];

const BOTON_PRIMARIO =
  "rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none";
const INPUT =
  "mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]";

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

interface BoxBuilderProps {
  cajas: Caja[];
  tematicas: Tematica[];
  productos: Producto[];
  zonas: ZonaReparto[];
  telefonoInicial: string;
}

export function BoxBuilder({ cajas, tematicas, productos, zonas, telefonoInicial }: BoxBuilderProps) {
  const [paso, setPaso] = useState<Paso>("caja");
  const [caja, setCaja] = useState<Caja | null>(null);
  const [tematica, setTematica] = useState<Tematica | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [zona, setZona] = useState<ZonaReparto | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [comprobanteSubido, setComprobanteSubido] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(
    () =>
      productos
        .filter((producto) => (cantidades[producto.id] ?? 0) > 0)
        .map((producto) => ({ producto, cantidad: cantidades[producto.id] })),
    [productos, cantidades]
  );

  const subtotalProductos = items.reduce(
    (total, item) => total + item.producto.precio * item.cantidad,
    0
  );
  const costoEnvio = zona?.costoEnvio ?? 0;
  const total = (caja?.precio ?? 0) + subtotalProductos + costoEnvio;

  const cantidadTotalItems = items.reduce((total, item) => total + item.cantidad, 0);
  const capacidadRestante = caja ? Math.max(caja.capacidad - cantidadTotalItems, 0) : 0;
  const porcentajeLleno = caja?.capacidad ? Math.min((cantidadTotalItems / caja.capacidad) * 100, 100) : 0;

  const indicePaso = PASOS.findIndex((p) => p.id === paso);

  function cambiarCantidad(producto: Producto, delta: number) {
    setCantidades((prev) => {
      const actual = prev[producto.id] ?? 0;

      if (delta > 0 && caja) {
        const totalActual = productos.reduce((total, p) => total + (prev[p.id] ?? 0), 0);
        if (totalActual >= caja.capacidad) return prev;
      }

      const siguiente = Math.min(Math.max(actual + delta, 0), producto.stockActual);
      return { ...prev, [producto.id]: siguiente };
    });
  }

  function irA(destino: Paso) {
    setError("");
    setPaso(destino);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmarPedido() {
    if (!caja || !tematica || !metodoPago) return;

    setEnviando(true);
    setError("");

    const supabase = createClient();

    if (telefono.trim() !== telefonoInicial.trim()) {
      await guardarTelefono(supabase, telefono);
    }

    const { data: nuevoPedidoId, error: errorPedido } = await supabase.rpc("crear_pedido", {
      p_caja_id: caja.id,
      p_tematica_id: tematica.id,
      p_metodo_pago: metodoPago,
      p_direccion_entrega: direccion,
      p_subtotal: subtotalProductos,
      p_costo_envio: costoEnvio,
      p_total: total,
      p_items: items.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
      })),
      p_zona_reparto_id: zona?.id ?? null,
    });

    if (errorPedido || !nuevoPedidoId) {
      setEnviando(false);
      if (errorPedido) {
        // El mensaje completo queda en la consola del navegador para poder
        // diagnosticar rápido (código de Postgres/PostgREST, detalle, hint),
        // sin mostrarle ese detalle técnico al cliente.
        console.error("Error al crear pedido:", errorPedido);
      }
      const mensajeConocido =
        errorPedido?.message?.includes("stock") || errorPedido?.message?.includes("sesión");
      setError(
        mensajeConocido ? errorPedido!.message : "No pudimos registrar el pedido. Probá de nuevo."
      );
      return;
    }

    if (metodoPago === "transferencia" && comprobante) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const extension = comprobante.name.split(".").pop() || "jpg";
      const ruta = `${user?.id}/${nuevoPedidoId}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from("comprobantes")
        .upload(ruta, comprobante);

      if (!errorSubida) {
        const { error: errorAsociar } = await supabase
          .from("pedidos")
          .update({ comprobante_url: ruta })
          .eq("id", nuevoPedidoId);
        setComprobanteSubido(!errorAsociar);
      }
      // Si falla la subida, el pedido ya quedó creado igual — no bloqueamos
      // la compra por esto, se puede volver a mandar el comprobante después.
    }

    setEnviando(false);
    setPedidoId(nuevoPedidoId);
    irA("exito");
  }

  if (paso === "exito") {
    return (
      <div role="status" className="mx-auto max-w-md px-6 py-24 text-center">
        <span aria-hidden="true" className="animate-fade-in-up inline-block text-5xl">
          🎉
        </span>
        <p className="animate-fade-in-up mt-4 text-sm text-muted [animation-delay:80ms]">
          Pedido #{pedidoId?.slice(0, 8)}
        </p>
        <h1 className="animate-fade-in-up mt-2 text-3xl font-semibold [animation-delay:140ms]">
          ¡Tu caja fue armada!
        </h1>
        <p className="animate-fade-in-up mt-4 text-muted [animation-delay:200ms]">
          {metodoPago === "transferencia"
            ? comprobanteSubido
              ? "Recibimos tu comprobante. Te contactamos para coordinar la entrega."
              : comprobante
                ? "No pudimos guardar el comprobante, pero tu pedido quedó registrado. Subilo de nuevo desde \"Mis pedidos\"."
                : "Te vamos a contactar con los datos para la transferencia. Cuando la hagas, podés subir el comprobante desde \"Mis pedidos\"."
            : "Vas a pagar en efectivo al recibir tu caja. Te contactamos para coordinar la entrega."}
        </p>
        <div className="animate-fade-in-up mt-8 flex flex-wrap justify-center gap-3 [animation-delay:260ms]">
          <Link
            href="/mis-pedidos"
            className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
          >
            Ver mis pedidos
          </Link>
          <Link href="/" className="rounded-full border border-border px-6 py-3 font-medium hover:border-brand/40">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const puedeContinuar =
    paso === "caja"
      ? !!caja
      : paso === "tematica"
        ? !!tematica
        : paso === "productos"
          ? true
          : !!metodoPago && !!direccion.trim() && telefonoValido(telefono) && acepta && !enviando;

  function continuar() {
    if (paso === "caja") irA("tematica");
    else if (paso === "tematica") irA("productos");
    else if (paso === "productos") irA("resumen");
    else confirmarPedido();
  }

  const resumenCorto = [
    caja?.nombre,
    tematica?.nombre,
    cantidadTotalItems > 0 ? `${cantidadTotalItems} producto${cantidadTotalItems === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-4xl px-6 pb-10 pt-10">
      {/* Encabezado del paso */}
      <div key={paso} className="text-center">
        <p className="animate-fade-in-up text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Paso {indicePaso + 1} de {PASOS.length}
        </p>
        <h1 className="animate-fade-in-up mt-3 text-3xl font-semibold tracking-tight [animation-delay:60ms] sm:text-4xl">
          {ENCABEZADOS[paso].titulo}
        </h1>
        <p className="animate-fade-in-up mx-auto mt-3 max-w-lg text-muted [animation-delay:120ms]">
          {ENCABEZADOS[paso].bajada}
        </p>
      </div>

      {/* Progreso */}
      <ol aria-label="Pasos del pedido" className="mx-auto mt-10 flex max-w-xl items-start">
        {PASOS.map((p, i) => {
          const completado = i < indicePaso;
          const actual = i === indicePaso;
          return (
            <li
              key={p.id}
              aria-current={actual ? "step" : undefined}
              className={`flex items-start ${i < PASOS.length - 1 ? "flex-1" : ""}`}
            >
              <span className="sr-only">
                {p.label}
                {completado ? " (completado)" : actual ? " (paso actual)" : ""}
              </span>
              <div aria-hidden="true" className="flex flex-col items-center gap-2">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-500 ${
                    completado
                      ? "bg-brand text-brand-foreground"
                      : actual
                        ? "bg-brand/15 text-brand ring-2 ring-brand"
                        : "bg-surface text-muted"
                  }`}
                >
                  {completado ? "✓" : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-xs ${
                    actual ? "font-medium text-foreground" : "hidden text-muted sm:block"
                  }`}
                >
                  {p.label}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div aria-hidden="true" className="mx-2 mt-[17px] h-0.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full bg-brand transition-all duration-700"
                    style={{ width: completado ? "100%" : "0%" }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Paso 1 — Caja */}
      {paso === "caja" && (
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {cajas.map((c, i) => {
            const elegida = caja?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={elegida}
                onClick={() => setCaja(c)}
                style={{ animationDelay: `${150 + i * 80}ms` }}
                className={`animate-fade-in-up group relative overflow-hidden rounded-3xl border text-left transition-all duration-300 hover:-translate-y-1 ${
                  elegida
                    ? "border-brand bg-surface shadow-xl shadow-brand/15 ring-1 ring-brand"
                    : "border-border bg-surface/40 hover:border-brand/40 hover:bg-surface"
                }`}
              >
                <div className="relative h-44 w-full overflow-hidden">
                  {c.imagen ? (
                    <img
                      src={c.imagen}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand/30 via-brand/10 to-transparent"
                    >
                      <span className="text-6xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                        🎁
                      </span>
                    </div>
                  )}
                  {c.capacidad > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
                      Hasta {c.capacidad} productos
                    </span>
                  )}
                  {elegida && (
                    <span
                      aria-hidden="true"
                      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground shadow-lg"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-lg font-semibold">{c.nombre}</p>
                  <p className="mt-1 text-sm text-muted">{c.descripcion}</p>
                  <p className="mt-4 text-xl font-semibold text-brand">{formatoMoneda(c.precio)}</p>
                </div>
              </button>
            );
          })}
          <p className="text-center text-xs text-muted sm:col-span-3">
            Imágenes ilustrativas: la presentación final puede variar.
          </p>
        </div>
      )}

      {/* Paso 2 — Temática */}
      {paso === "tematica" && (
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {tematicas.map((t, i) => {
            const elegida = tematica?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={elegida}
                onClick={() => setTematica(t)}
                style={{ animationDelay: `${150 + i * 70}ms` }}
                className={`animate-fade-in-up group relative overflow-hidden rounded-3xl border text-left transition-all duration-300 hover:-translate-y-1 ${
                  elegida
                    ? "border-brand bg-surface shadow-xl shadow-brand/15 ring-1 ring-brand"
                    : "border-border bg-surface/40 hover:border-brand/40 hover:bg-surface"
                }`}
              >
                <div className="relative h-32 w-full overflow-hidden">
                  {t.imagen ? (
                    <img
                      src={t.imagen}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand/25 via-brand/5 to-transparent"
                    >
                      <span className="text-5xl transition-transform duration-500 group-hover:scale-110">✨</span>
                    </div>
                  )}
                  {elegida && (
                    <span
                      aria-hidden="true"
                      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground shadow-lg"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="font-semibold">{t.nombre}</p>
                  <p className="mt-1 text-sm text-muted">{t.descripcion}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Paso 3 — Productos */}
      {paso === "productos" && (
        <div className="animate-fade-in-up [animation-delay:150ms]">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">Lugar en tu {caja?.nombre}</span>
              <span className="font-semibold">
                {cantidadTotalItems} / {caja?.capacidad}
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${porcentajeLleno}%` }}
              />
            </div>
            <p className={`mt-2 text-center text-xs ${capacidadRestante === 0 ? "font-medium text-brand" : "text-muted"}`}>
              {capacidadRestante === 0
                ? "¡Caja completa! 🎉"
                : `Te quedan ${capacidadRestante} lugar${capacidadRestante === 1 ? "" : "es"} libre${capacidadRestante === 1 ? "" : "s"}`}
            </p>
          </div>

          {CATEGORIAS.map((categoria) => {
            const deCategoria = productos.filter((producto) => producto.categoria === categoria.id);
            if (deCategoria.length === 0) return null;
            return (
              <div key={categoria.id} className="mt-10">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                  <span aria-hidden="true" className="text-lg">
                    {categoria.icono}
                  </span>
                  {categoria.label}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {deCategoria.map((producto) => {
                    const cantidad = cantidades[producto.id] ?? 0;
                    const sinStock = producto.stockActual === 0;
                    return (
                      <div
                        key={producto.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                          sinStock
                            ? "border-border opacity-50"
                            : cantidad > 0
                              ? "border-brand/50 bg-surface shadow-md shadow-brand/5"
                              : "border-border bg-surface/40 hover:bg-surface"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{producto.nombre}</p>
                          <p className="text-sm text-muted">
                            {formatoMoneda(producto.precio)} {sinStock && "· sin stock"}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-background p-1">
                          <button
                            onClick={() => cambiarCantidad(producto, -1)}
                            disabled={cantidad === 0}
                            aria-label={`Quitar ${producto.nombre}`}
                            className="h-8 w-8 rounded-full transition-all hover:bg-surface active:scale-90 disabled:pointer-events-none disabled:opacity-30"
                          >
                            −
                          </button>
                          <span aria-live="polite" className="w-5 text-center text-sm font-semibold">
                            <span className="sr-only">Cantidad: </span>
                            {cantidad}
                          </span>
                          <button
                            onClick={() => cambiarCantidad(producto, 1)}
                            disabled={sinStock || cantidad >= producto.stockActual || capacidadRestante <= 0}
                            aria-label={`Agregar ${producto.nombre}`}
                            className="h-8 w-8 rounded-full bg-brand text-brand-foreground transition-all hover:opacity-90 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paso 4 — Resumen y pago */}
      {paso === "resumen" && (
        <div className="animate-fade-in-up mx-auto mt-10 max-w-2xl [animation-delay:150ms]">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="flex items-center gap-4 border-b border-border p-5">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-brand/30 to-transparent text-2xl"
              >
                {caja?.imagen ? <img src={caja.imagen} alt="" className="h-full w-full object-cover" /> : "🎁"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{caja?.nombre}</p>
                <p className="text-sm text-muted">Temática: {tematica?.nombre}</p>
              </div>
              <span className="font-semibold">{formatoMoneda(caja?.precio ?? 0)}</span>
            </div>

            <div className="space-y-2 p-5 text-sm">
              {items.length === 0 ? (
                <p className="text-muted">Sin productos extra.</p>
              ) : (
                items.map((item) => (
                  <div key={item.producto.id} className="flex justify-between text-muted">
                    <span>
                      {item.cantidad}× {item.producto.nombre}
                    </span>
                    <span>{formatoMoneda(item.producto.precio * item.cantidad)}</span>
                  </div>
                ))
              )}
              {zona && (
                <div className="flex justify-between text-muted">
                  <span>Envío · {zona.nombre}</span>
                  <span>{costoEnvio === 0 ? "Gratis" : formatoMoneda(costoEnvio)}</span>
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between border-t border-border bg-background/40 p-5">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-semibold text-brand">{formatoMoneda(total)}</span>
            </div>
          </div>

          <div className="mt-8">
            <label htmlFor="pedido-direccion" className="text-sm font-medium">
              <span aria-hidden="true">📍 </span>Dirección de entrega en Cañada de Gómez
            </label>
            <input
              id="pedido-direccion"
              required
              autoComplete="street-address"
              maxLength={200}
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número y referencia"
              className={INPUT}
            />
          </div>

          <div className="mt-6">
            <label htmlFor="pedido-telefono" className="text-sm font-medium">
              <span aria-hidden="true">📞 </span>Teléfono para coordinar la entrega
            </label>
            <input
              id="pedido-telefono"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 3471 123456"
              aria-describedby="pedido-telefono-ayuda"
              className={INPUT}
            />
            <p id="pedido-telefono-ayuda" className="mt-1 text-xs text-muted">
              {telefono && !telefonoValido(telefono)
                ? "Revisá el número: tiene que tener entre 8 y 15 dígitos."
                : "Lo usamos solo para coordinar la entrega de tus pedidos."}
            </p>
          </div>

          {zonas.length > 0 && (
            <div className="mt-6">
              <label htmlFor="pedido-zona" className="text-sm font-medium">
                <span aria-hidden="true">🚚 </span>Zona de reparto
              </label>
              <select
                id="pedido-zona"
                value={zona?.id ?? ""}
                onChange={(e) => setZona(zonas.find((z) => z.id === e.target.value) ?? null)}
                className={INPUT}
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
            <p id="pedido-metodo" className="text-sm font-medium">
              Método de pago
            </p>
            <div role="group" aria-labelledby="pedido-metodo" className="mt-2 grid grid-cols-2 gap-3">
              {(
                [
                  { id: "transferencia", icono: "🏦", label: "Transferencia" },
                  { id: "efectivo", icono: "💵", label: "Efectivo al recibir" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={metodoPago === m.id}
                  onClick={() => setMetodoPago(m.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                    metodoPago === m.id
                      ? "border-brand bg-surface ring-1 ring-brand"
                      : "border-border hover:border-brand/40"
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

          {metodoPago === "transferencia" && (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-5">
              <label htmlFor="pedido-comprobante" className="text-sm font-medium">
                Comprobante de transferencia (opcional)
              </label>
              <p id="pedido-comprobante-ayuda" className="mt-1 text-xs text-muted">
                Imagen o PDF de hasta 5 MB. Podés subirlo ahora o mandarlo después — igual te vamos a contactar para
                coordinar.
              </p>
              <input
                id="pedido-comprobante"
                aria-describedby="pedido-comprobante-ayuda"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  const archivo = e.target.files?.[0] ?? null;
                  const tipoValido =
                    archivo && ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(archivo.type);
                  if (archivo && (!tipoValido || archivo.size > 5 * 1024 * 1024)) {
                    e.target.value = "";
                    setComprobante(null);
                    setError("El comprobante tiene que ser una imagen (JPG, PNG o WEBP) o un PDF de hasta 5 MB.");
                    return;
                  }
                  setError("");
                  setComprobante(archivo);
                }}
                className="mt-3 w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-foreground"
              />
            </div>
          )}

          <div className="mt-8 flex items-start gap-3">
            <input
              id="pedido-acepta"
              type="checkbox"
              required
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 accent-[var(--brand)]"
            />
            <label htmlFor="pedido-acepta" className="text-sm text-muted">
              Leí y acepto los{" "}
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
        </div>
      )}

      {/* Barra inferior: resumen + navegación (se queda pegada abajo mientras hay contenido) */}
      <div className="sticky bottom-4 z-30 mt-10 rounded-2xl border border-border bg-background/90 shadow-xl shadow-black/30 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            {error ? (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            ) : (
              <>
                <p className="truncate text-xs text-muted">{resumenCorto || "Todavía no elegiste nada"}</p>
                <p className="text-lg font-semibold">{formatoMoneda(total)}</p>
              </>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {indicePaso > 0 && (
              <button
                type="button"
                onClick={() => irA(PASOS[indicePaso - 1].id)}
                className="rounded-full px-4 py-3 text-sm text-muted transition-colors hover:text-foreground"
              >
                Volver
              </button>
            )}
            <button type="button" disabled={!puedeContinuar} onClick={continuar} className={BOTON_PRIMARIO}>
              {paso === "resumen" ? (
                enviando ? (
                  "Confirmando..."
                ) : (
                  "Confirmar pedido"
                )
              ) : (
                <>
                  Continuar <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
