import { redirect } from "next/navigation";
import { BoxBuilder } from "@/components/cliente/BoxBuilder";
import { fetchCajas, fetchProductos, fetchTematicas, fetchZonasReparto } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ArmarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [cajas, tematicas, productos, zonas] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchProductos(),
    fetchZonasReparto(),
  ]);

  return <BoxBuilder cajas={cajas} tematicas={tematicas} productos={productos} zonas={zonas} />;
}
