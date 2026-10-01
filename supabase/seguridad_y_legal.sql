-- Memento — Seguridad de datos y cumplimiento legal.
-- Correr en el SQL Editor de Supabase. Se puede correr más de una vez.
--
-- 1) Un cliente ya no puede darse rol de admin a sí mismo.
-- 2) Un cliente ya no puede editar el total/estado de su pedido ni el precio
--    de su suscripción (solo adjuntar comprobante / pausar-reactivar-cancelar).
-- 3) Los pedidos se crean SOLO con precios leídos de la base, nunca con los
--    que manda el navegador.
-- 4) Límites de tamaño y tipo para los archivos que se suben.
-- 5) Registro de solicitudes del "Botón de arrepentimiento" (Res. 424/2020).

-- IMPORTANTE: correr en 3 partes (PARTE 1, 2 y 3), una por vez, con el sitio
-- cerrado. Si se corre todo junto mientras alguien usa el sitio, Postgres
-- puede cortar con "deadlock detected" (no rompe nada: deshace todo).

-- ═══════════════════════════ PARTE 1 ═══════════════════════════════════
set lock_timeout = '5s';

-- ── 1) Perfiles: nadie se cambia el rol salvo un admin ──────────────────
create or replace function proteger_rol_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() es null cuando el cambio viene del SQL Editor o del alta de
  -- usuario de Supabase; ahí no se bloquea nada.
  if auth.uid() is not null and not is_admin() then
    if tg_op = 'INSERT' then
      new.rol := 'cliente';
    elsif new.rol is distinct from old.rol or new.id is distinct from old.id then
      raise exception 'No tenés permiso para cambiar el rol de una cuenta.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_rol_perfil on perfiles;
create trigger proteger_rol_perfil
  before insert or update on perfiles
  for each row execute function proteger_rol_perfil();

-- ═══════════════════════════ PARTE 2 ═══════════════════════════════════
set lock_timeout = '5s';

-- ── 2) Pedidos y suscripciones: el cliente solo toca lo que le corresponde ─
-- Los pedidos y suscripciones se crean únicamente con crear_pedido y
-- crear_suscripcion (que validan todo), no con inserts directos.
drop policy if exists "pedidos_insert_own" on pedidos;
drop policy if exists "pedido_items_insert" on pedido_items;
drop policy if exists "suscripciones_insert_own" on suscripciones;

create or replace function proteger_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin() then
    if (to_jsonb(new) - 'comprobante_url') is distinct from (to_jsonb(old) - 'comprobante_url') then
      raise exception 'Solo podés adjuntar el comprobante de tu pedido.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_pedido on pedidos;
create trigger proteger_pedido
  before update on pedidos
  for each row execute function proteger_pedido();

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
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_suscripcion on suscripciones;
create trigger proteger_suscripcion
  before update on suscripciones
  for each row execute function proteger_suscripcion();

-- ═══════════════════════════ PARTE 3 ═══════════════════════════════════
set lock_timeout = '5s';

-- ── 3) crear_pedido: precios, stock y capacidad calculados en la base ───
-- Misma firma que antes (la web no cambia), pero p_subtotal, p_costo_envio,
-- p_total y los precio_unitario que manda el navegador se IGNORAN.
create or replace function crear_pedido(
  p_caja_id uuid,
  p_tematica_id uuid,
  p_metodo_pago metodo_pago,
  p_direccion_entrega text,
  p_subtotal numeric,
  p_costo_envio numeric,
  p_total numeric,
  p_items jsonb,
  p_zona_reparto_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_caja record;
  v_item record;
  v_stock int;
  v_precio numeric;
  v_costo_envio numeric := 0;
  v_subtotal numeric := 0;
  v_total_items int := 0;
  v_pedido_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'Tenés que iniciar sesión para hacer un pedido.';
  end if;

  if coalesce(trim(p_direccion_entrega), '') = '' then
    raise exception 'Falta la dirección de entrega.';
  end if;

  select * into v_caja from cajas where id = p_caja_id and activa;
  if not found then
    raise exception 'La caja elegida ya no está disponible.';
  end if;

  if not exists (select 1 from tematicas where id = p_tematica_id and activa) then
    raise exception 'La temática elegida ya no está disponible.';
  end if;

  if p_zona_reparto_id is not null then
    select costo_envio into v_costo_envio from zonas_reparto where id = p_zona_reparto_id and disponible;
    if not found then
      raise exception 'La zona de reparto elegida no está disponible.';
    end if;
  end if;

  -- Se agrupa por producto por si el mismo viene repetido.
  for v_item in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::int) as cantidad
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
    group by 1
  loop
    if v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cantidad de producto inválida.';
    end if;

    select stock_actual, precio into v_stock, v_precio
    from productos
    where id = v_item.producto_id and activo
    for update;

    if not found then
      raise exception 'Uno de los productos elegidos ya no está disponible.';
    end if;

    if v_stock < v_item.cantidad then
      raise exception 'No hay stock suficiente de uno de los productos elegidos.';
    end if;

    v_subtotal := v_subtotal + v_precio * v_item.cantidad;
    v_total_items := v_total_items + v_item.cantidad;
  end loop;

  if v_caja.capacidad is not null and v_total_items > v_caja.capacidad then
    raise exception 'Elegiste más productos de los que entran en la caja.';
  end if;

  insert into pedidos (
    usuario_id, caja_id, tematica_id, metodo_pago,
    direccion_entrega, zona_reparto_id, subtotal, costo_envio, total
  )
  values (
    v_usuario_id, p_caja_id, p_tematica_id, p_metodo_pago,
    trim(p_direccion_entrega), p_zona_reparto_id, v_subtotal, v_costo_envio,
    v_caja.precio + v_subtotal + v_costo_envio
  )
  returning id into v_pedido_id;

  for v_item in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::int) as cantidad
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
    group by 1
  loop
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    select v_pedido_id, p.id, v_item.cantidad, p.precio
    from productos p
    where p.id = v_item.producto_id;

    update productos
    set stock_actual = stock_actual - v_item.cantidad
    where id = v_item.producto_id;
  end loop;

  return v_pedido_id;
end;
$$;

grant execute on function crear_pedido(uuid, uuid, metodo_pago, text, numeric, numeric, numeric, jsonb, uuid) to authenticated;

-- ── crear_suscripcion: también valida caja, temáticas y dirección ───────
create or replace function crear_suscripcion(
  p_caja_id uuid,
  p_frecuencia_dias int,
  p_metodo_pago metodo_pago,
  p_direccion_entrega text,
  p_zona_reparto_id uuid,
  p_tematica_ids uuid[]
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
begin
  if v_usuario_id is null then
    raise exception 'Tenés que iniciar sesión para suscribirte.';
  end if;

  if coalesce(trim(p_direccion_entrega), '') = '' then
    raise exception 'Falta la dirección de entrega.';
  end if;

  if not exists (select 1 from cajas where id = p_caja_id and activa) then
    raise exception 'La caja elegida ya no está disponible.';
  end if;

  if array_length(p_tematica_ids, 1) is null or array_length(p_tematica_ids, 1) < 2 then
    raise exception 'Elegí al menos 2 temáticas para que la suscripción tenga sorpresa.';
  end if;

  if (select count(*) from tematicas where id = any(p_tematica_ids) and activa)
     <> (select count(distinct t) from unnest(p_tematica_ids) t) then
    raise exception 'Una de las temáticas elegidas ya no está disponible.';
  end if;

  select precio into v_precio
  from frecuencias_suscripcion
  where dias = p_frecuencia_dias and activa = true;

  if v_precio is null then
    raise exception 'Esa frecuencia de envío ya no está disponible.';
  end if;

  insert into suscripciones (
    usuario_id, caja_id, frecuencia_dias, metodo_pago, precio,
    direccion_entrega, zona_reparto_id, proxima_entrega, estado
  )
  values (
    v_usuario_id, p_caja_id, p_frecuencia_dias, p_metodo_pago, v_precio,
    trim(p_direccion_entrega), p_zona_reparto_id, current_date + p_frecuencia_dias, 'activa'
  )
  returning id into v_suscripcion_id;

  foreach v_tematica_id in array (select array_agg(distinct t) from unnest(p_tematica_ids) t) loop
    insert into suscripcion_tematicas (suscripcion_id, tematica_id)
    values (v_suscripcion_id, v_tematica_id);
  end loop;

  return v_suscripcion_id;
end;
$$;

grant execute on function crear_suscripcion(uuid, int, metodo_pago, text, uuid, uuid[]) to authenticated;

-- ── 4) Archivos: tamaño máximo 5 MB y solo tipos esperados ─────────────
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'comprobantes';

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'catalogo';

-- ── 5) Botón de arrepentimiento (Res. 424/2020) ────────────────────────
-- Cualquiera puede pedirlo SIN registrarse; recibe un código al instante.
create table if not exists solicitudes_arrepentimiento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null check (char_length(nombre) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  numero_pedido text check (char_length(numero_pedido) <= 60),
  detalle text check (char_length(detalle) <= 1000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'resuelta')),
  creado_en timestamptz not null default now()
);

alter table solicitudes_arrepentimiento enable row level security;

drop policy if exists "arrepentimiento_admin_select" on solicitudes_arrepentimiento;
create policy "arrepentimiento_admin_select" on solicitudes_arrepentimiento
  for select using (is_admin());

drop policy if exists "arrepentimiento_admin_update" on solicitudes_arrepentimiento;
create policy "arrepentimiento_admin_update" on solicitudes_arrepentimiento
  for update using (is_admin()) with check (is_admin());

create or replace function crear_solicitud_arrepentimiento(
  p_nombre text,
  p_email text,
  p_numero_pedido text,
  p_detalle text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'Completá tu nombre y tu email.';
  end if;

  if trim(p_email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'El email no parece válido.';
  end if;

  v_codigo := 'ARR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into solicitudes_arrepentimiento (codigo, nombre, email, numero_pedido, detalle)
  values (
    v_codigo,
    trim(p_nombre),
    lower(trim(p_email)),
    nullif(trim(p_numero_pedido), ''),
    nullif(trim(p_detalle), '')
  );

  return v_codigo;
end;
$$;

grant execute on function crear_solicitud_arrepentimiento(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
