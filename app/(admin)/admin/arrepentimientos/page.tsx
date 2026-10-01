import { createClient } from "@/lib/supabase/server";
import { ArrepentimientosTable, type SolicitudArrepentimiento } from "@/components/admin/ArrepentimientosTable";

export default async function AdminArrepentimientosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solicitudes_arrepentimiento")
    .select("id, codigo, nombre, email, numero_pedido, detalle, estado, creado_en")
    .order("creado_en", { ascending: false });

  const solicitudes: SolicitudArrepentimiento[] = (data ?? []).map((s) => ({
    id: s.id,
    codigo: s.codigo,
    nombre: s.nombre,
    email: s.email,
    numeroPedido: s.numero_pedido,
    detalle: s.detalle,
    estado: s.estado,
    creadoEn: s.creado_en,
  }));

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Arrepentimientos</h1>
      <p className="mt-1 text-sm text-muted">
        Pedidos de cancelación hechos desde el &quot;Botón de arrepentimiento&quot;. El cliente ya recibió su código
        al enviarlo. Escribile al email para coordinar la cancelación y el reintegro.
      </p>
      {pendientes > 0 && (
        <p className="mt-3 text-sm font-medium text-brand">
          Tenés {pendientes} solicitud{pendientes === 1 ? "" : "es"} pendiente{pendientes === 1 ? "" : "s"}.
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">No se pudieron cargar las solicitudes.</p>}
      <ArrepentimientosTable iniciales={solicitudes} />
    </div>
  );
}
