import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuscripcionForm } from "@/components/cliente/SuscripcionForm";
import { fetchCajas, fetchFrecuenciasSuscripcion, fetchTematicas, fetchZonasReparto } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Suscribirme — Memento" };

export default async function SuscribirsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/suscribirse");

  const [cajas, tematicas, zonas, frecuencias, perfil] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchZonasReparto(),
    fetchFrecuenciasSuscripcion(),
    supabase.from("perfiles").select("telefono").eq("id", user.id).single(),
  ]);

  return (
    <SuscripcionForm
      cajas={cajas}
      tematicas={tematicas}
      zonas={zonas}
      frecuencias={frecuencias}
      telefonoInicial={perfil.data?.telefono ?? ""}
    />
  );
}
