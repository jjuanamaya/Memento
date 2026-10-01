import { fetchTematicas } from "@/lib/supabase/queries";
import { CatalogoTabs } from "@/components/admin/catalogo/CatalogoTabs";
import { TematicasTable } from "@/components/admin/catalogo/TematicasTable";

export default async function AdminCatalogoTematicasPage() {
  const tematicas = await fetchTematicas(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      <CatalogoTabs />
      <TematicasTable tematicasIniciales={tematicas} />
    </div>
  );
}
