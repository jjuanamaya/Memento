import { fetchMovimientosStock } from "@/lib/supabase/queries";
import { StockTabs } from "@/components/admin/stock/StockTabs";
import { MovimientosTable } from "@/components/admin/stock/MovimientosTable";

export default async function AdminMovimientosStockPage() {
  const movimientos = await fetchMovimientosStock();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Stock</h1>
      <StockTabs />
      <p className="text-sm text-muted">Historial de entradas y salidas — datos reales desde Supabase.</p>
      <MovimientosTable movimientos={movimientos} />
    </div>
  );
}
