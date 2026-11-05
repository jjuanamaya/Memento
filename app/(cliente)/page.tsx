import Link from "next/link";
import {
  fetchCajas,
  fetchConfiguracion,
  fetchCotizaciones,
  fetchFrecuenciasSuscripcion,
} from "@/lib/supabase/queries";
import type { Configuracion } from "@/lib/types";

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

const PASOS = [
  {
    numero: "01",
    titulo: "Elegí tamaño y temática",
    texto: "La llenamos con los productos de la temática, o elegí Personalizada y armala producto por producto.",
  },
  {
    numero: "02",
    titulo: "Decinos cómo la recibís",
    texto: "Te la llevamos a domicilio o la retirás en el local, y pagás por transferencia o en efectivo.",
  },
  {
    numero: "03",
    titulo: "Nosotros la preparamos",
    texto: "La armamos con cuidado y coordinamos con vos la entrega o el retiro.",
  },
];

const VALORES = [
  {
    icono: "✍️",
    titulo: "Lista o a tu medida",
    texto: "Elegí una temática y te la llenamos con todo pensado, o armala vos con los productos que quieras.",
  },
  {
    icono: "📍",
    titulo: "Envío o retiro en Cañada de Gómez",
    texto: "Un único costo de envío para toda la ciudad, o retirala sin cargo en nuestro local.",
  },
  {
    icono: "💳",
    titulo: "Pagás como prefieras",
    texto: "Por transferencia (subís el comprobante al pedir) o en efectivo al recibir o retirar.",
  },
];

function preguntasFrecuentes(config: Configuracion) {
  const envio = config.costoEnvio > 0 ? `cuesta ${formatoMoneda(config.costoEnvio)}` : "es sin cargo";
  const local = config.direccionLocal
    ? `en ${config.direccionLocal}${config.horarioRetiro ? ` (${config.horarioRetiro})` : ""}`
    : "en nuestro local (te pasamos la dirección al confirmar)";

  return [
    {
      pregunta: "¿Cómo armo mi caja?",
      respuesta:
        "Elegís el tamaño de la caja (cuántos productos lleva) y una temática. Nosotros la llenamos con los productos de esa temática: antes de pedir ves exactamente qué trae y el precio final. Si preferís elegir vos cada producto, elegí la temática \"Personalizada\".",
    },
    {
      pregunta: "¿Cuánto sale el envío?",
      respuesta: `El envío a domicilio dentro de Cañada de Gómez ${envio}, sin importar la zona. Si preferís, la retirás en el local sin cargo. En el último paso ves el subtotal, el envío y el total antes de confirmar.`,
    },
    {
      pregunta: "¿Puedo retirarla yo?",
      respuesta: `Sí. Al hacer el pedido elegí "Retiro en el local" y la retirás ${local}. Te avisamos cuando está lista.`,
    },
    {
      pregunta: "¿Puedo dejar indicaciones para la entrega?",
      respuesta:
        "Sí. Además de la dirección hay un campo opcional para indicaciones, por ejemplo \"casa de la esquina con reja negra, timbre 2\".",
    },
    {
      pregunta: "¿Cómo pago?",
      respuesta:
        "Por transferencia o en efectivo. Si elegís transferencia, en el último paso te mostramos el alias y el CBU: hacés la transferencia, subís el comprobante y recién ahí se confirma el pedido. En efectivo pagás al recibir o al retirar la caja.",
    },
    {
      pregunta: "¿Cómo funciona la suscripción?",
      respuesta:
        "Elegís el tamaño de la caja, al menos dos temáticas que te gusten y cada cuánto querés recibirla. En cada entrega te llega una temática al azar entre las que elegiste, sin repetir hasta que salgan todas.",
    },
    {
      pregunta: "¿Cómo pago la suscripción?",
      respuesta:
        "Se paga por período. Por transferencia: subís el comprobante del primer período al suscribirte y los siguientes desde \"Mis suscripciones\", donde también ves si estás al día. En efectivo: pagás en cada entrega. Si un período queda impago, podemos pausar la suscripción hasta regularizarlo.",
    },
    {
      pregunta: "¿Puedo pausar o cancelar la suscripción?",
      respuesta:
        "Sí, desde \"Mis suscripciones\" la pausás, la reactivás o la cancelás cuando quieras. Mientras está pausada no corren los días de entrega ni de pago.",
    },
    {
      pregunta: "¿Qué pasa si un producto se agota?",
      respuesta:
        "Llenamos la caja con los productos de la temática que tengamos en stock. Si no alcanza para llenar un tamaño, esa temática aparece como \"sin stock\" para ese tamaño hasta que reponemos. En la Personalizada solo podés sumar productos con stock.",
    },
    {
      pregunta: "¿Y si me arrepiento de la compra?",
      respuesta:
        "Tenés 10 días corridos para arrepentirte. Lo pedís desde el \"Botón de arrepentimiento\", sin registrarte. Los detalles están en la política de cambios y devoluciones.",
    },
  ];
}

export default async function HomePage() {
  const [cajas, cotizaciones, frecuencias, config] = await Promise.all([
    fetchCajas(),
    fetchCotizaciones(),
    fetchFrecuenciasSuscripcion(),
    fetchConfiguracion(),
  ]);
  const fotos = cajas.filter((c) => c.imagen).slice(0, 3);
  const disponibles = cotizaciones.filter((c) => c.estado === "disponible");
  const desdeDe = (cajaId: string) => {
    const precios = disponibles.filter((c) => c.cajaId === cajaId).map((c) => c.precio);
    return precios.length ? Math.min(...precios) : null;
  };
  const precioDesde = disponibles.length ? Math.min(...disponibles.map((c) => c.precio)) : null;
  const suscripcionDesde = frecuencias.length ? Math.min(...frecuencias.map((f) => f.precio)) : null;
  const preguntas = preguntasFrecuentes(config);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-brand/15 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <p className="animate-fade-in-up text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              Cajas de regalo · Cañada de Gómez
            </p>
            <h1 className="animate-fade-in-up mt-5 text-4xl font-semibold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl">
              Regalá un momento, no un objeto.
            </h1>
            <p className="animate-fade-in-up mt-6 max-w-md text-lg text-muted [animation-delay:160ms]">
              En Memento elegís una caja de regalo lista o la armás a tu medida. Nosotros la preparamos y te la
              llevamos en Cañada de Gómez, o la retirás en el local.
            </p>
            <div className="animate-fade-in-up mt-8 flex flex-wrap items-center gap-3 [animation-delay:240ms]">
              <Link
                href="/armar"
                className="rounded-full bg-brand px-8 py-3.5 font-medium text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/35"
              >
                Armar mi caja
              </Link>
              <Link
                href="/suscribirse"
                className="rounded-full border border-border px-6 py-3.5 font-medium transition-colors hover:border-brand/50 hover:bg-surface"
              >
                Ver suscripciones
              </Link>
            </div>
            <ul className="animate-fade-in-up mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted [animation-delay:320ms]">
              <li>
                <span aria-hidden="true">✓ </span>Lista o a tu gusto
              </li>
              <li>
                <span aria-hidden="true">✓ </span>Envío o retiro en el local
              </li>
              <li>
                <span aria-hidden="true">✓ </span>Transferencia o efectivo
              </li>
            </ul>
          </div>

          {/* Collage de cajas */}
          <div className="animate-fade-in-up relative mx-auto h-[360px] w-full max-w-md [animation-delay:200ms] sm:h-[440px]">
            {fotos.length > 0 ? (
              <>
                <img
                  src={fotos[0].imagen}
                  alt={`${fotos[0].nombre} (imagen ilustrativa)`}
                  className="absolute left-0 top-6 h-60 w-48 rotate-[-6deg] rounded-3xl object-cover shadow-2xl shadow-black/40 sm:h-72 sm:w-56"
                />
                {fotos[1] && (
                  <img
                    src={fotos[1].imagen}
                    alt={`${fotos[1].nombre} (imagen ilustrativa)`}
                    className="absolute right-0 top-0 h-56 w-44 rotate-[5deg] rounded-3xl object-cover shadow-2xl shadow-black/40 sm:h-64 sm:w-52"
                  />
                )}
                {fotos[2] && (
                  <img
                    src={fotos[2].imagen}
                    alt={`${fotos[2].nombre} (imagen ilustrativa)`}
                    className="animate-float absolute bottom-0 left-1/2 h-52 w-44 -translate-x-1/2 rounded-3xl object-cover shadow-2xl shadow-black/50 ring-4 ring-background sm:h-60 sm:w-52"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[2rem] bg-linear-to-br from-brand/30 via-brand/10 to-transparent">
                <span aria-hidden="true" className="animate-float text-8xl">
                  🎁
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-y border-border bg-surface/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-brand">Cómo funciona</p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Tu regalo, listo en tres pasos
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {PASOS.map((paso) => (
              <div key={paso.numero} className="text-center sm:text-left">
                <span aria-hidden="true" className="text-5xl font-semibold text-brand">
                  {paso.numero}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{paso.titulo}</h3>
                <p className="mt-2 text-muted">{paso.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por qué Memento */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">Por qué Memento</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Los mejores regalos no se compran apurados.
            </h2>
            <p className="mt-5 text-muted">
              Memento existe para que regalar algo personal sea fácil. Elegís, armás y nosotros nos encargamos del
              resto — para que esa persona abra la caja y sienta que fue pensada para ella.
            </p>
          </div>
          <div className="grid gap-4">
            {VALORES.map((valor) => (
              <div key={valor.titulo} className="flex gap-4 rounded-2xl border border-border bg-surface p-5">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand/15 text-2xl"
                >
                  {valor.icono}
                </span>
                <div>
                  <h3 className="font-semibold">{valor.titulo}</h3>
                  <p className="mt-1 text-sm text-muted">{valor.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cajas */}
      {cajas.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">Nuestras cajas</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Elegí el tamaño</h2>
            </div>
            {precioDesde !== null && <p className="text-muted">Desde {formatoMoneda(precioDesde)}</p>}
          </div>
          <p className="mt-2 text-xs text-muted">Imágenes ilustrativas: la presentación final puede variar.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {cajas.map((caja) => {
              const desde = desdeDe(caja.id);
              return (
              <Link
                key={caja.id}
                href="/armar"
                className="group overflow-hidden rounded-3xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-black/30"
              >
                <div className="h-56 overflow-hidden">
                  {caja.imagen ? (
                    <img
                      src={caja.imagen}
                      alt={`${caja.nombre} (imagen ilustrativa)`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-full items-center justify-center bg-linear-to-br from-brand/30 to-transparent text-6xl"
                    >
                      🎁
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold">{caja.nombre}</h3>
                    {desde !== null && (
                      <span className="text-sm font-semibold text-brand">Desde {formatoMoneda(desde)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">{caja.descripcion}</p>
                  <p className="mt-3 text-xs text-muted">Lleva {caja.capacidad} productos de la temática que elijas</p>
                  <p className="mt-5 text-sm font-medium text-brand transition-transform group-hover:translate-x-1">
                    Armar esta caja <span aria-hidden="true">→</span>
                  </p>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Suscripción */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand px-8 py-14 text-brand-foreground sm:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 text-[10rem] opacity-15">
            🎁
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">Suscripción</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Que la sorpresa llegue sola.
          </h2>
          <p className="mt-4 max-w-lg">
            {frecuencias.length > 0
              ? `Recibí una caja ${frecuencias.map((f) => f.etiqueta.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " o $1")}.`
              : "Recibí una caja sorpresa cada cierto tiempo."}{" "}
            La pausás o la cancelás cuando quieras.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/suscribirse"
              className="rounded-full bg-background px-7 py-3.5 font-medium text-foreground transition-transform hover:-translate-y-0.5"
            >
              Suscribirme
            </Link>
            {suscripcionDesde !== null && (
              <span className="text-sm font-semibold">Desde {formatoMoneda(suscripcionDesde)} por entrega</span>
            )}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
          {preguntas.map((item) => (
            <details key={item.pregunta} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.pregunta}
                <span aria-hidden="true" className="text-xl text-brand transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted">{item.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tu próximo regalo empieza acá.</h2>
          <Link
            href="/armar"
            className="mt-8 inline-block rounded-full bg-brand px-8 py-3.5 font-medium text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/35"
          >
            Armar mi caja
          </Link>
        </div>
      </section>
    </div>
  );
}
