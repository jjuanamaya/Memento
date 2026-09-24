import { SuscripcionesTable, type SuscripcionAdminRow } from "@/components/admin/SuscripcionesTable";
import { createClient } from "@/lib/supabase/server";
import type { EstadoSuscripcion } from "@/lib/types";

export default async function AdminSuscripcionesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suscripciones")
    .select(
      "id, frecuencia_dias, proxima_entrega, estado, cajas(nombre), perfiles(nombre, apellido), suscripcion_tematicas(tematicas(nombre))"
    )
    .order("creado_en", { ascending: false });

  const suscripciones: SuscripcionAdminRow[] = (data ?? []).map((row) => {
    const s = row as unknown as {
      id: string;
      frecuencia_dias: number;
      proxima_entrega: string | null;
      estado: EstadoSuscripcion;
      cajas: { nombre: string } | null;
      perfiles: { nombre: string; apellido: string | null } | null;
      suscripcion_tematicas: { tematicas: { nombre: string } | null }[];
    };

    return {
      id: s.id,
      cliente: [s.perfiles?.nombre, s.perfiles?.apellido].filter(Boolean).join(" ") || "—",
      cajaNombre: s.cajas?.nombre ?? "—",
      frecuenciaDias: s.frecuencia_dias,
      proximaEntrega: s.proxima_entrega,
      estado: s.estado,
      tematicas: s.suscripcion_tematicas.map((st) => st.tematicas?.nombre).filter(Boolean) as string[],
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Suscripciones</h1>
      <p className="mt-1 text-sm text-muted">
        Datos reales desde Supabase. &quot;Generar pedido&quot; sortea una temática del pool y crea el pedido de esa entrega.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">No se pudieron cargar las suscripciones.</p>}

      <SuscripcionesTable suscripcionesIniciales={suscripciones} />
    </div>
  );
}
