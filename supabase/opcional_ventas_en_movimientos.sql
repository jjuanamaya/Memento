-- Memento — OPCIONAL: que cada venta quede registrada en Stock → Movimientos.
-- Hoy crear_pedido descuenta el stock pero no deja registro, así que el
-- historial de movimientos no "cierra" con el stock real. Esto agrega una
-- salida automática por cada producto vendido (motivo: "Venta · pedido #...").
-- La web no necesita cambios: funciona igual con o sin esto.
-- Correr en el SQL Editor de Supabase (una sola vez alcanza; se puede repetir).

set lock_timeout = '5s';

create or replace function crear_pedido(
  p_caja_id uuid, p_tematica_id uuid, p_metodo_pago metodo_pago, p_direccion_entrega text,
  p_subtotal numeric, p_costo_envio numeric, p_total numeric, p_items jsonb,
  p_zona_reparto_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
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

  for v_item in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::int) as cantidad
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e group by 1
  loop
    if v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cantidad de producto inválida.';
    end if;
    select stock_actual, precio into v_stock, v_precio
    from productos where id = v_item.producto_id and activo for update;
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

  insert into pedidos (usuario_id, caja_id, tematica_id, metodo_pago, direccion_entrega,
                       zona_reparto_id, subtotal, costo_envio, total)
  values (v_usuario_id, p_caja_id, p_tematica_id, p_metodo_pago, trim(p_direccion_entrega),
          p_zona_reparto_id, v_subtotal, v_costo_envio, v_caja.precio + v_subtotal + v_costo_envio)
  returning id into v_pedido_id;

  for v_item in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::int) as cantidad
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e group by 1
  loop
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    select v_pedido_id, p.id, v_item.cantidad, p.precio from productos p where p.id = v_item.producto_id;

    update productos set stock_actual = stock_actual - v_item.cantidad where id = v_item.producto_id;

    insert into movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id)
    values (v_item.producto_id, 'salida', v_item.cantidad,
            'Venta · pedido #' || left(v_pedido_id::text, 8), v_usuario_id);
  end loop;

  return v_pedido_id;
end;
$$;

grant execute on function crear_pedido(uuid, uuid, metodo_pago, text, numeric, numeric, numeric, jsonb, uuid) to authenticated;
