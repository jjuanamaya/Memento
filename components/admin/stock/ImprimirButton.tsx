"use client";

export function ImprimirButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
    >
      Imprimir comprobante
    </button>
  );
}
