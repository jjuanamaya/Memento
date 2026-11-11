import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuscripcionForm } from "@/components/cliente/SuscripcionForm";
import {
  fetchCajas,
  fetchConfiguracion,
  fetchCotizaciones,
  fetchFrecuenciasSuscripcion,
  fetchProductos,
  fetchTematicas,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Suscribirme — Memento" };

export default async function SuscribirsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/suscribirse");

  const [cajas, tematicas, cotizaciones, productos, frecuencias, config, perfil] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchCotizaciones(),
    fetchProductos(),
    fetchFrecuenciasSuscripcion(),
    fetchConfiguracion(),
    supabase.from("perfiles").select("telefono").eq("id", user.id).single(),
  ]);

  return (
    <SuscripcionForm
      cajas={cajas}
      tematicas={tematicas}
      cotizaciones={cotizaciones}
      productos={productos}
      frecuencias={frecuencias}
      config={config}
      telefonoInicial={perfil.data?.telefono ?? ""}
    />
  );
}
