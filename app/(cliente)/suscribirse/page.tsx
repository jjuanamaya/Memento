import { redirect } from "next/navigation";
import { SuscripcionForm } from "@/components/cliente/SuscripcionForm";
import { fetchCajas, fetchTematicas, fetchZonasReparto } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SuscribirsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [cajas, tematicas, zonas] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchZonasReparto(),
  ]);

  return <SuscripcionForm cajas={cajas} tematicas={tematicas} zonas={zonas} />;
}
