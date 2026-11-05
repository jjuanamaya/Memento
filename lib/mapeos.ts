import type {
  Caja,
  Cotizacion,
  EstadoCotizacion,
  EstadoPagoSuscripcion,
  EstadoSuscripcion,
  MetodoPago,
  PagoSuscripcion,
  Producto,
  Suscripcion,
  Tematica,
  TipoEntrega,
} from "@/lib/types";

// Mapeos de filas de Supabase a los tipos de la app. Viven acá (y no en
// lib/supabase/queries.ts) porque también los usan componentes del cliente.

/** Convierte una fila de "productos" (con categorias_producto(nombre)) al tipo Producto. */
export function mapearProducto(p: Record<string, unknown>): Producto {
  const categoria = p.categorias_producto as { nombre: string } | null | undefined;
  return {
    id: p.id as string,
    nombre: p.nombre as string,
    descripcion: (p.descripcion as string | null) ?? "",
    precio: Number(p.precio),
    costo: Number(p.costo ?? 0),
    categoriaId: (p.categoria_id as string | null) ?? null,
    categoriaNombre: categoria?.nombre ?? "Sin categoría",
    proveedorId: (p.proveedor_id as string | null) ?? null,
    imagen: (p.imagen_url as string | null) ?? "",
    stockActual: p.stock_actual as number,
    stockMinimo: p.stock_minimo as number,
    activo: p.activo as boolean,
  };
}

export function mapearCaja(c: Record<string, unknown>): Caja {
  return {
    id: c.id as string,
    nombre: c.nombre as string,
    descripcion: (c.descripcion as string | null) ?? "",
    precio: Number(c.precio),
    capacidad: (c.capacidad as number | null) ?? 0,
    imagen: (c.imagen_url as string | null) ?? "",
    activa: c.activa as boolean,
    gananciaPorcentaje: Number(c.ganancia_porcentaje ?? 0),
  };
}

/** Columnas de "tematicas" (con sus productos) que espera mapearTematica. */
export const SELECT_TEMATICA = "*, tematica_productos(producto_id)";

export function mapearTematica(t: Record<string, unknown>): Tematica {
  const productos = (t.tematica_productos ?? []) as { producto_id: string }[];
  return {
    id: t.id as string,
    nombre: t.nombre as string,
    descripcion: (t.descripcion as string | null) ?? "",
    imagen: (t.imagen_url as string | null) ?? "",
    activa: t.activa as boolean,
    personalizada: !!t.personalizada,
    productoIds: productos.map((p) => p.producto_id),
  };
}

/** Convierte la respuesta de la función cotizar_cajas(). */
export function mapearCotizaciones(datos: unknown): Cotizacion[] {
  return ((datos ?? []) as Record<string, unknown>[]).map((c) => ({
    cajaId: c.caja_id as string,
    tematicaId: c.tematica_id as string,
    items: ((c.items ?? []) as { producto_id: string; nombre: string; cantidad: number }[]).map((it) => ({
      productoId: it.producto_id,
      nombre: it.nombre,
      cantidad: it.cantidad,
    })),
    unidades: Number(c.unidades ?? 0),
    precio: Number(c.precio ?? 0),
    estado: c.estado as EstadoCotizacion,
  }));
}

/** Columnas de "suscripciones" que espera mapearSuscripcion. */
export const SELECT_SUSCRIPCION =
  "id, frecuencia_dias, precio, costo_envio, proxima_entrega, pagado_hasta, estado, motivo_pausa, pausada_en, metodo_pago, tipo_entrega, cajas(nombre), suscripcion_tematicas(tematicas(nombre)), pagos_suscripcion(id, monto, metodo_pago, comprobante_url, estado, creado_en)";

export function mapearPagoSuscripcion(p: Record<string, unknown>, suscripcionId: string): PagoSuscripcion {
  return {
    id: p.id as string,
    suscripcionId,
    monto: Number(p.monto),
    metodoPago: p.metodo_pago as MetodoPago,
    comprobanteUrl: (p.comprobante_url as string | null) ?? null,
    estado: p.estado as EstadoPagoSuscripcion,
    creadoEn: p.creado_en as string,
  };
}

/** Convierte una fila de "suscripciones" (con SELECT_SUSCRIPCION) al tipo Suscripcion. */
export function mapearSuscripcion(row: Record<string, unknown>): Suscripcion {
  const s = row as {
    id: string;
    frecuencia_dias: number;
    precio: number | null;
    costo_envio: number | null;
    proxima_entrega: string | null;
    pagado_hasta: string | null;
    estado: EstadoSuscripcion;
    motivo_pausa: string | null;
    pausada_en: string | null;
    metodo_pago: MetodoPago;
    tipo_entrega: TipoEntrega | null;
    cajas: { nombre: string } | null;
    suscripcion_tematicas: { tematicas: { nombre: string } | null }[] | null;
    pagos_suscripcion: Record<string, unknown>[] | null;
  };

  return {
    id: s.id,
    cajaNombre: s.cajas?.nombre ?? "Caja",
    precio: Number(s.precio ?? 0),
    costoEnvio: Number(s.costo_envio ?? 0),
    frecuenciaDias: s.frecuencia_dias,
    proximaEntrega: s.proxima_entrega,
    pagadoHasta: s.pagado_hasta,
    estado: s.estado,
    motivoPausa: s.motivo_pausa,
    pausadaEn: s.pausada_en,
    metodoPago: s.metodo_pago,
    tipoEntrega: s.tipo_entrega ?? "envio",
    tematicas: (s.suscripcion_tematicas ?? []).map((st) => st.tematicas?.nombre).filter(Boolean) as string[],
    pagos: (s.pagos_suscripcion ?? [])
      .map((p) => mapearPagoSuscripcion(p, s.id))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
  };
}
