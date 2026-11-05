import { SuscripcionesTable, type SuscripcionAdminRow } from "@/components/admin/SuscripcionesTable";
import { createClient } from "@/lib/supabase/server";
import { mapearSuscripcion, SELECT_SUSCRIPCION } from "@/lib/mapeos";
import { claveDia } from "@/lib/fechas";
import { estadoDeuda } from "@/lib/types";

export default async function AdminSuscripcionesPage() {
  const supabase = await createClient();
  const hoy = claveDia(new Date());

  const { data, error } = await supabase
    .from("suscripciones")
    .select(
      `${SELECT_SUSCRIPCION}, usuario_id, direccion_entrega, comentario_entrega, perfiles(nombre, apellido, telefono, numero_cliente), pedidos!pedidos_suscripcion_id_fkey(creado_en, estado)`
    )
    .order("creado_en", { ascending: false });

  if (error) console.error("Error al cargar suscripciones:", error);

  const suscripciones: SuscripcionAdminRow[] = (data ?? []).map((row) => {
    const base = mapearSuscripcion(row as unknown as Record<string, unknown>);
    const s = row as unknown as {
      usuario_id: string;
      direccion_entrega: string | null;
      comentario_entrega: string | null;
      perfiles: { nombre: string; apellido: string | null; telefono: string | null; numero_cliente: number | null } | null;
      pedidos: { creado_en: string; estado: string }[] | null;
    };

    // ¿Se mandó alguna caja después de que venció el pago?
    const deuda = estadoDeuda(base, hoy);
    const ultimoEnvioAdeudando =
      deuda.adeuda && base.pagadoHasta
        ? ((s.pedidos ?? [])
            .filter((p) => p.estado !== "cancelado" && claveDia(new Date(p.creado_en)) > base.pagadoHasta!.slice(0, 10))
            .map((p) => p.creado_en)
            .sort()
            .at(-1) ?? null)
        : null;

    return {
      ...base,
      clienteId: s.usuario_id,
      cliente: [s.perfiles?.nombre, s.perfiles?.apellido].filter(Boolean).join(" ") || "—",
      numeroCliente: s.perfiles?.numero_cliente ?? null,
      telefono: s.perfiles?.telefono ?? null,
      direccion: s.direccion_entrega,
      comentario: s.comentario_entrega,
      ultimoEnvioAdeudando,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Suscripciones</h1>
      <p className="mt-1 text-sm text-muted">
        &quot;Generar pedido&quot; sortea una temática y crea el pedido de esa entrega. En &quot;Historial de pagos&quot;
        aprobás los comprobantes que suben los clientes o registrás pagos en efectivo.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">No se pudieron cargar las suscripciones.</p>}

      <SuscripcionesTable suscripcionesIniciales={suscripciones} hoy={hoy} />
    </div>
  );
}
