import { fetchProveedores } from "@/lib/supabase/queries";
import { StockTabs } from "@/components/admin/stock/StockTabs";
import { ProveedoresTable } from "@/components/admin/stock/ProveedoresTable";

export default async function AdminProveedoresPage() {
  const proveedores = await fetchProveedores(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Stock</h1>
      <StockTabs />
      <ProveedoresTable proveedoresIniciales={proveedores} />
    </div>
  );
}
