import { createClient } from "@/lib/supabase/server";
import { mapearCaja, mapearCotizaciones, mapearProducto, mapearTematica, SELECT_TEMATICA } from "@/lib/mapeos";
import { ESTADOS_PEDIDO } from "@/lib/types";
import { claveDia, diaDeSemana, etiquetaCorta, inicioDelDia, sumarDias } from "@/lib/fechas";
import type { PedidoAdminRow } from "@/components/admin/PedidosTable";
import type {
  Caja,
  CategoriaProducto,
  Configuracion,
  Cotizacion,
  EstadoPedido,
  FrecuenciaSuscripcion,
  MovimientoStock,
  Producto,
  Proveedor,
  Tematica,
  TipoMovimientoStock,
} from "@/lib/types";

export async function fetchCajas(soloActivas = true): Promise<Caja[]> {
  const supabase = await createClient();
  let query = supabase.from("cajas").select("*").order("capacidad").order("nombre");
  if (soloActivas) query = query.eq("activa", true);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((c) => mapearCaja(c));
}

/** Contenido y precio de cada caja activa con cada temática activa. */
export async function fetchCotizaciones(): Promise<Cotizacion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cotizar_cajas");
  if (error) throw error;
  return mapearCotizaciones(data);
}

export async function fetchConfiguracion(): Promise<Configuracion> {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracion").select("*").eq("id", 1).maybeSingle();

  return {
    costoEnvio: Number(data?.costo_envio ?? 0),
    cbu: data?.cbu ?? "",
    alias: data?.alias ?? "",
    titularCuenta: data?.titular_cuenta ?? "",
    banco: data?.banco ?? "",
    direccionLocal: data?.direccion_local ?? "",
    horarioRetiro: data?.horario_retiro ?? "",
  };
}

export async function fetchCategorias(soloActivas = true): Promise<CategoriaProducto[]> {
  const supabase = await createClient();
  let query = supabase.from("categorias_producto").select("*").order("orden").order("nombre");
  if (soloActivas) query = query.eq("activa", true);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    icono: c.icono ?? "",
    orden: c.orden,
    activa: c.activa,
  }));
}

export async function fetchTematicas(soloActivas = true): Promise<Tematica[]> {
  const supabase = await createClient();
  // La Personalizada va al final.
  let query = supabase.from("tematicas").select(SELECT_TEMATICA).order("personalizada").order("nombre");
  if (soloActivas) query = query.eq("activa", true);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((t) => mapearTematica(t));
}

export async function fetchFrecuenciasSuscripcion(soloActivas = true): Promise<FrecuenciaSuscripcion[]> {
  const supabase = await createClient();
  let query = supabase.from("frecuencias_suscripcion").select("*").order("orden");
  if (soloActivas) query = query.eq("activa", true);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((f) => ({
    id: f.id,
    dias: f.dias,
    etiqueta: f.etiqueta,
    descuentoPorcentaje: Number(f.descuento_porcentaje ?? 0),
    activa: f.activa,
    orden: f.orden,
  }));
}

export async function fetchProductos(soloActivos = true): Promise<Producto[]> {
  const supabase = await createClient();
  let query = supabase.from("productos").select("*, categorias_producto(nombre)").order("nombre");
  if (soloActivos) query = query.eq("activo", true);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((p) => mapearProducto(p));
}

/** Pedidos para el panel (todos, o uno solo si se pasa el id). */
export async function fetchPedidosAdmin(id?: string): Promise<PedidoAdminRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pedidos")
    .select(
      "id, total, costo_envio, estado, metodo_pago, tipo, personalizada, tipo_entrega, direccion_entrega, comentario_entrega, comprobante_url, creado_en, cajas(nombre), tematicas(nombre), pedido_items(producto_id, cantidad, precio_unitario, productos(nombre)), perfiles!pedidos_usuario_id_fkey(nombre, apellido, telefono, numero_cliente)"
    )
    .order("creado_en", { ascending: false });
  if (id) query = query.eq("id", id);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const p = row as unknown as {
      id: string;
      total: number;
      costo_envio: number;
      estado: EstadoPedido;
      metodo_pago: PedidoAdminRow["metodoPago"];
      tipo: PedidoAdminRow["tipo"];
      personalizada: boolean | null;
      tipo_entrega: PedidoAdminRow["tipoEntrega"] | null;
      direccion_entrega: string | null;
      comentario_entrega: string | null;
      comprobante_url: string | null;
      creado_en: string;
      cajas: { nombre: string } | null;
      tematicas: { nombre: string } | null;
      pedido_items: {
        producto_id: string;
        cantidad: number;
        precio_unitario: number;
        productos: { nombre: string } | null;
      }[];
      perfiles: { nombre: string; apellido: string | null; telefono: string | null; numero_cliente: number | null } | null;
    };

    return {
      id: p.id,
      total: Number(p.total),
      costoEnvio: Number(p.costo_envio ?? 0),
      estado: p.estado,
      metodoPago: p.metodo_pago,
      tipo: p.tipo,
      personalizada: !!p.personalizada,
      numeroCliente: p.perfiles?.numero_cliente ?? null,
      cliente: [p.perfiles?.nombre, p.perfiles?.apellido].filter(Boolean).join(" ") || "—",
      telefono: p.perfiles?.telefono ?? null,
      cajaNombre: p.cajas?.nombre ?? "—",
      tematicaNombre: p.tematicas?.nombre ?? "",
      tipoEntrega: p.tipo_entrega ?? "envio",
      direccion: p.direccion_entrega ?? "",
      comentario: p.comentario_entrega ?? "",
      comprobanteUrl: p.comprobante_url,
      creadoEn: p.creado_en,
      items: (p.pedido_items ?? []).map((it) => ({
        productoId: it.producto_id,
        nombre: it.productos?.nombre ?? "Producto",
        cantidad: it.cantidad,
        precioUnitario: Number(it.precio_unitario),
      })),
    };
  });
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
  pedidosPorDespachar: number;
  ingresosHoy: number;
  ingresosSemana: number;
  pedidosPorEstado: { estado: EstadoPedido; cantidad: number }[];
  tematicaTop: { nombre: string; cantidad: number } | null;
  pedidosEnCurso: DashboardPedidoEnCurso[];
  stockBajo: number;
  stockAgotado: number;
  suscripcionesActivas: number;
  suscripcionesPorRenovar: number;
  suscripcionesAdeudadas: number;
  serieDiaria: DashboardPuntoDia[];
  metodoPago: { transferencia: number; efectivo: number };
  arrepentimientosPendientes: number;
  huboError: boolean;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const supabase = await createClient();

  const claveHoy = claveDia(new Date());
  const hoyInicio = inicioDelDia(claveHoy);
  const semanaInicio = inicioDelDia(sumarDias(claveHoy, -diaDeSemana(claveHoy)));
  const treintaDiasAtras = inicioDelDia(sumarDias(claveHoy, -30));
  const claveEn7Dias = sumarDias(claveHoy, 7);

  const [pedidosRecientes, pedidosEnCursoRaw, productosRaw, suscripcionesRaw, arrepentimientosRaw] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, total, estado, metodo_pago, creado_en, tematicas(nombre)")
      .gte("creado_en", treintaDiasAtras.toISOString()),
    supabase
      .from("pedidos")
      .select("id, estado, cajas(nombre), tematicas(nombre), perfiles!pedidos_usuario_id_fkey(nombre, apellido)")
      .in("estado", ["confirmado", "en_camino"])
      .order("creado_en", { ascending: true })
      .limit(6),
    supabase.from("productos").select("stock_actual, stock_minimo").eq("activo", true),
    supabase.from("suscripciones").select("proxima_entrega, pagado_hasta").eq("estado", "activa"),
    supabase
      .from("solicitudes_arrepentimiento")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),
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
  const pedidosPorDespachar = pedidos.filter((p) => p.estado === "confirmado").length;

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
  const serieDiaria: DashboardPuntoDia[] = Array.from({ length: DIAS_SERIE }, (_, i) => {
    const clave = sumarDias(claveHoy, -(DIAS_SERIE - 1 - i));
    return { fecha: clave, etiqueta: etiquetaCorta(clave), monto: 0, cantidad: 0 };
  });
  const indicePorFecha = new Map(serieDiaria.map((p, i) => [p.fecha, i]));
  pedidos.forEach((p) => {
    if (p.estado === "cancelado") return;
    const idx = indicePorFecha.get(claveDia(new Date(p.creado_en)));
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
    (s) => s.proxima_entrega && s.proxima_entrega.slice(0, 10) <= claveEn7Dias
  ).length;
  const suscripcionesAdeudadas = suscripcionesData.filter(
    (s) => s.pagado_hasta && s.pagado_hasta.slice(0, 10) < claveHoy
  ).length;

  return {
    pedidosHoy,
    pedidosPorDespachar,
    ingresosHoy,
    ingresosSemana,
    pedidosPorEstado,
    tematicaTop,
    pedidosEnCurso,
    stockBajo,
    stockAgotado,
    suscripcionesActivas,
    suscripcionesPorRenovar,
    suscripcionesAdeudadas,
    serieDiaria,
    metodoPago,
    arrepentimientosPendientes: arrepentimientosRaw.count ?? 0,
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
