import { redirect } from "next/navigation";
import { SuscripcionForm } from "@/components/cliente/SuscripcionForm";
import { fetchCajas, fetchFrecuenciasSuscripcion, fetchTematicas, fetchZonasReparto } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SuscribirsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [cajas, tematicas, zonas, frecuencias] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchZonasReparto(),
    fetchFrecuenciasSuscripcion(),
  ]);

  return <SuscripcionForm cajas={cajas} tematicas={tematicas} zonas={zonas} frecuencias={frecuencias} />;
}
