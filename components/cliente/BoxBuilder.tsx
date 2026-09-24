"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Caja, MetodoPago, Producto, Tematica, ZonaReparto } from "@/lib/types";

type Paso = "caja" | "tematica" | "productos" | "resumen" | "exito";

const PASOS: { id: Paso; label: string }[] = [
  { id: "caja", label: "Caja" },
  { id: "tematica", label: "Temática" },
  { id: "productos", label: "Productos" },
  { id: "resumen", label: "Resumen y pago" },
];

const CATEGORIAS: { id: Producto["categoria"]; label: string }[] = [
  { id: "snack", label: "Snacks" },
  { id: "dulce", label: "Dulces" },
  { id: "bebida", label: "Bebidas" },
];

interface BoxBuilderProps {
  cajas: Caja[];
  tematicas: Tematica[];
  productos: Producto[];
  zonas: ZonaReparto[];
}

export function BoxBuilder({ cajas, tematicas, productos, zonas }: BoxBuilderProps) {
  const [paso, setPaso] = useState<Paso>("caja");
  const [caja, setCaja] = useState<Caja | null>(null);
  const [tematica, setTematica] = useState<Tematica | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [direccion, setDireccion] = useState("");
  const [zona, setZona] = useState<ZonaReparto | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(
    () =>
      productos
        .filter((producto) => (cantidades[producto.id] ?? 0) > 0)
        .map((producto) => ({ producto, cantidad: cantidades[producto.id] })),
    [cantidades]
  );

  const subtotalProductos = items.reduce(
    (total, item) => total + item.producto.precio * item.cantidad,
    0
  );
  const costoEnvio = zona?.costoEnvio ?? 0;
  const total = (caja?.precio ?? 0) + subtotalProductos + costoEnvio;

  const cantidadTotalItems = items.reduce((total, item) => total + item.cantidad, 0);
  const capacidadRestante = caja ? Math.max(caja.capacidad - cantidadTotalItems, 0) : 0;

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

  async function confirmarPedido() {
    if (!caja || !tematica || !metodoPago) return;

    setEnviando(true);
    setError("");

    const supabase = createClient();

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
        await supabase.from("pedidos").update({ comprobante_url: ruta }).eq("id", nuevoPedidoId);
      }
      // Si falla la subida, el pedido ya quedó creado igual — no bloqueamos
      // la compra por esto, se puede volver a mandar el comprobante después.
    }

    setEnviando(false);
    setPedidoId(nuevoPedidoId);
    setPaso("exito");
  }

  if (paso === "exito") {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <span className="animate-fade-in-up inline-block text-5xl">🎉</span>
        <p className="animate-fade-in-up mt-4 text-sm text-muted [animation-delay:80ms]">
          Pedido #{pedidoId?.slice(0, 8)}
        </p>
        <h1 className="animate-fade-in-up mt-2 text-3xl font-semibold [animation-delay:140ms]">
          ¡Tu caja fue armada!
        </h1>
        <p className="animate-fade-in-up mt-4 text-muted [animation-delay:200ms]">
          {metodoPago === "transferencia"
            ? "Te vamos a contactar con los datos para la transferencia y coordinar la entrega."
            : "Vas a pagar en efectivo al recibir tu caja. Te contactamos para coordinar la entrega."}
        </p>
        <a
          href="/"
          className="animate-fade-in-up mt-8 inline-block rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all [animation-delay:260ms] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <ol className="mb-10 flex items-center justify-between text-sm text-muted">
        {PASOS.map((p, i) => (
          <li
            key={p.id}
            className={`flex items-center gap-2 transition-colors duration-300 ${i === indicePaso ? "font-medium text-brand" : ""}`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-300 ${
                i <= indicePaso ? "border-brand text-brand" : "border-border"
              }`}
            >
              {i + 1}
            </span>
            {p.label}
          </li>
        ))}
      </ol>

      {paso === "caja" && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-semibold">Elegí tu caja</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {cajas.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setCaja(c)}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`animate-fade-in-up rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 ${
                  caja?.id === c.id
                    ? "border-brand bg-surface shadow-lg shadow-brand/10"
                    : "border-muted/70 hover:border-brand/40 hover:bg-surface"
                }`}
              >
                <p className="font-medium">{c.nombre}</p>
                <p className="mt-1 text-sm text-muted">{c.descripcion}</p>
                <p className="mt-4 font-semibold text-brand">${c.precio}</p>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <button
              disabled={!caja}
              onClick={() => setPaso("tematica")}
              className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {paso === "tematica" && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-semibold">Elegí una temática</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {tematicas.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setTematica(t)}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`animate-fade-in-up rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 ${
                  tematica?.id === t.id
                    ? "border-brand bg-surface shadow-lg shadow-brand/10"
                    : "border-muted/70 hover:border-brand/40 hover:bg-surface"
                }`}
              >
                <p className="font-medium">{t.nombre}</p>
                <p className="mt-1 text-sm text-muted">{t.descripcion}</p>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setPaso("caja")}
              className="px-6 py-3 text-muted transition-colors hover:text-foreground"
            >
              Volver
            </button>
            <button
              disabled={!tematica}
              onClick={() => setPaso("productos")}
              className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {paso === "productos" && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-semibold">Agregá productos a tu caja</h2>
          <p className="mt-1 text-sm text-muted">
            {caja?.nombre} admite hasta {caja?.capacidad} productos — te quedan{" "}
            <span className={capacidadRestante === 0 ? "font-medium text-brand" : ""}>{capacidadRestante}</span>{" "}
            lugares libres.
          </p>

          {CATEGORIAS.map((categoria) => (
            <div key={categoria.id} className="mt-8">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted">{categoria.label}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {productos
                  .filter((producto) => producto.categoria === categoria.id)
                  .map((producto) => {
                    const cantidad = cantidades[producto.id] ?? 0;
                    const sinStock = producto.stockActual === 0;
                    return (
                      <div
                        key={producto.id}
                        className={`flex items-center justify-between rounded-xl border border-border p-4 transition-colors ${
                          sinStock ? "opacity-50" : cantidad > 0 ? "border-brand/40 bg-surface" : ""
                        }`}
                      >
                        <div>
                          <p className="font-medium">{producto.nombre}</p>
                          <p className="text-sm text-muted">
                            ${producto.precio} {sinStock && "· sin stock"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => cambiarCantidad(producto, -1)}
                            disabled={cantidad === 0}
                            className="h-8 w-8 rounded-full border border-muted/70 transition-transform hover:border-brand/40 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-4 text-center">{cantidad}</span>
                          <button
                            onClick={() => cambiarCantidad(producto, 1)}
                            disabled={sinStock || cantidad >= producto.stockActual || capacidadRestante <= 0}
                            className="h-8 w-8 rounded-full border border-muted/70 transition-transform hover:border-brand/40 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setPaso("tematica")}
              className="px-6 py-3 text-muted transition-colors hover:text-foreground"
            >
              Volver
            </button>
            <button
              onClick={() => setPaso("resumen")}
              className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {paso === "resumen" && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-semibold">Resumen y pago</h2>

          <div className="mt-6 space-y-2 rounded-2xl border border-border p-6">
            <div className="flex justify-between">
              <span>{caja?.nombre}</span>
              <span>${caja?.precio}</span>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>Temática: {tematica?.nombre}</span>
            </div>
            {items.map((item) => (
              <div key={item.producto.id} className="flex justify-between text-sm text-muted">
                <span>
                  {item.cantidad}x {item.producto.nombre}
                </span>
                <span>${item.producto.precio * item.cantidad}</span>
              </div>
            ))}
            {zona && (
              <div className="flex justify-between text-sm text-muted">
                <span>Envío · {zona.nombre}</span>
                <span>{costoEnvio === 0 ? "Gratis" : `$${costoEnvio}`}</span>
              </div>
            )}
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-semibold">
              <span>Total</span>
              <span className="text-brand">${total}</span>
            </div>
          </div>

          <div className="mt-6">
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

          {metodoPago === "transferencia" && (
            <div className="mt-6">
              <label className="text-sm font-medium">Comprobante de transferencia (opcional)</label>
              <p className="mt-1 text-xs text-muted">
                Podés subirlo ahora o mandarlo después — igual te vamos a contactar para coordinar.
              </p>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                className="mt-2 w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-foreground"
              />
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setPaso("productos")}
              className="px-6 py-3 text-muted transition-colors hover:text-foreground"
            >
              Volver
            </button>
            <button
              disabled={!metodoPago || !direccion || enviando}
              onClick={confirmarPedido}
              className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
            >
              {enviando ? "Confirmando..." : "Confirmar pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
