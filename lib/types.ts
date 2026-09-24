export type CategoriaProducto = "snack" | "dulce" | "bebida" | "otro";
export type TipoPedido = "unico" | "suscripcion";
export type MetodoPago = "transferencia" | "efectivo";
export type EstadoPedido =
  | "armado"
  | "confirmado"
  | "en_preparacion"
  | "en_camino"
  | "entregado"
  | "cancelado";

export interface Caja {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  capacidad: number;
  imagen: string;
}

export interface Tematica {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: CategoriaProducto;
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

export interface ZonaReparto {
  id: string;
  nombre: string;
  costoEnvio: number;
  disponible: boolean;
}

export type EstadoSuscripcion = "activa" | "pausada" | "cancelada";

export interface Suscripcion {
  id: string;
  cajaId: string;
  cajaNombre: string;
  cajaPrecio: number;
  frecuenciaDias: number;
  proximaEntrega: string | null;
  estado: EstadoSuscripcion;
  tematicas: string[];
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

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  "armado",
  "confirmado",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
];

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
