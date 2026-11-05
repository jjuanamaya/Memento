-- Memento — Precio de las cajas temáticas sin costos cargados (5/11/2026).
--
-- Correr DESPUÉS de migracion_correcciones.sql (ya corrida). Si un producto
-- todavía no tiene costo cargado, la caja usa su precio de venta en vez de
-- quedar "Próximamente". Cuando se carga el costo, pasa a costo + % de
-- ganancia de la caja. Se puede correr de una sola vez y repetir sin problema.
set lock_timeout = '5s';

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

notify pgrst, 'reload schema';
