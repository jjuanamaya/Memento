-- Memento — Gestión completa de stock: proveedores y movimientos (entrada/
-- salida) con auditoría. Correr en el SQL Editor de Supabase, después de
-- todas las migraciones anteriores.

create type tipo_movimiento_stock as enum ('entrada', 'salida');

-- ── Proveedores ──────────────────────────────────────────────────────────
create table proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto text,
  telefono text,
  email text,
  direccion text,
  notas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table proveedores enable row level security;

create policy "proveedores_admin_all" on proveedores
  for all using (is_admin()) with check (is_admin());

-- ── Movimientos de stock (entradas y salidas) ───────────────────────────
create table movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id),
  tipo tipo_movimiento_stock not null,
  cantidad int not null check (cantidad > 0),
  motivo text,
  proveedor_id uuid references proveedores(id),
  costo_unitario numeric(10, 2),
  usuario_id uuid not null references perfiles(id),
  creado_en timestamptz not null default now()
);

alter table movimientos_stock enable row level security;

create policy "movimientos_stock_admin_all" on movimientos_stock
  for all using (is_admin()) with check (is_admin());

create index idx_movimientos_stock_producto on movimientos_stock (producto_id);
create index idx_movimientos_stock_creado on movimientos_stock (creado_en desc);

-- ── registrar_movimiento_stock: registra el movimiento y ajusta el stock
-- del producto, todo junto (o se hace todo, o no se hace nada). ─────────
create or replace function registrar_movimiento_stock(
  p_producto_id uuid,
  p_tipo tipo_movimiento_stock,
  p_cantidad int,
  p_motivo text default null,
  p_proveedor_id uuid default null,
  p_costo_unitario numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movimiento_id uuid;
  v_stock_actual int;
begin
  if not is_admin() then
    raise exception 'Solo un admin puede registrar movimientos de stock.';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser mayor a cero.';
  end if;

  select stock_actual into v_stock_actual from productos where id = p_producto_id for update;

  if v_stock_actual is null then
    raise exception 'Producto no encontrado.';
  end if;

  if p_tipo = 'salida' and v_stock_actual < p_cantidad then
    raise exception 'No hay stock suficiente para registrar esa salida (quedan % unidades).', v_stock_actual;
  end if;

  insert into movimientos_stock (producto_id, tipo, cantidad, motivo, proveedor_id, costo_unitario, usuario_id)
  values (p_producto_id, p_tipo, p_cantidad, nullif(p_motivo, ''), p_proveedor_id, p_costo_unitario, auth.uid())
  returning id into v_movimiento_id;

  update productos
  set stock_actual = stock_actual + (case when p_tipo = 'entrada' then p_cantidad else -p_cantidad end)
  where id = p_producto_id;

  return v_movimiento_id;
end;
$$;

grant execute on function registrar_movimiento_stock(uuid, tipo_movimiento_stock, int, text, uuid, numeric) to authenticated;
