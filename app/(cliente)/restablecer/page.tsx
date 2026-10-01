import type { Metadata } from "next";
import Link from "next/link";
import { RestablecerForm } from "@/components/cliente/RestablecerForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nueva contraseña — Memento" };

export default async function RestablecerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <div className="rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-semibold">Elegí una contraseña nueva</h1>
        {user ? (
          <RestablecerForm />
        ) : (
          <p className="mt-4 text-sm text-muted">
            El enlace venció o ya se usó.{" "}
            <Link href="/recuperar" className="text-brand underline underline-offset-2">
              Pedí uno nuevo
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
