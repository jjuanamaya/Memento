-- Memento — Suscripciones (con sorteo de temática), zonas de reparto,
-- comprobante de transferencia y asignación de repartidor.
-- Correr en el SQL Editor de Supabase, DESPUÉS de schema.sql, policies.sql
-- y rpc_crear_pedido.sql.

-- ── Suscripciones: datos de entrega ─────────────────────────────────────
alter table suscripciones add column if not exists direccion_entrega text;
alter table suscripciones add column if not exists zona_reparto_id uuid references zonas_reparto(id);
alter table suscripciones add column if not exists metodo_pago metodo_pago;

-- Pool de temáticas que el cliente eligió para su suscripción — en cada
-- entrega se sortea una de acá (ver generar_pedido_suscripcion más abajo).
create table if not exists suscripcion_tematicas (
  suscripcion_id uuid not null references suscripciones(id) on delete cascade,
  tematica_id uuid not null references tematicas(id),
  primary key (suscripcion_id, tematica_id)
);

alter table suscripcion_tematicas enable row level security;

create policy "suscripcion_tematicas_select_own_or_admin" on suscripcion_tematicas
  for select using (
    exists (
      select 1 from suscripciones s
      where s.id = suscripcion_tematicas.suscripcion_id
        and (s.usuario_id = auth.uid() or is_admin())
    )
  );

-- ── Pedidos: de qué suscripción vino (si vino de una) ──────────────────
alter table pedidos add column if not exists suscripcion_id uuid references suscripciones(id);

-- ── crear_suscripcion: arma una suscripción con su pool de temáticas ───
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
begin
  if v_usuario_id is null then
    raise exception 'Tenés que iniciar sesión para suscribirte.';
  end if;

  if array_length(p_tematica_ids, 1) is null or array_length(p_tematica_ids, 1) < 2 then
    raise exception 'Elegí al menos 2 temáticas para que la suscripción tenga sorpresa.';
  end if;

  insert into suscripciones (
    usuario_id, caja_id, frecuencia_dias, metodo_pago,
    direccion_entrega, zona_reparto_id, proxima_entrega, estado
  )
  values (
    v_usuario_id, p_caja_id, p_frecuencia_dias, p_metodo_pago,
    p_direccion_entrega, p_zona_reparto_id, current_date + p_frecuencia_dias, 'activa'
  )
  returning id into v_suscripcion_id;

  foreach v_tematica_id in array p_tematica_ids loop
    insert into suscripcion_tematicas (suscripcion_id, tematica_id)
    values (v_suscripcion_id, v_tematica_id);
  end loop;

  return v_suscripcion_id;
end;
$$;

grant execute on function crear_suscripcion(uuid, int, metodo_pago, text, uuid, uuid[]) to authenticated;

-- ── generar_pedido_suscripcion: sortea temática y crea el pedido ───────
-- Solo la puede llamar un admin (flujo manual: el admin la dispara cuando
-- corresponde). Sortea entre el pool de temáticas de la suscripción,
-- evitando repetir alguna que haya salido en las últimas (pool - 1)
-- entregas — así no se repite ninguna hasta haber salido todas.
create or replace function generar_pedido_suscripcion(p_suscripcion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_caja record;
  v_costo_envio numeric := 0;
  v_pool_size int;
  v_tematica_id uuid;
  v_pedido_id uuid;
begin
  if not is_admin() then
    raise exception 'Solo un admin puede generar el pedido de una suscripción.';
  end if;

  select * into v_sub from suscripciones where id = p_suscripcion_id;

  if v_sub is null then
    raise exception 'Suscripción no encontrada.';
  end if;

  if v_sub.estado != 'activa' then
    raise exception 'La suscripción no está activa.';
  end if;

  select count(*) into v_pool_size from suscripcion_tematicas where suscripcion_id = p_suscripcion_id;

  if v_pool_size = 0 then
    raise exception 'Esta suscripción no tiene temáticas elegidas.';
  end if;

  select tematica_id into v_tematica_id
  from suscripcion_tematicas st
  where st.suscripcion_id = p_suscripcion_id
    and st.tematica_id not in (
      select p.tematica_id from pedidos p
      where p.suscripcion_id = p_suscripcion_id
      order by p.creado_en desc
      limit greatest(v_pool_size - 1, 0)
    )
  order by random()
  limit 1;

  if v_tematica_id is null then
    select tematica_id into v_tematica_id
    from suscripcion_tematicas
    where suscripcion_id = p_suscripcion_id
    order by random()
    limit 1;
  end if;

  select * into v_caja from cajas where id = v_sub.caja_id;

  if v_sub.zona_reparto_id is not null then
    select costo_envio into v_costo_envio from zonas_reparto where id = v_sub.zona_reparto_id;
  end if;

  insert into pedidos (
    usuario_id, caja_id, tematica_id, tipo, metodo_pago,
    direccion_entrega, zona_reparto_id, subtotal, costo_envio, total,
    estado, suscripcion_id
  )
  values (
    v_sub.usuario_id, v_sub.caja_id, v_tematica_id, 'suscripcion', v_sub.metodo_pago,
    v_sub.direccion_entrega, v_sub.zona_reparto_id, v_caja.precio, v_costo_envio, v_caja.precio + v_costo_envio,
    'armado', p_suscripcion_id
  )
  returning id into v_pedido_id;

  update suscripciones
  set proxima_entrega = coalesce(proxima_entrega, current_date) + frecuencia_dias
  where id = p_suscripcion_id;

  return v_pedido_id;
end;
$$;

grant execute on function generar_pedido_suscripcion(uuid) to authenticated;

-- ── crear_pedido: ahora también guarda la zona de reparto elegida ──────
-- Se dropea y se recrea porque agregar un parámetro cambia la firma de
-- la función (CREATE OR REPLACE no lo permite si cambia la lista de
-- argumentos existente).
drop function if exists crear_pedido(uuid, uuid, metodo_pago, text, numeric, numeric, numeric, jsonb);

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
  v_pedido_id uuid;
  v_item jsonb;
  v_stock int;
  v_producto_id uuid;
  v_cantidad int;
begin
  if v_usuario_id is null then
    raise exception 'Tenés que iniciar sesión para hacer un pedido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::int;

    select stock_actual into v_stock from productos where id = v_producto_id for update;

    if v_stock is null then
      raise exception 'Producto no encontrado.';
    end if;

    if v_stock < v_cantidad then
      raise exception 'No hay stock suficiente de uno de los productos elegidos.';
    end if;
  end loop;

  insert into pedidos (
    usuario_id, caja_id, tematica_id, metodo_pago,
    direccion_entrega, zona_reparto_id, subtotal, costo_envio, total
  )
  values (
    v_usuario_id, p_caja_id, p_tematica_id, p_metodo_pago,
    p_direccion_entrega, p_zona_reparto_id, p_subtotal, p_costo_envio, p_total
  )
  returning id into v_pedido_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::int;

    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    values (v_pedido_id, v_producto_id, v_cantidad, (v_item->>'precio_unitario')::numeric);

    update productos
    set stock_actual = stock_actual - v_cantidad
    where id = v_producto_id;
  end loop;

  return v_pedido_id;
end;
$$;

grant execute on function crear_pedido(uuid, uuid, metodo_pago, text, numeric, numeric, numeric, jsonb, uuid) to authenticated;

-- ── Zonas de reparto: catálogo inicial de ejemplo ───────────────────────
-- Reemplazar por las zonas y costos reales de Cañada de Gómez cuando los tengas.
insert into zonas_reparto (nombre, costo_envio, disponible)
select * from (values
  ('Centro', 0, true),
  ('Zona Norte', 400, true),
  ('Zona Sur', 400, true),
  ('Zona Oeste', 600, true)
) as v(nombre, costo_envio, disponible)
where not exists (select 1 from zonas_reparto);

-- ── Comprobante de transferencia: bucket de Storage privado ─────────────
-- Cada archivo se guarda como "<user_id>/<pedido_id>.<ext>" — las políticas
-- de abajo usan esa carpeta para saber de quién es cada comprobante.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

create policy "comprobantes_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "comprobantes_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
