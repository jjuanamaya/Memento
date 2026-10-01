import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/cliente/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { rutaInterna } from "@/lib/rutaSegura";

export const metadata: Metadata = { title: "Ingresar — Memento" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const parametros = await searchParams;
  const destino = rutaInterna(parametros.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(destino);

  return <LoginForm destino={destino} enlaceVencido={parametros.error === "enlace"} />;
}
