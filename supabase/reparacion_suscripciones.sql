-- Memento — Reparación: crea lo que migracion_negocio.sql debía crear y nunca
-- llegó a correrse en la base (por eso suscribirse fallaba y los comprobantes
-- de transferencia no se guardaban). Se puede correr más de una vez.

-- ── Suscripciones: datos de entrega ─────────────────────────────────────
alter table suscripciones add column if not exists direccion_entrega text;
alter table suscripciones add column if not exists zona_reparto_id uuid references zonas_reparto(id);
alter table suscripciones add column if not exists metodo_pago metodo_pago;

-- ── Temáticas elegidas por cada suscripción ─────────────────────────────
create table if not exists suscripcion_tematicas (
  suscripcion_id uuid not null references suscripciones(id) on delete cascade,
  tematica_id uuid not null references tematicas(id),
  primary key (suscripcion_id, tematica_id)
);

alter table suscripcion_tematicas enable row level security;

drop policy if exists "suscripcion_tematicas_select_own_or_admin" on suscripcion_tematicas;
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

-- ── Comprobantes de transferencia: bucket privado ───────────────────────
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "comprobantes_insert_own" on storage.objects;
create policy "comprobantes_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "comprobantes_select_own_or_admin" on storage.objects;
create policy "comprobantes_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

-- Le avisa a la API que recargue la estructura de la base.
notify pgrst, 'reload schema';
