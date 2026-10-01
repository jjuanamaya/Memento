import { fetchCajas } from "@/lib/supabase/queries";
import { CatalogoTabs } from "@/components/admin/catalogo/CatalogoTabs";
import { CajasTable } from "@/components/admin/catalogo/CajasTable";

export default async function AdminCatalogoCajasPage() {
  const cajas = await fetchCajas(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      <CatalogoTabs />
      <CajasTable cajasIniciales={cajas} />
    </div>
  );
}
