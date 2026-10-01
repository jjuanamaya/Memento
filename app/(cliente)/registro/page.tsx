import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegistroForm } from "@/components/cliente/RegistroForm";
import { createClient } from "@/lib/supabase/server";
import { rutaInterna } from "@/lib/rutaSegura";

export const metadata: Metadata = { title: "Crear cuenta — Memento" };

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const destino = rutaInterna((await searchParams).next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(destino);

  return <RegistroForm destino={destino} />;
}
