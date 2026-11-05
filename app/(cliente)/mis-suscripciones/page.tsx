import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuscripcionesList } from "@/components/cliente/SuscripcionesList";
import { createClient } from "@/lib/supabase/server";
import { fetchConfiguracion } from "@/lib/supabase/queries";
import { mapearSuscripcion, SELECT_SUSCRIPCION } from "@/lib/mapeos";
import { claveDia } from "@/lib/fechas";

export const metadata: Metadata = { title: "Mis suscripciones — Memento" };

export default async function MisSuscripcionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/mis-suscripciones");

  const [{ data, error }, config] = await Promise.all([
    supabase
      .from("suscripciones")
      .select(SELECT_SUSCRIPCION)
      .eq("usuario_id", user.id)
      .order("creado_en", { ascending: false }),
    fetchConfiguracion(),
  ]);

  if (error) console.error("Error al cargar suscripciones:", error);

  const suscripciones = (data ?? []).map((row) => mapearSuscripcion(row as unknown as Record<string, unknown>));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="animate-fade-in-up text-2xl font-semibold">Mis suscripciones</h1>
      <p className="animate-fade-in-up mt-1 text-sm text-muted [animation-delay:60ms]">
        Cada entrega es una sorpresa entre las temáticas que elegiste.
      </p>
      <SuscripcionesList suscripcionesIniciales={suscripciones} config={config} hoy={claveDia(new Date())} />
    </div>
  );
}
