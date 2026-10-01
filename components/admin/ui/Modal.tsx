"use client";

import { useEffect } from "react";

interface ModalProps {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ titulo, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-hidden="true" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="modal-titulo" className="text-lg font-semibold">
            {titulo}
          </h2>
          <button
            type="button"
            autoFocus
            aria-label="Cerrar ventana"
            onClick={onClose}
            className="rounded-lg border border-muted/70 px-2 py-1 text-xs text-muted hover:border-brand/40"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
