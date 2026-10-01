"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INPUT =
  "mt-2 w-full rounded-xl border border-muted/70 bg-transparent p-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(232,121,79,0.18)]";

export function RestablecerForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (password !== repetir) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    const { error: errorUpdate } = await createClient().auth.updateUser({ password });
    setGuardando(false);

    if (errorUpdate) {
      setError(
        errorUpdate.message.includes("different")
          ? "La contraseña nueva tiene que ser distinta de la anterior."
          : "No pudimos guardar la contraseña. Pedí un enlace nuevo y probá otra vez."
      );
      return;
    }

    setListo(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  if (listo) {
    return (
      <p role="status" className="mt-4 text-sm text-emerald-400">
        ¡Listo! Tu contraseña se cambió. Te llevamos al inicio...
      </p>
    );
  }

  return (
    <form onSubmit={guardar} className="mt-6 space-y-4">
      <div>
        <label htmlFor="nueva-password" className="text-sm font-medium">
          Contraseña nueva <span className="font-normal text-muted">(mínimo 6 caracteres)</span>
        </label>
        <input
          id="nueva-password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="repetir-password" className="text-sm font-medium">
          Repetila
        </label>
        <input
          id="repetir-password"
          type="password"
          required
          autoComplete="new-password"
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
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
        disabled={guardando}
        className="w-full rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar contraseña nueva"}
      </button>
    </form>
  );
}
