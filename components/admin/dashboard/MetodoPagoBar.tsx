"use client";

import { useEffect, useState } from "react";
import { CHART_COLORS } from "@/lib/chartColors";

interface MetodoPagoBarProps {
  transferencia: number;
  efectivo: number;
}

export function MetodoPagoBar({ transferencia, efectivo }: MetodoPagoBarProps) {
  const [visible, setVisible] = useState(false);
  const [animar, setAnimar] = useState(true);

  useEffect(() => {
    setAnimar(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame2);
    });
    return () => cancelAnimationFrame(frame1);
  }, []);

  const total = transferencia + efectivo;

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted">Todavía no hay pedidos para comparar métodos de pago.</p>;
  }

  const pctTransferencia = Math.round((transferencia / total) * 100);
  const pctEfectivo = 100 - pctTransferencia;
  const escala = animar ? (visible ? 1 : 0) : 1;
  const transicion = animar ? "width 1800ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";

  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-full bg-background">
        {transferencia > 0 && (
          <div
            className="h-full"
            style={{ width: `${pctTransferencia * escala}%`, backgroundColor: CHART_COLORS.transferencia, transition: transicion }}
          />
        )}
        {transferencia > 0 && efectivo > 0 && <div className="h-full w-[2px] bg-background" />}
        {efectivo > 0 && (
          <div
            className="h-full"
            style={{ width: `${pctEfectivo * escala}%`, backgroundColor: CHART_COLORS.efectivo, transition: transicion }}
          />
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: CHART_COLORS.transferencia }} />
          <span className="text-muted">Transferencia</span>
          <span className="ml-auto font-medium">
            {pctTransferencia}% <span className="text-muted">({transferencia})</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: CHART_COLORS.efectivo }} />
          <span className="text-muted">Efectivo</span>
          <span className="ml-auto font-medium">
            {pctEfectivo}% <span className="text-muted">({efectivo})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
