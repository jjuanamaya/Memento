-- Memento — Correcciones de noviembre 2026.
--
-- * Configuración general: costo de envío único, datos para transferencia
--   (CBU/alias) y dirección del local para retiro.
-- * Número de cliente correlativo (para buscar rápido desde el admin).
-- * Categorías de producto editables, costo y proveedor por producto.
-- * Cajas (tamaños) + temáticas: con una temática común la caja se llena sola
--   con los productos de la temática (precio = costo del contenido + % de
--   ganancia de la caja); con la temática "Personalizada" el cliente elige.
-- * Pedidos: envío o retiro, comentario de entrega, comprobante obligatorio
--   para transferencia, solo 4 estados y entregado/cancelado no se tocan más.
-- * Suscripciones: envío o retiro, comentario, pagos por período con
--   comprobante, "adeuda", motivo de pausa y borrado desde el admin.
--
-- Correr en el SQL Editor de Supabase, DESPUÉS de todas las migraciones
-- anteriores. Igual que seguridad_y_legal.sql: correr las 3 PARTES una por
-- vez, con el sitio sin uso, para evitar "deadlock detected". Se puede volver
-- a correr sin romper nada.

-- ═══════════════════════════ PARTE 1 ═══════════════════════════════════
-- Tablas y columnas nuevas.
set lock_timeout = '5s';

-- Fecha de hoy en Argentina (la base corre en UTC: entre las 21 y las 24 h
-- current_date ya da el día siguiente).
create or replace function hoy_ar()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

-- ── Configuración general (una sola fila) ───────────────────────────────
create table if not exists configuracion (
  id int primary key default 1 check (id = 1),
  costo_envio numeric(10, 2) not null default 0 check (costo_envio >= 0),
  cbu text check (char_length(cbu) <= 40),
  alias text check (char_length(alias) <= 60),
  titular_cuenta text check (char_length(titular_cuenta) <= 120),
  banco text check (char_length(banco) <= 80),
  direccion_local text check (char_length(direccion_local) <= 200),
  horario_retiro text check (char_length(horario_retiro) <= 200),
  actualizado_en timestamptz not null default now()
);

-- Arranca con el costo de envío más alto que había en las zonas de reparto;
-- ajustalo en Admin → Catálogo → Envío y pagos.
insert into configuracion (id, costo_envio)
values (1, coalesce((select max(costo_envio) from zonas_reparto where disponible), 0))
on conflict (id) do nothing;

alter table configuracion enable row level security;

drop policy if exists "configuracion_public_read" on configuracion;
create policy "configuracion_public_read" on configuracion for select using (true);

drop policy if exists "configuracion_admin_update" on configuracion;
create policy "configuracion_admin_update" on configuracion
  for update using (is_admin()) with check (is_admin());

-- ── Número de cliente correlativo ───────────────────────────────────────
-- "always": nadie puede cambiarlo a mano, ni el propio cliente.
alter table perfiles add column if not exists numero_cliente bigint generated always as identity;
create unique index if not exists perfiles_numero_cliente_key on perfiles (numero_cliente);

-- ── Categorías de producto editables ────────────────────────────────────
create table if not exists categorias_producto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (char_length(trim(nombre)) between 1 and 40),
  icono text check (char_length(icono) <= 8),
  orden int not null default 0,
  activa boolean not null default true
);

alter table categorias_producto enable row level security;

drop policy if exists "categorias_producto_public_read" on categorias_producto;
create policy "categorias_producto_public_read" on categorias_producto for select using (true);

drop policy if exists "categorias_producto_admin_manage" on categorias_producto;
create policy "categorias_producto_admin_manage" on categorias_producto
  for all using (is_admin()) with check (is_admin());

insert into categorias_producto (nombre, icono, orden)
select * from (values
  ('Snacks', '🍿', 1),
  ('Dulces', '🍫', 2),
  ('Bebidas', '🥤', 3),
  ('Otros', '🎁', 4)
) as v(nombre, icono, orden)
where not exists (select 1 from categorias_producto);

-- ── Productos: categoría editable, costo y proveedor ────────────────────
alter table productos add column if not exists categoria_id uuid references categorias_producto(id);
alter table productos add column if not exists costo numeric(10, 2) not null default 0;
alter table productos add column if not exists proveedor_id uuid references proveedores(id);
-- La categoría vieja (enum fijo) queda solo como respaldo histórico.
alter table productos alter column categoria drop not null;

update productos p
set categoria_id = c.id
from categorias_producto c
where p.categoria_id is null
  and c.nombre = case p.categoria::text
    when 'snack' then 'Snacks'
    when 'dulce' then 'Dulces'
    when 'bebida' then 'Bebidas'
    else 'Otros'
  end;

-- Costo inicial: el último costo unitario cargado en una entrada de stock.
update productos p
set costo = m.costo_unitario
from (
  select distinct on (producto_id) producto_id, costo_unitario
  from movimientos_stock
  where tipo = 'entrada' and costo_unitario is not null
  order by producto_id, creado_en desc
) m
where p.id = m.producto_id and p.costo = 0;

-- ── Cajas = tamaños; temáticas = contenido ──────────────────────────────
-- Con una temática común, la caja se llena sola con los productos de esa
-- temática hasta su capacidad, y cuesta: costo de ese contenido + % de
-- ganancia de la caja. Con la temática "Personalizada" el cliente elige
-- cada producto y paga el precio base de la caja + el precio de cada uno.
alter table cajas add column if not exists ganancia_porcentaje numeric(6, 2) not null default 40;

do $$ begin
  alter table cajas add constraint cajas_ganancia_porcentaje_check check (ganancia_porcentaje between 0 and 1000);
exception when duplicate_object then null; end $$;

alter table tematicas add column if not exists personalizada boolean not null default false;

update tematicas set personalizada = true where lower(trim(nombre)) = 'personalizada';

insert into tematicas (nombre, descripcion, activa, personalizada)
select 'Personalizada', 'Elegís vos cada producto que va adentro.', true, true
where not exists (select 1 from tematicas where personalizada);

create table if not exists tematica_productos (
  tematica_id uuid not null references tematicas(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  primary key (tematica_id, producto_id)
);

alter table tematica_productos enable row level security;

drop policy if exists "tematica_productos_public_read" on tematica_productos;
create policy "tematica_productos_public_read" on tematica_productos for select using (true);

drop policy if exists "tematica_productos_admin_manage" on tematica_productos;
create policy "tematica_productos_admin_manage" on tematica_productos
  for all using (is_admin()) with check (is_admin());

-- Contenido sugerido para arrancar, con los productos que ya hay cargados.
-- Ajustalo en Admin → Catálogo → Temáticas.
insert into tematica_productos (tematica_id, producto_id)
select t.id, p.id
from (values
  ('Noche de Películas', 'Papitas'), ('Noche de Películas', 'Doritos'), ('Noche de Películas', 'Palitos salados'),
  ('Noche de Películas', 'Gaseosa 500ml'), ('Noche de Películas', 'Gomitas'),
  ('Cumpleaños', 'Alfajores'), ('Cumpleaños', 'Alfajor de chocolate'), ('Cumpleaños', 'Chocolate'),
  ('Cumpleaños', 'Gomitas'), ('Cumpleaños', 'Gaseosa 500ml'),
  ('En Pareja', 'Chocolate'), ('En Pareja', 'Alfajor de chocolate'), ('En Pareja', 'Alfajores'), ('En Pareja', 'Gomitas'),
  ('Relax', 'Café en grano'), ('Relax', 'Chocolate'), ('Relax', 'Alfajor de chocolate'),
  ('Momento Café', 'Café en grano'), ('Momento Café', 'Alfajores'), ('Momento Café', 'Alfajor de chocolate'),
  ('Momento Café', 'Chocolate'),
  ('Gamer', 'Doritos'), ('Gamer', 'Papitas'), ('Gamer', 'Palitos salados'), ('Gamer', 'Gaseosa 500ml'), ('Gamer', 'Gomitas'),
  ('Bajon', 'Doritos'), ('Bajon', 'Papitas'), ('Bajon', 'Alfajores'), ('Bajon', 'Chocolate'), ('Bajon', 'Gomitas'),
  ('Bajon', 'Gaseosa 500ml')
) as v(tematica, producto)
join tematicas t on lower(t.nombre) = lower(v.tematica) and not t.personalizada
join productos p on lower(p.nombre) = lower(v.producto)
where not exists (select 1 from tematica_productos)
on conflict do nothing;

-- ── Pedidos: entrega, comentario y estados ──────────────────────────────
alter table pedidos add column if not exists tipo_entrega text not null default 'envio';
alter table pedidos add column if not exists comentario_entrega text;
alter table pedidos add column if not exists personalizada boolean not null default false;
alter table pedidos alter column direccion_entrega drop not null;

do $$ begin
  alter table pedidos add constraint pedidos_tipo_entrega_check check (tipo_entrega in ('envio', 'retiro'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table pedidos add constraint pedidos_comentario_entrega_check check (char_length(comentario_entrega) <= 300);
exception when duplicate_object then null; end $$;

-- Solo quedan 4 estados: confirmado, en camino, entregado y cancelado.
update pedidos set estado = 'confirmado' where estado in ('armado', 'en_preparacion');
alter table pedidos alter column estado set default 'confirmado';

-- Borrar una suscripción no borra sus pedidos: quedan sin suscripción.
alter table pedidos drop constraint if exists pedidos_suscripcion_id_fkey;
alter table pedidos add constraint pedidos_suscripcion_id_fkey
  foreign key (suscripcion_id) references suscripciones(id) on delete set null;

-- ── Suscripciones: entrega, pagos y pausa ───────────────────────────────
alter table suscripciones add column if not exists tipo_entrega text not null default 'envio';
alter table suscripciones add column if not exists comentario_entrega text;
alter table suscripciones add column if not exists costo_envio numeric(10, 2) not null default 0;
alter table suscripciones add column if not exists motivo_pausa text;
alter table suscripciones add column if not exists pausada_en date;
-- Fecha en la que vence el próximo pago. Si ya pasó y no hay pago aprobado,
-- la suscripción "adeuda".
alter table suscripciones add column if not exists pagado_hasta date;

do $$ begin
  alter table suscripciones add constraint suscripciones_tipo_entrega_check check (tipo_entrega in ('envio', 'retiro'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table suscripciones add constraint suscripciones_comentario_entrega_check check (char_length(comentario_entrega) <= 300);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table suscripciones add constraint suscripciones_motivo_pausa_check check (char_length(motivo_pausa) <= 200);
exception when duplicate_object then null; end $$;

-- Las suscripciones que ya existían arrancan al día (vence en la próxima
-- entrega) y conservan el envío de su zona.
update suscripciones set pagado_hasta = coalesce(proxima_entrega, hoy_ar()) where pagado_hasta is null;
update suscripciones s
set costo_envio = z.costo_envio
from zonas_reparto z
where z.id = s.zona_reparto_id and s.costo_envio = 0;

drop policy if exists "suscripciones_admin_delete" on suscripciones;
create policy "suscripciones_admin_delete" on suscripciones for delete using (is_admin());

-- ── Pagos de suscripción (uno por período) ──────────────────────────────
create table if not exists pagos_suscripcion (
  id uuid primary key default gen_random_uuid(),
  suscripcion_id uuid not null references suscripciones(id) on delete cascade,
  monto numeric(10, 2) not null,
  metodo_pago metodo_pago not null,
  comprobante_url text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  -- El pago del primer período ya está contado en pagado_hasta al suscribirse:
  -- aprobarlo no adelanta nada y rechazarlo lo deja adeudado.
  inicial boolean not null default false,
  registrado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  revisado_en timestamptz
);

create index if not exists idx_pagos_suscripcion_sus on pagos_suscripcion (suscripcion_id, creado_en desc);

alter table pagos_suscripcion enable row level security;

drop policy if exists "pagos_suscripcion_select_own_or_admin" on pagos_suscripcion;
create policy "pagos_suscripcion_select_own_or_admin" on pagos_suscripcion
  for select using (
    is_admin() or exists (
      select 1 from suscripciones s
      where s.id = pagos_suscripcion.suscripcion_id and s.usuario_id = auth.uid()
    )
  );
-- Altas y cambios solo a través de las funciones de más abajo.

-- ── Comprobantes: el cliente puede borrar los suyos (si el pedido falla) ─
drop policy if exists "comprobantes_delete_own" on storage.objects;
create policy "comprobantes_delete_own" on storage.objects
  for delete using (
    bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═══════════════════════════ PARTE 2 ═══════════════════════════════════
-- Reglas automáticas (triggers).
set lock_timeout = '5s';

-- ── Pedidos: el cliente no los edita; entregado/cancelado es definitivo ─
create or replace function proteger_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() es null desde el SQL Editor: ahí no se bloquea nada.
  if auth.uid() is null then
    return new;
  end if;

  if not is_admin() then
    raise exception 'Un pedido confirmado no se puede modificar. Escribinos si necesitás cambiar algo.';
  end if;

  if old.estado in ('entregado', 'cancelado') and new.estado is distinct from old.estado then
    raise exception 'Un pedido entregado o cancelado ya no se puede cambiar de estado.';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_pedido on pedidos;
create trigger proteger_pedido
  before update on pedidos
  for each row execute function proteger_pedido();

-- ── Suscripciones: qué puede cambiar el cliente ─────────────────────────
create or replace function proteger_suscripcion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin() then
    if (to_jsonb(new) - 'estado') is distinct from (to_jsonb(old) - 'estado') then
      raise exception 'Solo podés pausar, reactivar o cancelar tu suscripción.';
    end if;
    if old.estado = 'cancelada' and new.estado <> 'cancelada' then
      raise exception 'Una suscripción cancelada no se puede reactivar. Podés crear una nueva.';
    end if;
    if old.estado = 'pausada' and new.estado = 'activa' and old.motivo_pausa is not null then
      raise exception 'Esta suscripción la pausamos nosotros (%). Escribinos para reactivarla.', old.motivo_pausa;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_suscripcion on suscripciones;
create trigger proteger_suscripcion
  before update on suscripciones
  for each row execute function proteger_suscripcion();

-- Mientras está pausada, el tiempo "se congela": al reactivarla se corren
-- la próxima entrega y el vencimiento del pago tantos días como estuvo
-- pausada. (Corre después de proteger_suscripcion: los triggers BEFORE van
-- en orden alfabético.)
create or replace function suscripcion_ciclo_pausa()
returns trigger
language plpgsql
as $$
declare
  v_dias int;
begin
  if new.estado = 'pausada' and old.estado <> 'pausada' then
    new.pausada_en := hoy_ar();
  elsif old.estado = 'pausada' and new.estado <> 'pausada' then
    v_dias := greatest(hoy_ar() - coalesce(old.pausada_en, hoy_ar()), 0);
    if new.estado = 'activa' then
      new.pagado_hasta := new.pagado_hasta + v_dias;
      new.proxima_entrega := new.proxima_entrega + v_dias;
    end if;
    new.pausada_en := null;
    new.motivo_pausa := null;
  end if;
  return new;
end;
$$;

drop trigger if exists suscripcion_ciclo_pausa on suscripciones;
create trigger suscripcion_ciclo_pausa
  before update on suscripciones
  for each row execute function suscripcion_ciclo_pausa();

-- ═══════════════════════════ PARTE 3 ═══════════════════════════════════
-- Funciones que usa la web.
set lock_timeout = '5s';

-- ¿El comprobante existe y está en la carpeta de quien llama?
create or replace function comprobante_valido(p_ruta text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_ruta, '') <> ''
    and (storage.foldername(p_ruta))[1] = auth.uid()::text
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'comprobantes' and o.name = p_ruta
    );
$$;

-- ── registrar_movimiento_stock: una entrada con costo actualiza el costo
--    del producto (y con eso el precio de las cajas que lo llevan) ────────
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

  if p_tipo = 'entrada' and p_costo_unitario is not null and p_costo_unitario > 0 then
    update productos set costo = p_costo_unitario where id = p_producto_id;
  end if;

  return v_movimiento_id;
end;
$$;

grant execute on function registrar_movimiento_stock(uuid, tipo_movimiento_stock, int, text, uuid, numeric) to authenticated;

-- ── contenido_tematico: cómo se llena una caja con una temática ─────────
-- Reparte la capacidad de la caja entre los productos de la temática, de a
-- una unidad por producto en cada vuelta, sin pasarse del stock. Si no hay
-- stock suficiente devuelve menos unidades que la capacidad.
-- (El orden por id hace que el reparto sea siempre el mismo.)
create or replace function contenido_tematico(p_capacidad int, p_tematica_id uuid)
returns table (producto_id uuid, cantidad int)
language plpgsql
stable
set search_path = public
as $$
declare
  v_ids uuid[];
  v_stock int[];
  v_cant int[];
  v_n int;
  v_total int := 0;
  v_avanzo boolean;
  i int;
begin
  select array_agg(p.id order by p.id), array_agg(p.stock_actual order by p.id)
  into v_ids, v_stock
  from tematica_productos tp
  join productos p on p.id = tp.producto_id
  where tp.tematica_id = p_tematica_id and p.activo and p.stock_actual > 0;

  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n = 0 or coalesce(p_capacidad, 0) <= 0 then
    return;
  end if;

  v_cant := array_fill(0, array[v_n]);
  loop
    v_avanzo := false;
    for i in 1..v_n loop
      exit when v_total >= p_capacidad;
      if v_cant[i] < v_stock[i] then
        v_cant[i] := v_cant[i] + 1;
        v_total := v_total + 1;
        v_avanzo := true;
      end if;
    end loop;
    exit when v_total >= p_capacidad or not v_avanzo;
  end loop;

  for i in 1..v_n loop
    if v_cant[i] > 0 then
      producto_id := v_ids[i];
      cantidad := v_cant[i];
      return next;
    end if;
  end loop;
end;
$$;

-- ── cotizar_cajas: qué lleva y cuánto sale cada caja con cada temática ──
-- La usa la web para mostrar el contenido y el precio antes de pedir.
-- Precio: costo de cada producto + % de ganancia de la caja; si un producto
-- todavía no tiene costo cargado, se usa su precio de venta.
-- "estado": disponible | sin_stock (no alcanza para llenarla) |
-- sin_precio (algún producto no tiene ni costo ni precio) | sin_contenido.
create or replace function cotizar_cajas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caja record;
  v_tematica record;
  v_items jsonb;
  v_unidades int;
  v_costo numeric;
  v_sin_costo boolean;
  v_tiene_contenido boolean;
  v_resultado jsonb := '[]'::jsonb;
begin
  for v_caja in select id, capacidad, ganancia_porcentaje from cajas where activa loop
    for v_tematica in select id from tematicas where activa and not personalizada loop
      select
        coalesce(jsonb_agg(jsonb_build_object('producto_id', p.id, 'nombre', p.nombre, 'cantidad', c.cantidad)
          order by p.nombre), '[]'::jsonb),
        coalesce(sum(c.cantidad), 0),
        -- Producto sin costo cargado: se usa su precio de venta (ya tiene ganancia).
        coalesce(sum(case when p.costo > 0 then p.costo * (1 + v_caja.ganancia_porcentaje / 100) else p.precio end
          * c.cantidad), 0),
        coalesce(bool_or(p.costo <= 0 and p.precio <= 0), false)
      into v_items, v_unidades, v_costo, v_sin_costo
      from contenido_tematico(v_caja.capacidad, v_tematica.id) c
      join productos p on p.id = c.producto_id;

      v_tiene_contenido := exists (select 1 from tematica_productos where tematica_id = v_tematica.id);

      v_resultado := v_resultado || jsonb_build_object(
        'caja_id', v_caja.id,
        'tematica_id', v_tematica.id,
        'items', v_items,
        'unidades', v_unidades,
        'precio', round(v_costo),
        'estado', case
          when not v_tiene_contenido then 'sin_contenido'
          when v_unidades < coalesce(v_caja.capacidad, 0) or v_unidades = 0 then 'sin_stock'
          when v_sin_costo then 'sin_precio'
          else 'disponible'
        end
      );
    end loop;
  end loop;

  return v_resultado;
end;
$$;

grant execute on function cotizar_cajas() to anon, authenticated;

-- ── crear_pedido ────────────────────────────────────────────────────────
-- Temática común: la caja se llena sola con los productos de la temática y
-- cuesta el costo de ese contenido + el % de ganancia de la caja.
-- Temática "Personalizada": productos elegidos por el cliente; cuesta el
-- precio base de la caja + los productos. Total = subtotal + envío (o $0 si
-- retira). Con transferencia, el comprobante es obligatorio.
drop function if exists crear_pedido(uuid, uuid, metodo_pago, text, numeric, numeric, numeric, jsonb, uuid);
drop function if exists crear_pedido(uuid, uuid, metodo_pago, text, numeric, numeric, numeric, jsonb);

create or replace function crear_pedido(
  p_caja_id uuid,
  p_tematica_id uuid,
  p_metodo_pago metodo_pago,
  p_tipo_entrega text,
  p_direccion_entrega text,
  p_comentario text,
  p_items jsonb,
  p_comprobante_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_caja record;
  v_tematica record;
  v_items jsonb;
  v_item record;
  v_stock int;
  v_precio numeric;
  v_costo numeric;
  v_nombre text;
  v_costo_envio numeric := 0;
  v_subtotal numeric := 0;
  v_costo_contenido numeric := 0;
  v_sin_costo boolean := false;
  v_total_items int := 0;
  v_pedido_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'Tenés que iniciar sesión para hacer un pedido.';
  end if;

  if coalesce(p_tipo_entrega, '') not in ('envio', 'retiro') then
    raise exception 'Elegí si querés envío a domicilio o retiro en el local.';
  end if;

  if p_tipo_entrega = 'envio' and coalesce(trim(p_direccion_entrega), '') = '' then
    raise exception 'Falta la dirección de entrega.';
  end if;

  if char_length(coalesce(p_comentario, '')) > 300 then
    raise exception 'El comentario de entrega puede tener hasta 300 caracteres.';
  end if;

  select * into v_caja from cajas where id = p_caja_id and activa;
  if not found then
    raise exception 'La caja elegida ya no está disponible.';
  end if;

  select * into v_tematica from tematicas where id = p_tematica_id and activa;
  if not found then
    raise exception 'La temática elegida ya no está disponible.';
  end if;

  if v_tematica.personalizada then
    v_items := coalesce(p_items, '[]'::jsonb);
    if jsonb_array_length(v_items) = 0 then
      raise exception 'Sumá al menos un producto a tu caja.';
    end if;
  else
    select coalesce(jsonb_agg(jsonb_build_object('producto_id', c.producto_id, 'cantidad', c.cantidad)), '[]'::jsonb)
    into v_items
    from contenido_tematico(v_caja.capacidad, v_tematica.id) c;

    if jsonb_array_length(v_items) = 0 then
      raise exception 'Esa temática todavía no tiene productos para armar la caja.';
    end if;
  end if;

  for v_item in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::int) as cantidad
    from jsonb_array_elements(v_items) e
    group by 1
  loop
    if v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cantidad de producto inválida.';
    end if;

    select stock_actual, precio, costo, nombre into v_stock, v_precio, v_costo, v_nombre
    from productos
    where id = v_item.producto_id and activo
    for update;

    if not found then
      raise exception 'Uno de los productos de la caja ya no está disponible.';
    end if;

    if v_stock < v_item.cantidad then
      raise exception 'No hay stock suficiente de "%".', v_nombre;
    end if;

    v_subtotal := v_subtotal + v_precio * v_item.cantidad;
    -- Igual que cotizar_cajas: sin costo cargado, vale su precio de venta.
    v_costo_contenido := v_costo_contenido
      + (case when v_costo > 0 then v_costo * (1 + v_caja.ganancia_porcentaje / 100) else v_precio end)
      * v_item.cantidad;
    v_sin_costo := v_sin_costo or (v_costo <= 0 and v_precio <= 0);
    v_total_items := v_total_items + v_item.cantidad;
  end loop;

  if v_tematica.personalizada then
    if v_caja.capacidad is not null and v_total_items > v_caja.capacidad then
      raise exception 'Elegiste más productos de los que entran en la caja.';
    end if;
    v_subtotal := v_caja.precio + v_subtotal;
  else
    if v_total_items < coalesce(v_caja.capacidad, 0) then
      raise exception 'No hay stock suficiente para llenar la caja "%" con la temática "%". Probá con otra temática o con una caja más chica.',
        v_caja.nombre, v_tematica.nombre;
    end if;
    if v_sin_costo then
      raise exception 'Esta caja todavía no tiene precio. Probá con otra temática o escribinos.';
    end if;
    v_subtotal := round(v_costo_contenido);
  end if;

  if p_tipo_entrega = 'envio' then
    select coalesce(costo_envio, 0) into v_costo_envio from configuracion where id = 1;
    v_costo_envio := coalesce(v_costo_envio, 0);
  end if;

  if p_metodo_pago = 'transferencia' and not comprobante_valido(p_comprobante_url) then
    raise exception 'Subí el comprobante de la transferencia para confirmar el pedido.';
  end if;

  insert into pedidos (
    usuario_id, caja_id, tematica_id, metodo_pago, tipo_entrega,
    direccion_entrega, comentario_entrega, personalizada, comprobante_url,
    subtotal, costo_envio, total, estado
  )
  values (
    v_usuario_id, v_caja.id, v_tematica.id, p_metodo_pago, p_tipo_entrega,
    case when p_tipo_entrega = 'envio' then trim(p_direccion_entrega) end,
    nullif(trim(coalesce(p_comentario, '')), ''),
    v_tematica.personalizada,
    case when p_metodo_pago = 'transferencia' then p_comprobante_url end,
    v_subtotal, v_costo_envio, v_subtotal + v_costo_envio, 'confirmado'
  )
  returning id into v_pedido_id;

  for v_item in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::int) as cantidad
    from jsonb_array_elements(v_items) e
    group by 1
  loop
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    select v_pedido_id, p.id, v_item.cantidad, p.precio
    from productos p
    where p.id = v_item.producto_id;

    update productos set stock_actual = stock_actual - v_item.cantidad where id = v_item.producto_id;

    insert into movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id)
    values (v_item.producto_id, 'salida', v_item.cantidad, 'Venta · pedido #' || left(v_pedido_id::text, 8), v_usuario_id);
  end loop;

  return v_pedido_id;
end;
$$;

grant execute on function crear_pedido(uuid, uuid, metodo_pago, text, text, text, jsonb, text) to authenticated;

-- ── crear_suscripcion ───────────────────────────────────────────────────
-- Temáticas comunes (no la Personalizada): en cada entrega la caja se llena
-- sola con la temática sorteada. Con transferencia, el comprobante del primer
-- período es obligatorio y queda "en revisión" hasta que el admin lo aprueba.
drop function if exists crear_suscripcion(uuid, int, metodo_pago, text, uuid, uuid[]);

create or replace function crear_suscripcion(
  p_caja_id uuid,
  p_frecuencia_dias int,
  p_metodo_pago metodo_pago,
  p_tipo_entrega text,
  p_direccion_entrega text,
  p_comentario text,
  p_tematica_ids uuid[],
  p_comprobante_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_suscripcion_id uuid;
  v_tematica_id uuid;
  v_precio numeric;
  v_costo_envio numeric := 0;
  v_primera_entrega date;
begin
  if v_usuario_id is null then
    raise exception 'Tenés que iniciar sesión para suscribirte.';
  end if;

  if coalesce(p_tipo_entrega, '') not in ('envio', 'retiro') then
    raise exception 'Elegí si querés envío a domicilio o retiro en el local.';
  end if;

  if p_tipo_entrega = 'envio' and coalesce(trim(p_direccion_entrega), '') = '' then
    raise exception 'Falta la dirección de entrega.';
  end if;

  if char_length(coalesce(p_comentario, '')) > 300 then
    raise exception 'El comentario de entrega puede tener hasta 300 caracteres.';
  end if;

  if not exists (select 1 from cajas where id = p_caja_id and activa) then
    raise exception 'La caja elegida ya no está disponible.';
  end if;

  if array_length(p_tematica_ids, 1) is null or array_length(p_tematica_ids, 1) < 2 then
    raise exception 'Elegí al menos 2 temáticas para que la suscripción tenga sorpresa.';
  end if;

  if (select count(*) from tematicas where id = any(p_tematica_ids) and activa and not personalizada)
     <> (select count(distinct t) from unnest(p_tematica_ids) t) then
    raise exception 'Una de las temáticas elegidas ya no está disponible.';
  end if;

  select precio into v_precio
  from frecuencias_suscripcion
  where dias = p_frecuencia_dias and activa = true;

  if v_precio is null then
    raise exception 'Esa frecuencia de envío ya no está disponible.';
  end if;

  if p_tipo_entrega = 'envio' then
    select coalesce(costo_envio, 0) into v_costo_envio from configuracion where id = 1;
    v_costo_envio := coalesce(v_costo_envio, 0);
  end if;

  if p_metodo_pago = 'transferencia' and not comprobante_valido(p_comprobante_url) then
    raise exception 'Subí el comprobante de la transferencia para confirmar la suscripción.';
  end if;

  v_primera_entrega := hoy_ar() + p_frecuencia_dias;

  insert into suscripciones (
    usuario_id, caja_id, frecuencia_dias, metodo_pago, precio, costo_envio,
    tipo_entrega, direccion_entrega, comentario_entrega,
    proxima_entrega, pagado_hasta, estado
  )
  values (
    v_usuario_id, p_caja_id, p_frecuencia_dias, p_metodo_pago, v_precio, v_costo_envio,
    p_tipo_entrega,
    case when p_tipo_entrega = 'envio' then trim(p_direccion_entrega) end,
    nullif(trim(coalesce(p_comentario, '')), ''),
    v_primera_entrega, v_primera_entrega, 'activa'
  )
  returning id into v_suscripcion_id;

  foreach v_tematica_id in array (select array_agg(distinct t) from unnest(p_tematica_ids) t) loop
    insert into suscripcion_tematicas (suscripcion_id, tematica_id)
    values (v_suscripcion_id, v_tematica_id);
  end loop;

  if p_metodo_pago = 'transferencia' then
    insert into pagos_suscripcion (suscripcion_id, monto, metodo_pago, comprobante_url, estado, inicial)
    values (v_suscripcion_id, v_precio + v_costo_envio, 'transferencia', p_comprobante_url, 'pendiente', true);
  end if;

  return v_suscripcion_id;
end;
$$;

grant execute on function crear_suscripcion(uuid, int, metodo_pago, text, text, text, uuid[], text) to authenticated;

-- ── generar_pedido_suscripcion (admin) ──────────────────────────────────
-- Sortea la temática (sin repetir hasta que salgan todas), llena la caja con
-- los productos de esa temática y descuenta stock.
create or replace function generar_pedido_suscripcion(p_suscripcion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_capacidad int;
  v_pool_size int;
  v_candidata record;
  v_unidades int;
  v_tematica_id uuid;
  v_pedido_id uuid;
  v_item record;
begin
  if not is_admin() then
    raise exception 'Solo un admin puede generar el pedido de una suscripción.';
  end if;

  select * into v_sub from suscripciones where id = p_suscripcion_id;

  if v_sub is null then
    raise exception 'Suscripción no encontrada.';
  end if;

  if v_sub.estado <> 'activa' then
    raise exception 'La suscripción no está activa.';
  end if;

  select capacidad into v_capacidad from cajas where id = v_sub.caja_id;

  select count(*) into v_pool_size
  from suscripcion_tematicas st
  join tematicas t on t.id = st.tematica_id
  where st.suscripcion_id = p_suscripcion_id and t.activa and not t.personalizada;

  if v_pool_size = 0 then
    raise exception 'Esta suscripción no tiene temáticas disponibles.';
  end if;

  -- Bloquea el stock de todo lo que puede ir en la caja mientras se arma.
  perform 1 from productos
  where id in (
    select tp.producto_id from tematica_productos tp
    join suscripcion_tematicas st on st.tematica_id = tp.tematica_id
    where st.suscripcion_id = p_suscripcion_id
  )
  for update;

  -- Sorteo: primero las temáticas que no salieron en las últimas entregas
  -- (sin repetir hasta que salgan todas), y entre esas, la primera que
  -- alcance para llenar la caja.
  for v_candidata in
    select st.tematica_id,
           st.tematica_id in (
             select p.tematica_id from pedidos p
             where p.suscripcion_id = p_suscripcion_id and p.tematica_id is not null
             order by p.creado_en desc
             limit greatest(v_pool_size - 1, 0)
           ) as reciente
    from suscripcion_tematicas st
    join tematicas t on t.id = st.tematica_id
    where st.suscripcion_id = p_suscripcion_id and t.activa and not t.personalizada
    order by 2, random()
  loop
    select coalesce(sum(cantidad), 0) into v_unidades from contenido_tematico(v_capacidad, v_candidata.tematica_id);
    if v_unidades > 0 and v_unidades >= coalesce(v_capacidad, 0) then
      v_tematica_id := v_candidata.tematica_id;
      exit;
    end if;
  end loop;

  if v_tematica_id is null then
    raise exception 'No hay stock suficiente para llenar la caja con ninguna de las temáticas de esta suscripción.';
  end if;

  insert into pedidos (
    usuario_id, caja_id, tematica_id, tipo, metodo_pago, tipo_entrega,
    direccion_entrega, comentario_entrega, subtotal, costo_envio, total,
    estado, suscripcion_id
  )
  values (
    v_sub.usuario_id, v_sub.caja_id, v_tematica_id, 'suscripcion', v_sub.metodo_pago, v_sub.tipo_entrega,
    v_sub.direccion_entrega, v_sub.comentario_entrega, v_sub.precio, v_sub.costo_envio, v_sub.precio + v_sub.costo_envio,
    'confirmado', p_suscripcion_id
  )
  returning id into v_pedido_id;

  for v_item in
    select c.producto_id, c.cantidad from contenido_tematico(v_capacidad, v_tematica_id) c
  loop
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    select v_pedido_id, p.id, v_item.cantidad, p.precio from productos p where p.id = v_item.producto_id;

    update productos set stock_actual = stock_actual - v_item.cantidad where id = v_item.producto_id;

    insert into movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id)
    values (v_item.producto_id, 'salida', v_item.cantidad, 'Suscripción · pedido #' || left(v_pedido_id::text, 8), auth.uid());
  end loop;

  update suscripciones
  set proxima_entrega = coalesce(proxima_entrega, hoy_ar()) + frecuencia_dias
  where id = p_suscripcion_id;

  return v_pedido_id;
end;
$$;

grant execute on function generar_pedido_suscripcion(uuid) to authenticated;

-- ── subir_pago_suscripcion (cliente) ────────────────────────────────────
-- El cliente sube el comprobante del período que vence; queda en revisión.
create or replace function subir_pago_suscripcion(p_suscripcion_id uuid, p_comprobante_url text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_pago_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión.';
  end if;

  select * into v_sub from suscripciones where id = p_suscripcion_id and usuario_id = auth.uid();
  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;

  if v_sub.estado = 'cancelada' then
    raise exception 'Esta suscripción está cancelada.';
  end if;

  if exists (select 1 from pagos_suscripcion where suscripcion_id = p_suscripcion_id and estado = 'pendiente') then
    raise exception 'Ya tenés un comprobante en revisión. Te avisamos apenas lo confirmemos.';
  end if;

  if not comprobante_valido(p_comprobante_url) then
    raise exception 'No encontramos el comprobante. Probá subirlo de nuevo.';
  end if;

  insert into pagos_suscripcion (suscripcion_id, monto, metodo_pago, comprobante_url, estado)
  values (p_suscripcion_id, v_sub.precio + v_sub.costo_envio, 'transferencia', p_comprobante_url, 'pendiente')
  returning id into v_pago_id;

  return v_pago_id;
end;
$$;

grant execute on function subir_pago_suscripcion(uuid, text) to authenticated;

-- ── revisar_pago_suscripcion (admin): aprobar o rechazar un comprobante ─
create or replace function revisar_pago_suscripcion(p_pago_id uuid, p_aprobar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago record;
begin
  if not is_admin() then
    raise exception 'Solo un admin puede revisar pagos.';
  end if;

  select * into v_pago from pagos_suscripcion where id = p_pago_id for update;
  if not found then
    raise exception 'Pago no encontrado.';
  end if;

  if v_pago.estado <> 'pendiente' then
    raise exception 'Ese pago ya fue revisado.';
  end if;

  update pagos_suscripcion
  set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
      revisado_en = now(),
      registrado_por = auth.uid()
  where id = p_pago_id;

  if p_aprobar and not v_pago.inicial then
    update suscripciones
    set pagado_hasta = coalesce(pagado_hasta, hoy_ar()) + frecuencia_dias
    where id = v_pago.suscripcion_id;
  elsif not p_aprobar and v_pago.inicial then
    -- El primer período se había dado por pagado al suscribirse.
    update suscripciones
    set pagado_hasta = coalesce(pagado_hasta, hoy_ar()) - frecuencia_dias
    where id = v_pago.suscripcion_id;
  end if;
end;
$$;

grant execute on function revisar_pago_suscripcion(uuid, boolean) to authenticated;

-- ── registrar_pago_suscripcion (admin): pago cobrado en mano ────────────
create or replace function registrar_pago_suscripcion(p_suscripcion_id uuid, p_metodo_pago metodo_pago)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_pago_id uuid;
begin
  if not is_admin() then
    raise exception 'Solo un admin puede registrar pagos.';
  end if;

  select * into v_sub from suscripciones where id = p_suscripcion_id;
  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;

  insert into pagos_suscripcion (suscripcion_id, monto, metodo_pago, estado, registrado_por, revisado_en)
  values (p_suscripcion_id, v_sub.precio + v_sub.costo_envio, p_metodo_pago, 'aprobado', auth.uid(), now())
  returning id into v_pago_id;

  update suscripciones
  set pagado_hasta = coalesce(pagado_hasta, hoy_ar()) + frecuencia_dias
  where id = p_suscripcion_id;

  return v_pago_id;
end;
$$;

grant execute on function registrar_pago_suscripcion(uuid, metodo_pago) to authenticated;

notify pgrst, 'reload schema';
