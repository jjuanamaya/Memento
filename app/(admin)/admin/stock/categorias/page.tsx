import { fetchCategorias, fetchProductos } from "@/lib/supabase/queries";
import { StockTabs } from "@/components/admin/stock/StockTabs";
import { CategoriasTable } from "@/components/admin/stock/CategoriasTable";

export default async function AdminCategoriasPage() {
  const [categorias, productos] = await Promise.all([fetchCategorias(false), fetchProductos(false)]);

  const productosPorCategoria: Record<string, number> = {};
  productos.forEach((p) => {
    if (p.categoriaId) productosPorCategoria[p.categoriaId] = (productosPorCategoria[p.categoriaId] ?? 0) + 1;
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Stock</h1>
      <StockTabs />
      <CategoriasTable categoriasIniciales={categorias} productosPorCategoria={productosPorCategoria} />
    </div>
  );
}
