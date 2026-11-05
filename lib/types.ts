export type TipoPedido = "unico" | "suscripcion";
export type MetodoPago = "transferencia" | "efectivo";
export type TipoEntrega = "envio" | "retiro";
// "armado" y "en_preparacion" quedan solo por pedidos viejos: la migración
// de correcciones los pasa a "confirmado" y ya no se usan.
export type EstadoPedido =
  | "armado"
  | "confirmado"
  | "en_preparacion"
  | "en_camino"
  | "entregado"
  | "cancelado";

export interface CategoriaProducto {
  id: string;
  nombre: string;
  icono: string;
  orden: number;
  activa: boolean;
}

/** Una caja es un tamaño: cuántos productos entran. */
export interface Caja {
  id: string;
  nombre: string;
  descripcion: string;
  /** Precio base de la caja: solo se cobra con la temática Personalizada. */
  precio: number;
  capacidad: number;
  imagen: string;
  activa: boolean;
  /** Se suma al costo del contenido en las cajas temáticas. */
  gananciaPorcentaje: number;
}

export type EstadoCotizacion = "disponible" | "sin_stock" | "sin_precio" | "sin_contenido";

/** Qué lleva y cuánto sale una caja llenada con una temática (lo calcula la base). */
export interface Cotizacion {
  cajaId: string;
  tematicaId: string;
  items: { productoId: string; nombre: string; cantidad: number }[];
  unidades: number;
  precio: number;
  estado: EstadoCotizacion;
}

export const MOTIVO_COTIZACION: Record<Exclude<EstadoCotizacion, "disponible">, string> = {
  sin_stock: "Sin stock para este tamaño",
  sin_precio: "Próximamente",
  sin_contenido: "Próximamente",
};

export interface Configuracion {
  costoEnvio: number;
  cbu: string;
  alias: string;
  titularCuenta: string;
  banco: string;
  direccionLocal: string;
  horarioRetiro: string;
}

export interface Tematica {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  activa: boolean;
  /** La temática "Personalizada": el cliente elige cada producto. */
  personalizada: boolean;
  /** Productos con los que se llena la caja (vacío en la personalizada). */
  productoIds: string[];
}

export interface FrecuenciaSuscripcion {
  id: string;
  dias: number;
  etiqueta: string;
  precio: number;
  activa: boolean;
  orden: number;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costo: number;
  categoriaId: string | null;
  categoriaNombre: string;
  proveedorId: string | null;
  imagen: string;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
}

export interface ItemSeleccionado {
  producto: Producto;
  cantidad: number;
}

export interface Pedido {
  id: string;
  cliente: string;
  cajaNombre: string;
  tematicaNombre: string;
  tipo: TipoPedido;
  metodoPago: MetodoPago;
  total: number;
  estado: EstadoPedido;
  creadoEn: string;
}

export type EstadoSuscripcion = "activa" | "pausada" | "cancelada";

export type EstadoPagoSuscripcion = "pendiente" | "aprobado" | "rechazado";

export interface PagoSuscripcion {
  id: string;
  suscripcionId: string;
  monto: number;
  metodoPago: MetodoPago;
  comprobanteUrl: string | null;
  estado: EstadoPagoSuscripcion;
  creadoEn: string;
}

export const ETIQUETA_ESTADO_PAGO: Record<EstadoPagoSuscripcion, string> = {
  pendiente: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export interface Suscripcion {
  id: string;
  cajaNombre: string;
  precio: number;
  costoEnvio: number;
  frecuenciaDias: number;
  proximaEntrega: string | null;
  pagadoHasta: string | null;
  estado: EstadoSuscripcion;
  motivoPausa: string | null;
  pausadaEn: string | null;
  metodoPago: MetodoPago;
  tipoEntrega: TipoEntrega;
  tematicas: string[];
  pagos: PagoSuscripcion[];
}

/**
 * Situación de pago de una suscripción: el pago de cada período vence en
 * `pagadoHasta`. Si ya pasó esa fecha y no hay un pago aprobado, adeuda.
 * Mientras está pausada el tiempo no corre: la deuda se cuenta hasta el día
 * en que se pausó.
 */
export function estadoDeuda(
  s: { pagadoHasta: string | null; estado: EstadoSuscripcion; pausadaEn: string | null },
  hoy: string
): { adeuda: boolean; diasAdeuda: number } {
  if (!s.pagadoHasta || s.estado === "cancelada") return { adeuda: false, diasAdeuda: 0 };
  const referencia = s.estado === "pausada" && s.pausadaEn ? s.pausadaEn.slice(0, 10) : hoy;
  const dias = -diasHasta(s.pagadoHasta, referencia);
  return { adeuda: dias > 0, diasAdeuda: Math.max(dias, 0) };
}

/** Días entre hoy y una fecha "YYYY-MM-DD" (negativo si ya pasó). */
export function diasHasta(fecha: string, hoy: string): number {
  return Math.round(
    (new Date(`${fecha.slice(0, 10)}T12:00:00Z`).getTime() - new Date(`${hoy}T12:00:00Z`).getTime()) / 86_400_000
  );
}

export interface Repartidor {
  id: string;
  nombre: string;
}

export const ESTADOS_SUSCRIPCION: EstadoSuscripcion[] = ["activa", "pausada", "cancelada"];

export const ETIQUETA_ESTADO_SUSCRIPCION: Record<EstadoSuscripcion, string> = {
  activa: "Activa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

/** Los únicos estados que se usan desde las correcciones de noviembre 2026. */
export const ESTADOS_PEDIDO: EstadoPedido[] = ["confirmado", "en_camino", "entregado", "cancelado"];

/** Un pedido entregado o cancelado ya no cambia de estado. */
export const ESTADOS_FINALES: EstadoPedido[] = ["entregado", "cancelado"];

export const ETIQUETA_ENTREGA: Record<TipoEntrega, string> = {
  envio: "Envío a domicilio",
  retiro: "Retiro en el local",
};

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  armado: "Armado",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export type TipoMovimientoStock = "entrada" | "salida";

export const ETIQUETA_TIPO_MOVIMIENTO: Record<TipoMovimientoStock, string> = {
  entrada: "Entrada",
  salida: "Salida",
};

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  activo: boolean;
}

export interface MovimientoStock {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo: string | null;
  proveedorId: string | null;
  proveedorNombre: string | null;
  costoUnitario: number | null;
  usuarioNombre: string;
  creadoEn: string;
}
