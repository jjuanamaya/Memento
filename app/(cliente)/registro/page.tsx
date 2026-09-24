import { redirect } from "next/navigation";
import { RegistroForm } from "@/components/cliente/RegistroForm";
import { createClient } from "@/lib/supabase/server";

export default async function RegistroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return <RegistroForm />;
}
