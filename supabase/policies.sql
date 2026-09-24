-- Memento — Políticas de Row Level Security (RLS)
-- Correr DESPUÉS de schema.sql (con RLS habilitado en la creación de tablas).
-- Sin estas políticas, con RLS activado, nadie puede leer ni escribir nada.

-- Función auxiliar para chequear si el usuario autenticado es admin,
-- sin caer en recursión al consultar la propia tabla "perfiles".
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfiles where id = auth.uid() and rol = 'admin'
  );
$$;

-- ── Perfiles ────────────────────────────────────────────────────────────
alter table perfiles enable row level security;

create policy "perfiles_select_own_or_admin" on perfiles
  for select using (auth.uid() = id or is_admin());

create policy "perfiles_insert_own" on perfiles
  for insert with check (auth.uid() = id);

create policy "perfiles_update_own_or_admin" on perfiles
  for update using (auth.uid() = id or is_admin());

-- ── Catálogo: lectura pública, escritura solo admin ────────────────────
alter table cajas enable row level security;
create policy "cajas_public_read" on cajas for select using (true);
create policy "cajas_admin_manage" on cajas for all using (is_admin()) with check (is_admin());

alter table tematicas enable row level security;
create policy "tematicas_public_read" on tematicas for select using (true);
create policy "tematicas_admin_manage" on tematicas for all using (is_admin()) with check (is_admin());

alter table productos enable row level security;
create policy "productos_public_read" on productos for select using (true);
create policy "productos_admin_manage" on productos for all using (is_admin()) with check (is_admin());

alter table combos enable row level security;
create policy "combos_public_read" on combos for select using (true);
create policy "combos_admin_manage" on combos for all using (is_admin()) with check (is_admin());

alter table combo_productos enable row level security;
create policy "combo_productos_public_read" on combo_productos for select using (true);
create policy "combo_productos_admin_manage" on combo_productos for all using (is_admin()) with check (is_admin());

alter table zonas_reparto enable row level security;
create policy "zonas_reparto_public_read" on zonas_reparto for select using (true);
create policy "zonas_reparto_admin_manage" on zonas_reparto for all using (is_admin()) with check (is_admin());

-- ── Pedidos: cada cliente ve y crea los suyos, admin ve y gestiona todos ─
alter table pedidos enable row level security;

create policy "pedidos_select_own_or_admin" on pedidos
  for select using (auth.uid() = usuario_id or is_admin());

create policy "pedidos_insert_own" on pedidos
  for insert with check (auth.uid() = usuario_id);

create policy "pedidos_update_own_or_admin" on pedidos
  for update using (auth.uid() = usuario_id or is_admin());

alter table pedido_items enable row level security;

create policy "pedido_items_select" on pedido_items
  for select using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_items.pedido_id
        and (p.usuario_id = auth.uid() or is_admin())
    )
  );

create policy "pedido_items_insert" on pedido_items
  for insert with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_items.pedido_id
        and p.usuario_id = auth.uid()
    )
  );

-- ── Suscripciones: mismo criterio que pedidos ───────────────────────────
alter table suscripciones enable row level security;

create policy "suscripciones_select_own_or_admin" on suscripciones
  for select using (auth.uid() = usuario_id or is_admin());

create policy "suscripciones_insert_own" on suscripciones
  for insert with check (auth.uid() = usuario_id);

create policy "suscripciones_update_own_or_admin" on suscripciones
  for update using (auth.uid() = usuario_id or is_admin());
