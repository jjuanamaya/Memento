"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeyendaDatosPersonales } from "@/components/legal/LeyendaDatosPersonales";
import { ULTIMA_ACTUALIZACION_LEGAL } from "@/lib/negocio";

const INPUT =
  "mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]";

function traducirError(mensaje: string) {
  if (mensaje.includes("already registered")) return "Ya existe una cuenta con ese email. Probá ingresar.";
  if (mensaje.includes("Password should be")) return "La contraseña tiene que tener al menos 6 caracteres.";
  if (mensaje.includes("invalid")) return "Revisá que el email esté bien escrito.";
  return "No pudimos crear la cuenta. Probá de nuevo en un momento.";
}

export function RegistroForm({ destino }: { destino: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!acepta) {
      setError("Para crear la cuenta tenés que aceptar los Términos y la Política de privacidad.");
      return;
    }
    setError("");
    setMensaje("");
    setCargando(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
        data: {
          nombre,
          // Constancia del consentimiento (Ley 25.326): cuándo y qué versión aceptó.
          acepto_terminos_en: new Date().toISOString(),
          version_terminos: ULTIMA_ACTUALIZACION_LEGAL,
        },
      },
    });

    setCargando(false);

    if (error) {
      setError(traducirError(error.message));
      return;
    }

    if (!data.session) {
      setMensaje("Cuenta creada. Revisá tu email para confirmarla antes de ingresar.");
      return;
    }

    router.push(destino);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <div className="animate-fade-in-up rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <p className="mt-1 text-sm text-muted">Un minuto y ya podés armar tu primera caja.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="registro-nombre" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="registro-nombre"
              required
              autoComplete="given-name"
              maxLength={80}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="registro-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="registro-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="registro-password" className="text-sm font-medium">
              Contraseña <span className="font-normal text-muted">(mínimo 6 caracteres)</span>
            </label>
            <input
              id="registro-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              id="registro-acepta"
              type="checkbox"
              required
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 accent-[var(--brand)]"
            />
            <label htmlFor="registro-acepta" className="text-sm text-muted">
              Soy mayor de 18 años, leí y acepto los{" "}
              <Link href="/terminos" target="_blank" className="text-brand underline underline-offset-2">
                Términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" target="_blank" className="text-brand underline underline-offset-2">
                Política de privacidad
              </Link>
              , y doy mi consentimiento para el tratamiento de mis datos (incluida su transferencia a los proveedores de
              alojamiento que se indican ahí).
            </label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          {mensaje && (
            <p role="status" className="text-sm text-brand">
              {mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link
            href={destino === "/" ? "/login" : `/login?next=${encodeURIComponent(destino)}`}
            className="text-brand transition-opacity hover:opacity-80"
          >
            Ingresá
          </Link>
        </p>

        <div className="mt-6 border-t border-border pt-4">
          <LeyendaDatosPersonales />
        </div>
      </div>
    </div>
  );
}
