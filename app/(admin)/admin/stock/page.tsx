import { fetchProductos, fetchProveedores } from "@/lib/supabase/queries";
import { StockTabs } from "@/components/admin/stock/StockTabs";
import { ProductosTable } from "@/components/admin/stock/ProductosTable";

export default async function AdminStockPage() {
  const [productos, proveedores] = await Promise.all([fetchProductos(false), fetchProveedores(true)]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Stock</h1>
      <StockTabs />
      <ProductosTable productosIniciales={productos} proveedores={proveedores} />
    </div>
  );
}
