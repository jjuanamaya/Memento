"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Configuracion } from "@/lib/types";

const INPUT =
  "w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

export function ConfiguracionForm({ configInicial }: { configInicial: Configuracion }) {
  const [costoEnvio, setCostoEnvio] = useState(String(configInicial.costoEnvio));
  const [alias, setAlias] = useState(configInicial.alias);
  const [cbu, setCbu] = useState(configInicial.cbu);
  const [titular, setTitular] = useState(configInicial.titularCuenta);
  const [banco, setBanco] = useState(configInicial.banco);
  const [direccionLocal, setDireccionLocal] = useState(configInicial.direccionLocal);
  const [horarioRetiro, setHorarioRetiro] = useState(configInicial.horarioRetiro);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMensaje("");

    const costoNum = Number(costoEnvio);
    const cbuLimpio = cbu.replace(/\s/g, "");
    if (!Number.isFinite(costoNum) || costoNum < 0) {
      setError("El costo de envío tiene que ser un número válido (0 = envío gratis).");
      return;
    }
    if (cbuLimpio && !/^\d{22}$/.test(cbuLimpio)) {
      setError("El CBU / CVU tiene que tener 22 números.");
      return;
    }

    setGuardando(true);
    const { error: errorUpdate } = await createClient()
      .from("configuracion")
      .update({
        costo_envio: costoNum,
        alias: alias.trim() || null,
        cbu: cbuLimpio || null,
        titular_cuenta: titular.trim() || null,
        banco: banco.trim() || null,
        direccion_local: direccionLocal.trim() || null,
        horario_retiro: horarioRetiro.trim() || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", 1);
    setGuardando(false);

    if (errorUpdate) {
      console.error("Error al guardar la configuración:", errorUpdate);
      setError("No se pudo guardar. Probá de nuevo.");
      return;
    }
    setMensaje("Listo: los cambios ya se ven en la web.");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium">🚚 Envío</h2>
        <p className="mt-1 text-xs text-muted">Un mismo costo para todos los envíos. Retirar en el local es sin cargo.</p>
        <label htmlFor="config-envio" className="mt-4 mb-1 block text-xs font-medium text-muted">
          Costo de envío
        </label>
        <input
          id="config-envio"
          inputMode="decimal"
          value={costoEnvio}
          onChange={(e) => setCostoEnvio(e.target.value)}
          className={INPUT}
        />

        <h2 className="mt-6 font-medium">🏪 Retiro en el local</h2>
        <label htmlFor="config-direccion" className="mt-4 mb-1 block text-xs font-medium text-muted">
          Dirección del local
        </label>
        <input
          id="config-direccion"
          value={direccionLocal}
          maxLength={200}
          onChange={(e) => setDireccionLocal(e.target.value)}
          placeholder="Ej: San Martín 123, Cañada de Gómez"
          className={INPUT}
        />
        <label htmlFor="config-horario" className="mt-4 mb-1 block text-xs font-medium text-muted">
          Horario de retiro
        </label>
        <input
          id="config-horario"
          value={horarioRetiro}
          maxLength={120}
          onChange={(e) => setHorarioRetiro(e.target.value)}
          placeholder="Ej: lunes a sábados de 10 a 13 y de 17 a 20"
          className={INPUT}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium">🏦 Datos para transferencias</h2>
        <p className="mt-1 text-xs text-muted">
          Se le muestran al cliente cuando elige pagar por transferencia, para que suba el comprobante.
        </p>
        <label htmlFor="config-alias" className="mt-4 mb-1 block text-xs font-medium text-muted">
          Alias
        </label>
        <input
          id="config-alias"
          value={alias}
          maxLength={40}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Ej: memento.regalos"
          className={INPUT}
        />
        <label htmlFor="config-cbu" className="mt-4 mb-1 block text-xs font-medium text-muted">
          CBU / CVU
        </label>
        <input
          id="config-cbu"
          inputMode="numeric"
          value={cbu}
          maxLength={30}
          onChange={(e) => setCbu(e.target.value)}
          placeholder="22 números"
          className={INPUT}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="config-titular" className="mb-1 block text-xs font-medium text-muted">
              Titular
            </label>
            <input
              id="config-titular"
              value={titular}
              maxLength={100}
              onChange={(e) => setTitular(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="config-banco" className="mb-1 block text-xs font-medium text-muted">
              Banco / billetera
            </label>
            <input
              id="config-banco"
              value={banco}
              maxLength={60}
              onChange={(e) => setBanco(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-4 lg:col-span-2">
        {mensaje && (
          <p role="status" className="text-sm text-emerald-400">
            {mensaje}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
