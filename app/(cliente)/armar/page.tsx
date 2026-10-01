import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BoxBuilder } from "@/components/cliente/BoxBuilder";
import { fetchCajas, fetchProductos, fetchTematicas, fetchZonasReparto } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Armar mi caja — Memento" };

export default async function ArmarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/armar");

  const [cajas, tematicas, productos, zonas, perfil] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchProductos(),
    fetchZonasReparto(),
    supabase.from("perfiles").select("telefono").eq("id", user.id).single(),
  ]);

  return (
    <BoxBuilder
      cajas={cajas}
      tematicas={tematicas}
      productos={productos}
      zonas={zonas}
      telefonoInicial={perfil.data?.telefono ?? ""}
    />
  );
}
