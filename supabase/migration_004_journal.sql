-- ============================================================================
-- BUT Dépôt — migration 004 : journal des rangements (réservé aux admins)
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Contrairement à product_locations (qui ne garde que le TOTAL actuel par
-- produit/alvéole, écrasé à chaque ajout), cette table garde une ligne par
-- action de rangement : qui a rangé quoi, où, quand, combien de colis. Sert
-- de journal/historique, visible uniquement par les comptes admin.
-- ============================================================================

create table if not exists public.mouvements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  alveole_id uuid not null references public.alveoles (id) on delete cascade,
  colis integer not null,
  type_palette text check (type_palette in ('eur', 'centrale')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.mouvements enable row level security;

-- Lecture réservée aux admins — c'est un journal interne, pas un outil du
-- quotidien pour les employés.
drop policy if exists "mouvements_select_admin" on public.mouvements;
create policy "mouvements_select_admin" on public.mouvements
  for select using (public.is_admin());

-- Écriture : n'importe quel compte connecté peut enregistrer SON PROPRE
-- rangement (c'est le site, via /api/rangement, qui insère ces lignes
-- automatiquement — jamais l'employé directement).
drop policy if exists "mouvements_insert_self" on public.mouvements;
create policy "mouvements_insert_self" on public.mouvements
  for insert with check (created_by = auth.uid());

create index if not exists idx_mouvements_created_at on public.mouvements (created_at desc);
create index if not exists idx_mouvements_product on public.mouvements (product_id);

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. La page /admin/journal (visible uniquement aux admins) utilise
-- directement cette table.
-- ============================================================================
