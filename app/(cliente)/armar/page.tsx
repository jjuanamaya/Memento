import type { Metadata } from "next";
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

function texto(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** "id:2,id:1" → { id: 2, id: 1 } (los productos elegidos en la Personalizada). */
function leerItems(valor: string): Record<string, number> {
  const cantidades: Record<string, number> = {};
  for (const par of valor.split(",")) {
    const [id, cantidad] = par.split(":");
    const numero = Number(cantidad);
    if (id && Number.isInteger(numero) && numero > 0) cantidades[id] = numero;
  }
  return cantidades;
}

// Se puede armar la caja sin sesión: el login se pide recién para confirmar.
// Al volver del login, /armar?caja=…&tematica=…&items=… retoma lo elegido.
export default async function ArmarPage({ searchParams }: PageProps<"/armar">) {
  const parametros = await searchParams;
  const cajaId = texto(parametros.caja);
  const tematicaId = texto(parametros.tematica);
  const seleccionInicial =
    cajaId && tematicaId ? { cajaId, tematicaId, cantidades: leerItems(texto(parametros.items)) } : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [cajas, tematicas, cotizaciones, productos, categorias, config, perfil] = await Promise.all([
    fetchCajas(),
    fetchTematicas(),
    fetchCotizaciones(),
    fetchProductos(),
    fetchCategorias(),
    fetchConfiguracion(),
    user ? supabase.from("perfiles").select("telefono").eq("id", user.id).single() : null,
  ]);

  return (
    <BoxBuilder
      cajas={cajas}
      tematicas={tematicas}
      cotizaciones={cotizaciones}
      productos={productos}
      categorias={categorias}
      config={config}
      logueado={!!user}
      telefonoInicial={perfil?.data?.telefono ?? ""}
      seleccionInicial={seleccionInicial}
    />
  );
}
