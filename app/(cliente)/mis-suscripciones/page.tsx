import { redirect } from "next/navigation";
import { SuscripcionesList } from "@/components/cliente/SuscripcionesList";
import { createClient } from "@/lib/supabase/server";
import type { EstadoSuscripcion } from "@/lib/types";

export default async function MisSuscripcionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("suscripciones")
    .select("id, frecuencia_dias, proxima_entrega, estado, cajas(nombre, precio), suscripcion_tematicas(tematicas(nombre))")
    .eq("usuario_id", user.id)
    .order("creado_en", { ascending: false });

  const suscripciones = (data ?? []).map((row) => {
    const s = row as unknown as {
      id: string;
      frecuencia_dias: number;
      proxima_entrega: string | null;
      estado: EstadoSuscripcion;
      cajas: { nombre: string; precio: number } | null;
      suscripcion_tematicas: { tematicas: { nombre: string } | null }[];
    };

    return {
      id: s.id,
      cajaId: "",
      cajaNombre: s.cajas?.nombre ?? "Caja",
      cajaPrecio: Number(s.cajas?.precio ?? 0),
      frecuenciaDias: s.frecuencia_dias,
      proximaEntrega: s.proxima_entrega,
      estado: s.estado,
      tematicas: s.suscripcion_tematicas.map((st) => st.tematicas?.nombre).filter(Boolean) as string[],
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="animate-fade-in-up text-2xl font-semibold">Mis suscripciones</h1>
      <p className="animate-fade-in-up mt-1 text-sm text-muted [animation-delay:60ms]">
        Cada entrega es una sorpresa entre las temáticas que elegiste.
      </p>
      <SuscripcionesList suscripcionesIniciales={suscripciones} />
    </div>
  );
}
