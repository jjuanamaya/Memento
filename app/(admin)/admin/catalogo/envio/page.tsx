import { fetchConfiguracion } from "@/lib/supabase/queries";
import { CatalogoTabs } from "@/components/admin/catalogo/CatalogoTabs";
import { ConfiguracionForm } from "@/components/admin/catalogo/ConfiguracionForm";

export default async function AdminEnvioPage() {
  const config = await fetchConfiguracion();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      <CatalogoTabs />
      <ConfiguracionForm configInicial={config} />
    </div>
  );
}
