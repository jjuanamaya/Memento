import Link from "next/link";
import { IconoRegalo } from "@/components/site/IconoRegalo";

export default function NoEncontrada() {
  return (
    <main id="contenido" className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="inline-flex text-brand">
        <IconoRegalo className="h-14 w-14" />
      </span>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold">Esta página no existe</h1>
      <p className="mt-3 text-muted">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
