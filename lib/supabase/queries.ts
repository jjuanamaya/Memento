import { createClient } from "@/lib/supabase/server";
import { ESTADOS_PEDIDO } from "@/lib/types";
import type {
  Caja,
  EstadoPedido,
  MovimientoStock,
  Producto,
  Proveedor,
  Repartidor,
  Tematica,
  TipoMovimientoStock,
  ZonaReparto,
} from "@/lib/types";

export async function fetchCajas(): Promise<Caja[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cajas")
    .select("*")
    .eq("activa", true)
    .order("precio");

  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion ?? "",
    precio: Number(c.precio),
    capacidad: c.capacidad ?? 0,
    imagen: c.imagen_url ?? "",
  }));
}

export async function fetchTematicas(): Promise<Tematica[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tematicas")
    .select("*")
    .eq("activa", true)
    .order("nombre");

  if (error) throw error;

  return (data ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion ?? "",
    imagen: t.imagen_url ?? "",
  }));
}

export async function fetchProductos(soloActivos = true): Promise<Producto[]> {
  const supabase = await createClient();
  let query = supabase.from("productos").select("*").order("categoria");
  if (soloActivos) query = query.eq("activo", true);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    precio: Number(p.precio),
    categoria: p.categoria,
    imagen: p.imagen_url ?? "",
    stockActual: p.stock_actual,
    stockMinimo: p.stock_minimo,
    activo: p.activo,
  }));
}

export async function fetchZonasReparto(): Promise<ZonaReparto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zonas_reparto")
    .select("*")
    .eq("disponible", true)
    .order("costo_envio");

  if (error) throw error;

  return (data ?? []).map((z) => ({
    id: z.id,
    nombre: z.nombre,
    costoEnvio: Number(z.costo_envio),
    disponible: z.disponible,
  }));
}

export async function fetchRepartidores(): Promise<Repartidor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, apellido")
    .eq("rol", "repartidor");

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: [p.nombre, p.apellido].filter(Boolean).join(" ") || "Sin nombre",
  }));
}

export interface DashboardPedidoEnCurso {
  id: string;
  cliente: string;
  cajaNombre: string;
  tematicaNombre: string;
  estado: EstadoPedido;
}

export interface DashboardPuntoDia {
  fecha: string;
  etiqueta: string;
  monto: number;
  cantidad: number;
}

export interface DashboardData {
  pedidosHoy: number;
  pedidosArmados: number;
  ingresosHoy: number;
  ingresosSemana: number;
  pedidosPorEstado: { estado: EstadoPedido; cantidad: number }[];
  tematicaTop: { nombre: string; cantidad: number } | null;
  pedidosEnCurso: DashboardPedidoEnCurso[];
  stockBajo: number;
  stockAgotado: number;
  suscripcionesActivas: number;
  suscripcionesPorRenovar: number;
  serieDiaria: DashboardPuntoDia[];
  metodoPago: { transferencia: number; efectivo: number };
  huboError: boolean;
}

function claveFechaLocal(fecha: Date) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const supabase = await createClient();

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const semanaInicio = new Date(hoyInicio);
  semanaInicio.setDate(semanaInicio.getDate() - semanaInicio.getDay());

  const treintaDiasAtras = new Date(hoyInicio);
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

  const en7Dias = new Date(hoyInicio);
  en7Dias.setDate(en7Dias.getDate() + 7);

  const [pedidosRecientes, pedidosEnCursoRaw, productosRaw, suscripcionesRaw] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, total, estado, metodo_pago, creado_en, tematicas(nombre)")
      .gte("creado_en", treintaDiasAtras.toISOString()),
    supabase
      .from("pedidos")
      .select("id, estado, cajas(nombre), tematicas(nombre), perfiles!pedidos_usuario_id_fkey(nombre, apellido)")
      .in("estado", ["confirmado", "en_preparacion", "en_camino"])
      .order("creado_en", { ascending: true })
      .limit(6),
    supabase.from("productos").select("stock_actual, stock_minimo").eq("activo", true),
    supabase.from("suscripciones").select("proxima_entrega").eq("estado", "activa"),
  ]);

  const huboError = !!(pedidosRecientes.error || pedidosEnCursoRaw.error || productosRaw.error || suscripcionesRaw.error);

  const pedidos = (pedidosRecientes.data ?? []) as unknown as {
    id: string;
    total: number;
    estado: EstadoPedido;
    metodo_pago: "transferencia" | "efectivo";
    creado_en: string;
    tematicas: { nombre: string } | null;
  }[];

  const pedidosHoy = pedidos.filter((p) => new Date(p.creado_en) >= hoyInicio).length;
  const pedidosArmados = pedidos.filter((p) => p.estado === "armado").length;

  const sumarDesde = (desde: Date) =>
    pedidos
      .filter((p) => p.estado !== "cancelado" && new Date(p.creado_en) >= desde)
      .reduce((acc, p) => acc + Number(p.total), 0);

  const ingresosHoy = sumarDesde(hoyInicio);
  const ingresosSemana = sumarDesde(semanaInicio);

  const pedidosPorEstado = ESTADOS_PEDIDO.map((estado) => ({
    estado,
    cantidad: pedidos.filter((p) => p.estado === estado).length,
  }));

  const conteoTematicas = new Map<string, number>();
  pedidos.forEach((p) => {
    const nombre = p.tematicas?.nombre;
    if (!nombre) return;
    conteoTematicas.set(nombre, (conteoTematicas.get(nombre) ?? 0) + 1);
  });
  let tematicaTop: { nombre: string; cantidad: number } | null = null;
  conteoTematicas.forEach((cantidad, nombre) => {
    if (!tematicaTop || cantidad > tematicaTop.cantidad) tematicaTop = { nombre, cantidad };
  });

  const DIAS_SERIE = 14;
  const diasEtiqueta = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const serieDiaria: DashboardPuntoDia[] = Array.from({ length: DIAS_SERIE }, (_, i) => {
    const dia = new Date(hoyInicio);
    dia.setDate(dia.getDate() - (DIAS_SERIE - 1 - i));
    return {
      fecha: claveFechaLocal(dia),
      etiqueta: `${diasEtiqueta[dia.getDay()]} ${dia.getDate()}`,
      monto: 0,
      cantidad: 0,
    };
  });
  const indicePorFecha = new Map(serieDiaria.map((p, i) => [p.fecha, i]));
  pedidos.forEach((p) => {
    if (p.estado === "cancelado") return;
    const idx = indicePorFecha.get(claveFechaLocal(new Date(p.creado_en)));
    if (idx === undefined) return;
    serieDiaria[idx].monto += Number(p.total);
    serieDiaria[idx].cantidad += 1;
  });

  const metodoPago = {
    transferencia: pedidos.filter((p) => p.estado !== "cancelado" && p.metodo_pago === "transferencia").length,
    efectivo: pedidos.filter((p) => p.estado !== "cancelado" && p.metodo_pago === "efectivo").length,
  };

  const pedidosEnCurso: DashboardPedidoEnCurso[] = (pedidosEnCursoRaw.data ?? []).map((row) => {
    const p = row as unknown as {
      id: string;
      estado: EstadoPedido;
      cajas: { nombre: string } | null;
      tematicas: { nombre: string } | null;
      perfiles: { nombre: string; apellido: string | null } | null;
    };
    return {
      id: p.id,
      cliente: [p.perfiles?.nombre, p.perfiles?.apellido].filter(Boolean).join(" ") || "—",
      cajaNombre: p.cajas?.nombre ?? "—",
      tematicaNombre: p.tematicas?.nombre ?? "—",
      estado: p.estado,
    };
  });

  const productosData = productosRaw.data ?? [];
  const stockBajo = productosData.filter((p) => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length;
  const stockAgotado = productosData.filter((p) => p.stock_actual === 0).length;

  const suscripcionesData = suscripcionesRaw.data ?? [];
  const suscripcionesActivas = suscripcionesData.length;
  const suscripcionesPorRenovar = suscripcionesData.filter(
    (s) => s.proxima_entrega && new Date(s.proxima_entrega) <= en7Dias
  ).length;

  return {
    pedidosHoy,
    pedidosArmados,
    ingresosHoy,
    ingresosSemana,
    pedidosPorEstado,
    tematicaTop,
    pedidosEnCurso,
    stockBajo,
    stockAgotado,
    suscripcionesActivas,
    suscripcionesPorRenovar,
    serieDiaria,
    metodoPago,
    huboError,
  };
}

export async function fetchProveedores(soloActivos = false): Promise<Proveedor[]> {
  const supabase = await createClient();
  let query = supabase.from("proveedores").select("*").order("nombre");
  if (soloActivos) query = query.eq("activo", true);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    contacto: p.contacto,
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    notas: p.notas,
    activo: p.activo,
  }));
}

export async function fetchMovimientosStock(limite = 100): Promise<MovimientoStock[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(
      "id, producto_id, tipo, cantidad, motivo, proveedor_id, costo_unitario, creado_en, productos(nombre), proveedores(nombre), perfiles(nombre, apellido)"
    )
    .order("creado_en", { ascending: false })
    .limit(limite);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const m = row as unknown as {
      id: string;
      producto_id: string;
      tipo: TipoMovimientoStock;
      cantidad: number;
      motivo: string | null;
      proveedor_id: string | null;
      costo_unitario: number | null;
      creado_en: string;
      productos: { nombre: string } | null;
      proveedores: { nombre: string } | null;
      perfiles: { nombre: string; apellido: string | null } | null;
    };
    return {
      id: m.id,
      productoId: m.producto_id,
      productoNombre: m.productos?.nombre ?? "—",
      tipo: m.tipo,
      cantidad: m.cantidad,
      motivo: m.motivo,
      proveedorId: m.proveedor_id,
      proveedorNombre: m.proveedores?.nombre ?? null,
      costoUnitario: m.costo_unitario === null ? null : Number(m.costo_unitario),
      usuarioNombre: [m.perfiles?.nombre, m.perfiles?.apellido].filter(Boolean).join(" ") || "—",
      creadoEn: m.creado_en,
    };
  });
}

export async function fetchMovimientoStock(id: string): Promise<MovimientoStock | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(
      "id, producto_id, tipo, cantidad, motivo, proveedor_id, costo_unitario, creado_en, productos(nombre), proveedores(nombre), perfiles(nombre, apellido)"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const m = data as unknown as {
    id: string;
    producto_id: string;
    tipo: TipoMovimientoStock;
    cantidad: number;
    motivo: string | null;
    proveedor_id: string | null;
    costo_unitario: number | null;
    creado_en: string;
    productos: { nombre: string } | null;
    proveedores: { nombre: string } | null;
    perfiles: { nombre: string; apellido: string | null } | null;
  };

  return {
    id: m.id,
    productoId: m.producto_id,
    productoNombre: m.productos?.nombre ?? "—",
    tipo: m.tipo,
    cantidad: m.cantidad,
    motivo: m.motivo,
    proveedorId: m.proveedor_id,
    proveedorNombre: m.proveedores?.nombre ?? null,
    costoUnitario: m.costo_unitario === null ? null : Number(m.costo_unitario),
    usuarioNombre: [m.perfiles?.nombre, m.perfiles?.apellido].filter(Boolean).join(" ") || "—",
    creadoEn: m.creado_en,
  };
}
