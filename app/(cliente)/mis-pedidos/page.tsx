import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_ESTADO, type EstadoPedido, type MetodoPago } from "@/lib/types";

const ESTILO_ESTADO: Record<EstadoPedido, string> = {
  armado: "bg-surface text-muted",
  confirmado: "bg-surface text-muted",
  en_preparacion: "bg-brand/15 text-brand",
  en_camino: "bg-brand/15 text-brand",
  entregado: "bg-emerald-500/15 text-emerald-400",
  cancelado: "bg-red-500/15 text-red-400",
};

const ETIQUETA_METODO: Record<MetodoPago, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

export default async function MisPedidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, total, estado, metodo_pago, creado_en, cajas(nombre), tematicas(nombre)")
    .eq("usuario_id", user.id)
    .order("creado_en", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="animate-fade-in-up text-2xl font-semibold">Mis pedidos</h1>
      <p className="animate-fade-in-up mt-1 text-sm text-muted [animation-delay:60ms]">
        El estado de cada box que armaste, en un solo lugar.
      </p>

      {!pedidos || pedidos.length === 0 ? (
        <div className="animate-fade-in-up mt-8 rounded-2xl border border-muted/30 bg-surface p-8 text-center [animation-delay:120ms]">
          <span className="text-3xl">🎁</span>
          <p className="mt-3 font-medium">Todavía no armaste tu primera box.</p>
          <p className="mt-1 text-sm text-muted">Elegí una caja, sumale tu toque y convertila en un regalo.</p>
          <Link
            href="/armar"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
          >
            Armar mi caja
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {pedidos.map((row, i) => {
            const pedido = row as unknown as {
              id: string;
              total: number;
              estado: EstadoPedido;
              metodo_pago: MetodoPago;
              creado_en: string;
              cajas: { nombre: string } | null;
              tematicas: { nombre: string } | null;
            };

            return (
              <div
                key={pedido.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-fade-in-up rounded-xl border border-muted/20 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/30"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {pedido.cajas?.nombre} · {pedido.tematicas?.nombre}
                  </p>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILO_ESTADO[pedido.estado]}`}>
                    {ETIQUETA_ESTADO[pedido.estado]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {new Date(pedido.creado_en).toLocaleDateString("es-AR")} · ${pedido.total} ·{" "}
                  {ETIQUETA_METODO[pedido.metodo_pago]}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
