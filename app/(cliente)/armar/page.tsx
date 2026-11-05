import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BoxBuilder } from "@/components/cliente/BoxBuilder";
import {
  fetchCajas,
  fetchCategorias,
  fetchConfiguracion,
  fetchCotizaciones,
  fetchProductos,
  fetchTematicas,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Armar mi caja — Memento" };

export default async function ArmarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/armar");

  const [cajas, tematicas, cotizaciones, productos, categorias, config, perfil] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchCotizaciones(),
    fetchProductos(),
    fetchCategorias(),
    fetchConfiguracion(),
    supabase.from("perfiles").select("telefono").eq("id", user.id).single(),
  ]);

  return (
    <BoxBuilder
      cajas={cajas}
      tematicas={tematicas}
      cotizaciones={cotizaciones}
      productos={productos}
      categorias={categorias}
      config={config}
      telefonoInicial={perfil.data?.telefono ?? ""}
    />
  );
}
