-- Memento — Ajustes de precios y suscripciones (11/11/2026).
--
-- 1. Temática Personalizada: las cajas quedan sin precio base, así el cliente
--    paga solo los productos que elige (antes pagaba la caja + los productos
--    y salía casi el doble que una caja con temática).
-- 2. Suscripciones: el precio por entrega ya no es un monto fijo por
--    frecuencia. Es el precio de la caja elegida (promedio de las temáticas
--    elegidas para ese tamaño) menos un % de descuento por frecuencia.
-- 3. Cancelar un pedido generado por una suscripción devuelve esa entrega:
--    vuelve a quedar pendiente para generarla de nuevo.
--
-- Correr en el SQL Editor de Supabase DESPUÉS de migracion_correcciones.sql y
-- migracion_precio_tematicas.sql. Se corre de una sola vez y se puede repetir.
set lock_timeout = '5s';

-- ── 1. Personalizada sin precio base ────────────────────────────────────
-- (Valores anteriores: Clásica $15.000, Premium $20.999, Deluxe $30.000.)
-- Si querés cobrar el packaging, cargalo en Admin → Catálogo → Cajas.
update cajas set precio = 0 where precio <> 0;

-- ── 2. Precio de las suscripciones ──────────────────────────────────────
-- El precio fijo por frecuencia (columna "precio") deja de usarse.
alter table frecuencias_suscripcion add column if not exists descuento_porcentaje numeric(5, 2) not null default 0;

do $$ begin
  alter table frecuencias_suscripcion
    add constraint frecuencias_descuento_check check (descuento_porcentaje between 0 and 90);
exception when duplicate_object then null; end $$;

-- Cuánto sale una caja llenada con una temática (lo mismo que calcula
-- cotizar_cajas). Devuelve null si hoy no se puede armar o no tiene precio.
create or replace function precio_caja_tematica(p_caja_id uuid, p_tematica_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when cj.capacidad > 0
      and coalesce(sum(c.cantidad), 0) >= cj.capacidad
      and not coalesce(bool_or(p.costo <= 0 and p.precio <= 0), false)
    then round(sum(
      (case when p.costo > 0 then p.costo * (1 + cj.ganancia_porcentaje / 100) else p.precio end) * c.cantidad
    ))
  end
  from cajas cj
  left join lateral contenido_tematico(cj.capacidad, p_tematica_id) c on true
  left join productos p on p.id = c.producto_id
  where cj.id = p_caja_id
  group by cj.capacidad, cj.ganancia_porcentaje;
$$;

grant execute on function precio_caja_tematica(uuid, uuid) to anon, authenticated;

-- crear_suscripcion: ahora calcula el precio según la caja y las temáticas,
-- y recibe el precio que vio el cliente para no cobrarle otra cosa.
drop function if exists crear_suscripcion(uuid, int, metodo_pago, text, text, text, uuid[], text);

create or replace function crear_suscripcion(
  p_caja_id uuid,
  p_frecuencia_dias int,
  p_metodo_pago metodo_pago,
  p_tipo_entrega text,
  p_direccion_entrega text,
  p_comentario text,
  p_tematica_ids uuid[],
  p_comprobante_url text,
  p_precio_esperado numeric
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
  v_precio_caja numeric;
  v_descuento numeric;
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

  select descuento_porcentaje into v_descuento
  from frecuencias_suscripcion
  where dias = p_frecuencia_dias and activa = true;

  if not found then
    raise exception 'Esa frecuencia de envío ya no está disponible.';
  end if;

  -- Precio de la caja: promedio de lo que sale con cada temática elegida que
  -- hoy se puede armar. Queda fijo para toda la suscripción.
  select round(avg(x.precio)) into v_precio_caja
  from (
    select precio_caja_tematica(p_caja_id, t.id) as precio
    from (select distinct unnest(p_tematica_ids) as id) t
  ) x
  where x.precio is not null;

  if v_precio_caja is null then
    raise exception 'Hoy no hay stock para armar esa caja con las temáticas elegidas. Probá con otra caja u otras temáticas.';
  end if;

  v_precio := round(v_precio_caja * (1 - coalesce(v_descuento, 0) / 100));

  if p_precio_esperado is null or abs(p_precio_esperado - v_precio) > 1 then
    raise exception 'El precio de la suscripción cambió recién. Revisalo y confirmá de nuevo.';
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

grant execute on function crear_suscripcion(uuid, int, metodo_pago, text, text, text, uuid[], text, numeric) to authenticated;

-- ── 3. Cancelar un pedido de suscripción devuelve la entrega ────────────
-- Al generarlo, la próxima entrega se corrió un período: si el pedido se
-- cancela, vuelve atrás para poder generarlo de nuevo.
create or replace function devolver_entrega_suscripcion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'cancelado' and old.estado <> 'cancelado' and new.suscripcion_id is not null then
    update suscripciones
    set proxima_entrega = proxima_entrega - frecuencia_dias
    where id = new.suscripcion_id and proxima_entrega is not null;
  end if;
  return null;
end;
$$;

drop trigger if exists devolver_entrega_suscripcion on pedidos;
create trigger devolver_entrega_suscripcion
  after update of estado on pedidos
  for each row execute function devolver_entrega_suscripcion();

notify pgrst, 'reload schema';
