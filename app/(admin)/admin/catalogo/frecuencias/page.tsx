import { fetchFrecuenciasSuscripcion } from "@/lib/supabase/queries";
import { CatalogoTabs } from "@/components/admin/catalogo/CatalogoTabs";
import { FrecuenciasTable } from "@/components/admin/catalogo/FrecuenciasTable";

export default async function AdminCatalogoFrecuenciasPage() {
  const frecuencias = await fetchFrecuenciasSuscripcion(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      <CatalogoTabs />
      <FrecuenciasTable frecuenciasIniciales={frecuencias} />
    </div>
  );
}
