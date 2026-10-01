import type { Metadata } from "next";
import Link from "next/link";
import { ArrepentimientoForm } from "@/components/legal/ArrepentimientoForm";

export const metadata: Metadata = { title: "Botón de arrepentimiento — Memento" };

export default function ArrepentimientoPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Botón de arrepentimiento</h1>
      <p className="mt-3 text-muted">
        Tenés 10 días corridos desde que recibiste tu pedido (o desde que lo confirmaste, lo que ocurra último) para
        arrepentirte de la compra. No hace falta registrarte ni explicar el motivo. Al enviar el formulario recibís en el
        momento un código para hacer el seguimiento.
      </p>
      <p className="mt-3 text-sm text-muted">
        Antes de enviarlo, podés leer qué casos cubre en la{" "}
        <Link href="/cambios-y-devoluciones" className="text-brand underline underline-offset-2">
          Política de cambios y devoluciones
        </Link>
        .
      </p>
      <div className="mt-8">
        <ArrepentimientoForm />
      </div>
    </div>
  );
}
