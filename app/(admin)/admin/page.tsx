import Link from "next/link";
import { fetchDashboard } from "@/lib/supabase/queries";
import { ETIQUETA_ESTADO } from "@/lib/types";
import { TrendChart } from "@/components/admin/dashboard/TrendChart";
import { MetodoPagoBar } from "@/components/admin/dashboard/MetodoPagoBar";
import { CHART_COLORS } from "@/lib/chartColors";

function formatoMoneda(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

export default async function AdminDashboardPage() {
  const data = await fetchDashboard();
  const maxEstado = Math.max(1, ...data.pedidosPorEstado.map((e) => e.cantidad));
  const alertasStock = data.stockBajo + data.stockAgotado;

  const serieIngresos = data.serieDiaria.map((p) => ({ fecha: p.fecha, etiqueta: p.etiqueta, valor: p.monto }));
  const seriePedidos = data.serieDiaria.map((p) => ({ fecha: p.fecha, etiqueta: p.etiqueta, valor: p.cantidad }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Datos reales desde Supabase — el estado del negocio, de un vistazo.</p>

      {data.huboError && (
        <p className="mt-4 text-sm text-red-400">
          Algunos datos no se pudieron cargar. Probá recargar la página en un momento.
        </p>
      )}

      {/* Lo que necesita atención hoy */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Pedidos nuevos hoy</p>
          <p className="mt-2 text-2xl font-semibold">{data.pedidosHoy}</p>
          <p className="mt-1 text-xs text-muted">{data.pedidosArmados} sin confirmar (últimos 30 días)</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Ingresos de hoy</p>
          <p className="mt-2 text-2xl font-semibold">{formatoMoneda(data.ingresosHoy)}</p>
          <p className="mt-1 text-xs text-muted">Esta semana: {formatoMoneda(data.ingresosSemana)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Alertas de stock</p>
          <p className={`mt-2 text-2xl font-semibold ${alertasStock > 0 ? "text-brand" : ""}`}>{alertasStock}</p>
          <p className="mt-1 text-xs text-muted">
            {data.stockAgotado} agotados · {data.stockBajo} por agotarse
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Más pedida (30 días)</p>
          <p className="mt-2 truncate text-2xl font-semibold">{data.tematicaTop?.nombre ?? "—"}</p>
          <p className="mt-1 text-xs text-muted">
            {data.tematicaTop ? `${data.tematicaTop.cantidad} pedidos` : "Todavía no hay datos"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <p className="text-sm font-medium">Pedidos en curso</p>
        <p className="mt-1 text-xs text-muted">Confirmados, en preparación o en camino — los que necesitan atención ahora.</p>

        {data.pedidosEnCurso.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No hay ningún pedido en curso en este momento.</p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-border">
            {data.pedidosEnCurso.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{p.cliente}</p>
                  <p className="text-xs text-muted">
                    {p.cajaNombre} · {p.tematicaNombre}
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-brand/15 px-3 py-1 text-xs font-medium text-brand">
                  {ETIQUETA_ESTADO[p.estado]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tendencias */}
      <div className="mt-8">
        <p className="text-sm font-semibold">Tendencia — últimos 14 días</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium">Ingresos por día</p>
          <div className="mt-4">
            <TrendChart
              data={serieIngresos}
              variant="area"
              color={CHART_COLORS.ingresos}
              formato="moneda"
              mensajeVacio="Todavía no hay pedidos en los últimos 14 días para mostrar una tendencia."
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium">Pedidos por día</p>
          <div className="mt-4">
            <TrendChart
              data={seriePedidos}
              variant="bar"
              color={CHART_COLORS.ingresos}
              formato="pedidos"
              mensajeVacio="Todavía no hay pedidos en los últimos 14 días para mostrar una tendencia."
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium">Pedidos por estado (últimos 30 días)</p>
          <div className="mt-4 flex flex-col gap-3">
            {data.pedidosPorEstado.map((e) => (
              <div key={e.estado} className="flex items-center gap-3">
                <span className="w-28 flex-shrink-0 text-xs text-muted">{ETIQUETA_ESTADO[e.estado]}</span>
                <div className="h-2 flex-grow overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(4, Math.round((e.cantidad / maxEstado) * 100))}%` }}
                  />
                </div>
                <span className="w-6 flex-shrink-0 text-right text-xs font-semibold">{e.cantidad}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium">Método de pago (últimos 30 días)</p>
          <div className="mt-5">
            <MetodoPagoBar transferencia={data.metodoPago.transferencia} efectivo={data.metodoPago.efectivo} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-medium">Suscripciones</p>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="text-xl font-semibold">{data.suscripcionesActivas}</p>
              <p className="text-xs text-muted">activas</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-brand">{data.suscripcionesPorRenovar}</p>
              <p className="text-xs text-muted">renuevan en 7 días</p>
            </div>
          </div>
          <Link href="/admin/suscripciones" className="mt-4 inline-block text-xs text-brand hover:opacity-80">
            Ver suscripciones →
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-medium">Accesos rápidos</p>
          <div className="mt-3 flex flex-col gap-2 text-xs">
            <Link href="/admin/pedidos" className="text-brand hover:opacity-80">
              Ver todos los pedidos →
            </Link>
            <Link href="/admin/stock" className="text-brand hover:opacity-80">
              Gestionar stock →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
