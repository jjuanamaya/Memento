-- Memento — Crea un pedido completo (pedido + items) y descuenta el stock
-- de cada producto, todo en una sola operación atómica (o se hace todo, o
-- no se hace nada). Reemplaza el guardado en dos pasos que hacía el
-- frontend antes, que no controlaba el stock disponible al momento de
-- confirmar la compra.

create or replace function crear_pedido(
  p_caja_id uuid,
  p_tematica_id uuid,
  p_metodo_pago metodo_pago,
  p_direccion_entrega text,
  p_subtotal numeric,
  p_costo_envio numeric,
  p_total numeric,
  p_items jsonb -- [{"producto_id": "...", "cantidad": 2, "precio_unitario": 800}, ...]
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

  -- Verificar stock de todos los productos antes de descontar nada.
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
    direccion_entrega, subtotal, costo_envio, total
  )
  values (
    v_usuario_id, p_caja_id, p_tematica_id, p_metodo_pago,
    p_direccion_entrega, p_subtotal, p_costo_envio, p_total
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

grant execute on function crear_pedido(uuid, uuid, metodo_pago, text, numeric, numeric, numeric, jsonb) to authenticated;
