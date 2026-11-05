"use client";

import { useState } from "react";
import type { Configuracion } from "@/lib/types";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, el dato igual queda a la vista.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-xs text-muted">{etiqueta}</p>
        <p className="break-all font-mono text-sm font-medium">{valor}</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        aria-label={`Copiar ${etiqueta}`}
        className="flex-shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand/40"
      >
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

/** CBU, alias y titular de la cuenta para que el cliente haga la transferencia. */
export function DatosTransferencia({ config, monto }: { config: Configuracion; monto: number }) {
  const hayDatos = config.cbu || config.alias;

  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
      <p className="text-sm font-medium">
        Transferí <span className="text-brand">${Math.round(monto).toLocaleString("es-AR")}</span> a esta cuenta:
      </p>
      {hayDatos ? (
        <div className="mt-3 divide-y divide-border">
          {config.alias && <Dato etiqueta="Alias" valor={config.alias} />}
          {config.cbu && <Dato etiqueta="CBU / CVU" valor={config.cbu} />}
          {(config.titularCuenta || config.banco) && (
            <p className="pt-2 text-xs text-muted">
              {[config.titularCuenta && `Titular: ${config.titularCuenta}`, config.banco].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Todavía no cargamos los datos de la cuenta. Elegí efectivo o escribinos para pasártelos.
        </p>
      )}
    </div>
  );
}
