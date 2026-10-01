"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { LeyendaDatosPersonales } from "@/components/legal/LeyendaDatosPersonales";

const INPUT =
  "mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]";

export function ArrepentimientoForm() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);

    const supabase = createClient();
    const { data, error: errorRpc } = await supabase.rpc("crear_solicitud_arrepentimiento", {
      p_nombre: nombre,
      p_email: email,
      p_numero_pedido: numeroPedido,
      p_detalle: detalle,
    });

    setEnviando(false);

    if (errorRpc || !data) {
      console.error("Error al registrar arrepentimiento:", errorRpc);
      const conocido = errorRpc?.message?.includes("email") || errorRpc?.message?.includes("Completá");
      setError(conocido ? errorRpc!.message : "No pudimos registrar la solicitud. Probá de nuevo en un momento.");
      return;
    }

    setCodigo(data as string);
  }

  if (codigo) {
    return (
      <div role="status" className="rounded-2xl border border-brand/50 bg-surface p-6 text-center">
        <p className="text-sm text-muted">Recibimos tu solicitud. Tu código de identificación es:</p>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-wider text-brand">{codigo}</p>
        <p className="mt-4 text-sm text-muted">
          Guardalo: te sirve para hacer el seguimiento. Nos vamos a comunicar al email que dejaste para avanzar con la
          cancelación y el reintegro.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-5 rounded-2xl border border-border bg-surface p-6">
      <div>
        <label htmlFor="arr-nombre" className="text-sm font-medium">
          Nombre y apellido
        </label>
        <input
          id="arr-nombre"
          required
          maxLength={120}
          autoComplete="name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="arr-email" className="text-sm font-medium">
          Email (ahí te escribimos)
        </label>
        <input
          id="arr-email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="arr-pedido" className="text-sm font-medium">
          Número de pedido <span className="font-normal text-muted">(opcional, lo ves en &quot;Mis pedidos&quot;)</span>
        </label>
        <input
          id="arr-pedido"
          maxLength={60}
          value={numeroPedido}
          onChange={(e) => setNumeroPedido(e.target.value)}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="arr-detalle" className="text-sm font-medium">
          Comentario <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="arr-detalle"
          rows={3}
          maxLength={1000}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          className={INPUT}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Enviando solicitud..." : "Enviar solicitud de arrepentimiento"}
      </button>

      <LeyendaDatosPersonales />
    </form>
  );
}
