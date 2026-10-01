import { fetchZonasReparto } from "@/lib/supabase/queries";
import { CatalogoTabs } from "@/components/admin/catalogo/CatalogoTabs";
import { ZonasTable } from "@/components/admin/catalogo/ZonasTable";

export default async function AdminCatalogoZonasPage() {
  const zonas = await fetchZonasReparto(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      <CatalogoTabs />
      <ZonasTable zonasIniciales={zonas} />
    </div>
  );
}
