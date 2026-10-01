"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorCliente({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <span aria-hidden="true" className="text-5xl">
        😕
      </span>
      <h1 className="mt-4 text-2xl font-semibold">Algo salió mal</h1>
      <p className="mt-3 text-muted">
        No pudimos cargar esta página. Puede ser un problema momentáneo de conexión.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90"
        >
          Probar de nuevo
        </button>
        <Link href="/" className="rounded-full border border-border px-6 py-3 font-medium hover:border-brand/40">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
