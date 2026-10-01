-- Memento — Precio por frecuencia de suscripción + imágenes de catálogo.
-- Correr en el SQL Editor de Supabase, DESPUÉS de schema.sql, policies.sql,
-- rpc_crear_pedido.sql y migracion_negocio.sql.
--
-- Nota: migracion_negocio.sql crea crear_suscripcion y
-- generar_pedido_suscripcion, pero en este proyecto nunca había llegado a
-- correrse esa parte — por eso suscribirse daba "no se pudo completar la
-- suscripción" (la función no existía en la base). Este archivo las vuelve
-- a crear (con el agregado del precio por frecuencia), así que soluciona
-- ese bug de paso.

-- ── Frecuencias de envío: cada una con su propio precio ─────────────────
create table if not exists frecuencias_suscripcion (
  id uuid primary key default gen_random_uuid(),
  dias int not null unique,
  etiqueta text not null,
  precio numeric(10, 2) not null default 0,
  activa boolean not null default true,
  orden int not null default 0
);

alter table frecuencias_suscripcion enable row level security;

create policy "frecuencias_suscripcion_public_read" on frecuencias_suscripcion
  for select using (true);

create policy "frecuencias_suscripcion_admin_manage" on frecuencias_suscripcion
  for all using (is_admin()) with check (is_admin());

-- Precios de partida — ENTRÁ a Admin → Catálogo → Frecuencias y ajustalos
-- a lo que realmente quieras cobrar, esto es solo para no arrancar en $0.
insert into frecuencias_suscripcion (dias, etiqueta, precio, orden)
select * from (values
  (7, 'Cada semana', 3500, 1),
  (15, 'Cada 15 días', 5000, 2),
  (30, 'Cada mes', 8000, 3)
) as v(dias, etiqueta, precio, orden)
where not exists (select 1 from frecuencias_suscripcion);

-- ── Suscripciones: guardan el precio vigente al momento de suscribirse ──
-- (si después cambiás el precio de una frecuencia, no afecta retroactivamente
-- a quien ya estaba suscripto).
alter table suscripciones add column if not exists precio numeric(10, 2) not null default 0;

-- ── Storage: imágenes de cajas y temáticas (bucket público) ─────────────
insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do nothing;

create policy "catalogo_public_read" on storage.objects
  for select using (bucket_id = 'catalogo');

create policy "catalogo_admin_write" on storage.objects
  for insert with check (bucket_id = 'catalogo' and is_admin());

create policy "catalogo_admin_update" on storage.objects
  for update using (bucket_id = 'catalogo' and is_admin());

create policy "catalogo_admin_delete" on storage.objects
  for delete using (bucket_id = 'catalogo' and is_admin());

-- ── crear_suscripcion: ahora toma el precio de la frecuencia elegida ────
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

  if array_length(p_tematica_ids, 1) is null or array_length(p_tematica_ids, 1) < 2 then
    raise exception 'Elegí al menos 2 temáticas para que la suscripción tenga sorpresa.';
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

-- ── generar_pedido_suscripcion: cobra el precio de la suscripción, no el
--    precio de la caja ──────────────────────────────────────────────────
create or replace function generar_pedido_suscripcion(p_suscripcion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
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
    v_sub.direccion_entrega, v_sub.zona_reparto_id, v_sub.precio, v_costo_envio, v_sub.precio + v_costo_envio,
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
