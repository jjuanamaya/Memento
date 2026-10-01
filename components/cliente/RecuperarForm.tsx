"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INPUT =
  "mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]";

export function RecuperarForm() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);

    const { error: errorEnvio } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
    });

    setEnviando(false);

    // Por seguridad no decimos si el email existe o no: mismo mensaje siempre,
    // salvo que Supabase limite los envíos por exceso de intentos.
    if (errorEnvio?.status === 429) {
      setError("Hiciste muchos pedidos seguidos. Esperá unos minutos y probá de nuevo.");
      return;
    }
    if (errorEnvio) console.error("Error al pedir recuperación:", errorEnvio);
    setEnviado(true);
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <div className="rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>

        {enviado ? (
          <p role="status" className="mt-4 text-sm text-muted">
            Si hay una cuenta con <strong className="text-foreground">{email}</strong>, te llegó un email con un enlace
            para elegir una contraseña nueva. Revisá también la carpeta de spam.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">Te mandamos un enlace a tu email para elegir una nueva.</p>
            <form onSubmit={enviar} className="mt-6 space-y-4">
              <div>
                <label htmlFor="recuperar-email" className="text-sm font-medium">
                  Email de tu cuenta
                </label>
                <input
                  id="recuperar-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {enviando ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-sm text-muted">
          <Link href="/login" className="text-brand hover:opacity-80">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
