-- Memento — Esquema inicial de base de datos (Supabase / Postgres)
-- Borrador de trabajo. Se ajusta a medida que definimos catálogo real,
-- zonas de reparto y reglas de negocio con más detalle.

-- Nota sobre auth: los usuarios de login (clientes y admin) los maneja
-- Supabase Auth (tabla auth.users). Esta tabla "perfiles" extiende esos
-- usuarios con los datos propios del negocio.

create type rol_usuario as enum ('cliente', 'admin', 'repartidor');
create type categoria_producto as enum ('snack', 'dulce', 'bebida', 'otro');
create type tipo_pedido as enum ('unico', 'suscripcion');
create type metodo_pago as enum ('transferencia', 'efectivo');
create type estado_pedido as enum (
  'armado',
  'confirmado',
  'en_preparacion',
  'en_camino',
  'entregado',
  'cancelado'
);
create type estado_suscripcion as enum ('activa', 'pausada', 'cancelada');

-- ── Perfiles ────────────────────────────────────────────────────────────
create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  apellido text,
  telefono text,
  direccion text,
  rol rol_usuario not null default 'cliente',
  creado_en timestamptz not null default now()
);

-- ── Catálogo ────────────────────────────────────────────────────────────
create table cajas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(10, 2) not null,
  capacidad int,
  imagen_url text,
  activa boolean not null default true
);

create table tematicas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  imagen_url text,
  activa boolean not null default true
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(10, 2) not null,
  categoria categoria_producto not null,
  imagen_url text,
  stock_actual int not null default 0,
  stock_minimo int not null default 5,
  activo boolean not null default true
);

-- Combo predefinido por temática (para quien no quiere armar todo desde cero)
create table combos (
  id uuid primary key default gen_random_uuid(),
  tematica_id uuid not null references tematicas (id),
  nombre text not null,
  precio numeric(10, 2) not null,
  activo boolean not null default true
);

create table combo_productos (
  combo_id uuid not null references combos (id) on delete cascade,
  producto_id uuid not null references productos (id),
  cantidad int not null default 1,
  primary key (combo_id, producto_id)
);

-- ── Zonas de reparto ────────────────────────────────────────────────────
create table zonas_reparto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, -- p.ej. barrio o zona dentro de Cañada de Gómez
  costo_envio numeric(10, 2) not null default 0,
  disponible boolean not null default true
);

-- ── Pedidos ─────────────────────────────────────────────────────────────
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles (id),
  caja_id uuid references cajas (id),
  tematica_id uuid references tematicas (id),
  combo_id uuid references combos (id), -- null si fue armado libre
  tipo tipo_pedido not null default 'unico',
  metodo_pago metodo_pago not null,
  comprobante_url text, -- para transferencia
  zona_reparto_id uuid references zonas_reparto (id),
  direccion_entrega text not null,
  fecha_entrega date,
  franja_entrega text,
  repartidor_id uuid references perfiles (id),
  subtotal numeric(10, 2) not null default 0,
  costo_envio numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  estado estado_pedido not null default 'armado',
  creado_en timestamptz not null default now()
);

-- Productos individuales elegidos dentro de un pedido (armado libre)
create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos (id) on delete cascade,
  producto_id uuid not null references productos (id),
  cantidad int not null default 1,
  precio_unitario numeric(10, 2) not null
);

-- ── Suscripciones ───────────────────────────────────────────────────────
create table suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles (id),
  caja_id uuid references cajas (id),
  tematica_id uuid references tematicas (id),
  frecuencia_dias int not null default 30,
  proxima_entrega date,
  estado estado_suscripcion not null default 'activa',
  creado_en timestamptz not null default now()
);

-- ── Índices básicos ─────────────────────────────────────────────────────
create index idx_pedidos_usuario on pedidos (usuario_id);
create index idx_pedidos_estado on pedidos (estado);
create index idx_pedido_items_pedido on pedido_items (pedido_id);
create index idx_productos_categoria on productos (categoria);

-- Las políticas de Row Level Security (RLS) están en policies.sql —
-- correr ese archivo justo después de este.
