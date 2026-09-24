import Link from "next/link";
import { fetchCajas, fetchTematicas } from "@/lib/supabase/queries";

export default async function HomePage() {
  const [cajas, tematicas] = await Promise.all([fetchCajas(), fetchTematicas()]);

  return (
    <div>
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <span className="animate-float inline-block text-5xl">🎁</span>
        <h1 className="animate-fade-in-up mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Creá tu momento. Regalá experiencias únicas.
        </h1>
        <p className="animate-fade-in-up mx-auto mt-4 max-w-xl text-muted [animation-delay:100ms]">
          Elegí lo que a esa persona le gusta, armá la caja a tu manera y convertí un regalo simple en un
          momento que va a recordar. Repartimos en Cañada de Gómez.
        </p>
        <Link
          href="/armar"
          className="animate-fade-in-up mt-8 inline-block rounded-full bg-brand px-8 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all [animation-delay:180ms] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0"
        >
          Armar mi caja
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-semibold">Temáticas</h2>
        <p className="mt-1 text-sm text-muted">El punto de partida para contar lo que querés decir.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {tematicas.map((tematica, i) => (
            <div
              key={tematica.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-fade-in-up rounded-2xl border border-border bg-surface p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand/40"
            >
              <p className="font-medium">{tematica.nombre}</p>
              <p className="mt-1 text-sm text-muted">{tematica.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-semibold">Nuestras cajas</h2>
        <p className="mt-1 text-sm text-muted">Esto es solo el punto de partida — todo se arma a tu gusto.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {cajas.map((caja, i) => (
            <div
              key={caja.id}
              style={{ animationDelay: `${i * 80}ms` }}
              className="animate-fade-in-up rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-black/20"
            >
              <p className="text-lg font-medium">{caja.nombre}</p>
              <p className="mt-1 text-sm text-muted">{caja.descripcion}</p>
              <p className="mt-4 text-xl font-semibold text-brand">${caja.precio}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
