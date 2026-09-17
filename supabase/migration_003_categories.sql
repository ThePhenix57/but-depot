-- ============================================================================
-- BUT Dépôt — migration 003 : s'assure que les catégories existent
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sans risque à rejouer plusieurs fois : ne touche à rien
-- d'existant, crée seulement ce qui manquerait encore.
--
-- ℹ️ Si tu as déjà lancé migration_001_alveoles_produits_categories.sql,
-- ce script-ci ne fait plus rien de nouveau (categories existe déjà) — pas
-- besoin de le lancer. Il reste ici seulement pour les cas où seule cette
-- table-là posait problème.
--
-- Sert à corriger l'erreur "Could not find the table 'public.categories' in
-- the schema cache" dans /admin/categories. Cette erreur a deux causes
-- possibles, et ce script règle les deux d'un coup :
--   1. La table categories n'a jamais été créée sur cette base (schema.sql
--      exécuté avant l'ajout des catégories) → elle est créée ci-dessous.
--   2. La table existe déjà mais l'API (PostgREST) a encore l'ancienne
--      version du schéma en cache → le NOTIFY tout en bas force son
--      rechargement.
-- ============================================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories
  for select using (auth.uid() is not null);
drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin" on public.categories
  for insert with check (public.is_admin());
drop policy if exists "categories_update_admin" on public.categories;
create policy "categories_update_admin" on public.categories
  for update using (public.is_admin());
drop policy if exists "categories_delete_admin" on public.categories;
create policy "categories_delete_admin" on public.categories
  for delete using (public.is_admin());

create table if not exists public.category_zones (
  category_id uuid not null references public.categories (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  primary key (category_id, zone_id)
);

alter table public.category_zones enable row level security;

drop policy if exists "category_zones_select_all" on public.category_zones;
create policy "category_zones_select_all" on public.category_zones
  for select using (auth.uid() is not null);
drop policy if exists "category_zones_write_admin" on public.category_zones;
create policy "category_zones_write_admin" on public.category_zones
  for insert with check (public.is_admin());
drop policy if exists "category_zones_delete_admin" on public.category_zones;
create policy "category_zones_delete_admin" on public.category_zones
  for delete using (public.is_admin());

-- Le lien produit → catégorie, au cas où lui aussi manquerait — protégé par
-- une vérification d'existence de la table : si tu lances ce script seul,
-- sans avoir jamais exécuté migration_001 sur une base très ancienne (qui
-- n'a même pas encore "products"), ça ne doit pas faire échouer le script.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'products'
  ) then
    alter table public.products add column if not exists category_id uuid references public.categories (id) on delete set null;
  end if;
end $$;

-- Force l'API à relire le schéma tout de suite (sinon elle peut mettre
-- jusqu'à une minute à s'en rendre compte toute seule).
notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. Recharge la page /admin/categories (ou attends 10-20 secondes) :
-- l'erreur doit avoir disparu.
-- ============================================================================
