"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorAdmin({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">No se pudo cargar esta sección</h1>
      <p className="mt-3 text-muted">
        Puede ser un problema momentáneo de conexión con la base de datos. Si se repite, revisá que Supabase esté
        funcionando.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90"
        >
          Probar de nuevo
        </button>
        <Link href="/admin" className="rounded-full border border-border px-6 py-3 font-medium hover:border-brand/40">
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
