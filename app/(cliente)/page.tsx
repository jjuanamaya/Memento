import Link from "next/link";
import { fetchCajas, fetchFrecuenciasSuscripcion } from "@/lib/supabase/queries";

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

const PASOS = [
  {
    numero: "01",
    titulo: "Elegí tu caja",
    texto: "Tres tamaños, según cuánto quieras sorprender.",
  },
  {
    numero: "02",
    titulo: "Llenala a tu gusto",
    texto: "Snacks, dulces y bebidas: vos decidís qué va adentro.",
  },
  {
    numero: "03",
    titulo: "Nosotros la llevamos",
    texto: "Coordinamos la entrega y llega lista para regalar.",
  },
];

const VALORES = [
  {
    icono: "🤲",
    titulo: "Armada a mano",
    texto: "Cada caja se prepara una por una, cuidando cada detalle antes de salir.",
  },
  {
    icono: "✍️",
    titulo: "Hecha a tu medida",
    texto: "Nada de combos cerrados: el contenido lo elegís vos, pensando en esa persona.",
  },
  {
    icono: "📍",
    titulo: "Cerca tuyo",
    texto: "Somos de Cañada de Gómez y entregamos en la ciudad, sin vueltas.",
  },
];

const PREGUNTAS = [
  {
    pregunta: "¿Dónde entregan?",
    respuesta:
      "Por ahora repartimos en Cañada de Gómez. Al hacer el pedido cargás la dirección y te contactamos para coordinar la entrega.",
  },
  {
    pregunta: "¿Cómo pago?",
    respuesta:
      "Por transferencia (podés subir el comprobante al hacer el pedido) o en efectivo cuando recibís la caja.",
  },
  {
    pregunta: "¿Puedo elegir qué va adentro?",
    respuesta: "Sí. Elegís el tamaño de la caja y después sumás los productos que quieras hasta completarla.",
  },
  {
    pregunta: "¿Puedo pausar o cancelar la suscripción?",
    respuesta: "Sí, desde \"Mis suscripciones\" la pausás, la reactivás o la cancelás cuando quieras.",
  },
];

export default async function HomePage() {
  const [cajas, frecuencias] = await Promise.all([fetchCajas(), fetchFrecuenciasSuscripcion()]);
  const fotos = cajas.filter((c) => c.imagen).slice(0, 3);
  const precioDesde = cajas.length ? Math.min(...cajas.map((c) => c.precio)) : null;
  const suscripcionDesde = frecuencias.length ? Math.min(...frecuencias.map((f) => f.precio)) : null;

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
              En Memento armás una caja de regalo a medida: vos elegís qué va adentro, nosotros la preparamos con
              cuidado y la llevamos hasta la puerta.
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
              <li>✓ Armada a mano</li>
              <li>✓ Entrega a domicilio</li>
              <li>✓ Transferencia o efectivo</li>
            </ul>
          </div>

          {/* Collage de cajas */}
          <div className="animate-fade-in-up relative mx-auto h-[360px] w-full max-w-md [animation-delay:200ms] sm:h-[440px]">
            {fotos.length > 0 ? (
              <>
                <img
                  src={fotos[0].imagen}
                  alt={fotos[0].nombre}
                  className="absolute left-0 top-6 h-60 w-48 rotate-[-6deg] rounded-3xl object-cover shadow-2xl shadow-black/40 sm:h-72 sm:w-56"
                />
                {fotos[1] && (
                  <img
                    src={fotos[1].imagen}
                    alt={fotos[1].nombre}
                    className="absolute right-0 top-0 h-56 w-44 rotate-[5deg] rounded-3xl object-cover shadow-2xl shadow-black/40 sm:h-64 sm:w-52"
                  />
                )}
                {fotos[2] && (
                  <img
                    src={fotos[2].imagen}
                    alt={fotos[2].nombre}
                    className="animate-float absolute bottom-0 left-1/2 h-52 w-44 -translate-x-1/2 rounded-3xl object-cover shadow-2xl shadow-black/50 ring-4 ring-background sm:h-60 sm:w-52"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[2rem] bg-linear-to-br from-brand/30 via-brand/10 to-transparent">
                <span className="animate-float text-8xl">🎁</span>
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
                <span className="text-5xl font-semibold text-brand/40">{paso.numero}</span>
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
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand/15 text-2xl">
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
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {cajas.map((caja) => (
              <Link
                key={caja.id}
                href="/armar"
                className="group overflow-hidden rounded-3xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-black/30"
              >
                <div className="h-56 overflow-hidden">
                  {caja.imagen ? (
                    <img
                      src={caja.imagen}
                      alt={caja.nombre}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-linear-to-br from-brand/30 to-transparent text-6xl">
                      🎁
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold">{caja.nombre}</h3>
                    <span className="font-semibold text-brand">{formatoMoneda(caja.precio)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{caja.descripcion}</p>
                  {caja.capacidad > 0 && (
                    <p className="mt-3 text-xs text-muted">Hasta {caja.capacidad} productos</p>
                  )}
                  <p className="mt-5 text-sm font-medium text-brand transition-transform group-hover:translate-x-1">
                    Armar esta caja →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Suscripción */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-brand to-[#c4572f] px-8 py-14 text-brand-foreground sm:px-14">
          <div className="pointer-events-none absolute -right-10 -top-10 text-[10rem] opacity-15">🎁</div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">Suscripción</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Que la sorpresa llegue sola.
          </h2>
          <p className="mt-4 max-w-lg opacity-90">
            Recibí una caja cada semana, cada 15 días o cada mes. La pausás o la cancelás cuando quieras.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/suscribirse"
              className="rounded-full bg-background px-7 py-3.5 font-medium text-foreground transition-transform hover:-translate-y-0.5"
            >
              Suscribirme
            </Link>
            {suscripcionDesde !== null && (
              <span className="text-sm font-medium opacity-90">Desde {formatoMoneda(suscripcionDesde)} por entrega</span>
            )}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
          {PREGUNTAS.map((item) => (
            <details key={item.pregunta} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.pregunta}
                <span className="text-xl text-brand transition-transform group-open:rotate-45">+</span>
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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted sm:flex-row">
          <span className="font-semibold tracking-wide text-foreground">MEMENTO</span>
          <span>Cajas de regalo en Cañada de Gómez</span>
        </div>
      </footer>
    </div>
  );
}
