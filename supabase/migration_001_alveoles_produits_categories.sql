-- ============================================================================
-- BUT Dépôt — migration 001 : alvéoles, catégories, produits, emplacements
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- ADDITIF et sûr à rejouer plusieurs fois : ne touche pas aux tables/données
-- déjà en place (comptes, zones...), crée seulement ce qui manque encore.
--
-- Pourquoi ce script existe : ta base a été créée avec une version plus
-- ancienne du site (avant l'ajout des alvéoles précises, catégories,
-- fiches produit détaillées). "zones" et "profiles" existent déjà chez toi,
-- mais pas "alveoles", "categories", "products", etc. — d'où l'erreur
-- "relation public.alveoles does not exist". Ce script les crée, sans
-- toucher à tes zones ou comptes existants.
--
-- ⚠️ Exécute CE script avant migration_002_signalements_messages.sql (qui a
-- besoin que la table "alveoles" existe déjà). migration_003_categories.sql
-- n'est plus nécessaire après celui-ci (mais sans danger si tu le lances
-- quand même).
--
-- Mis à jour : "product_locations" pouvait lui aussi déjà exister dans une
-- forme plus ancienne (sans les colonnes product_id/alveole_id), ce qui
-- provoquait l'erreur "column pl.alveole_id does not exist". Corrigé —
-- si tu avais eu cette erreur, relance simplement ce script en entier
-- (Supabase annule tout le script si une ligne échoue, donc rien de ce qui
-- précédait la ligne en erreur n'a été créé — relancer depuis le début est
-- la bonne marche à suivre).
-- ============================================================================

create extension if not exists "pgcrypto";

-- Fonction utilitaire (si elle n'existe pas déjà) : l'utilisateur connecté
-- est-il admin ? Utilisée par toutes les policies "admin uniquement".
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Alvéoles : emplacement précis à l'intérieur d'une zone (ex: "F1-0-A").
-- ----------------------------------------------------------------------------
create table if not exists public.alveoles (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  code text not null unique,
  capacite_kg numeric,
  taille_palette_max text check (taille_palette_max in ('eur', 'centrale')),
  bloquee boolean not null default false,
  bloquee_motif text,
  bloquee_par uuid references public.profiles (id),
  bloquee_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.alveoles enable row level security;

drop policy if exists "alveoles_select_all" on public.alveoles;
create policy "alveoles_select_all" on public.alveoles
  for select using (auth.uid() is not null);
drop policy if exists "alveoles_insert_all" on public.alveoles;
create policy "alveoles_insert_all" on public.alveoles
  for insert with check (auth.uid() is not null);
drop policy if exists "alveoles_update_admin" on public.alveoles;
create policy "alveoles_update_admin" on public.alveoles
  for update using (public.is_admin());
drop policy if exists "alveoles_delete_admin" on public.alveoles;
create policy "alveoles_delete_admin" on public.alveoles
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Catégories de produits + zones autorisées pour chacune.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Produits
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  ean text not null unique,
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  poids_colis_kg numeric,
  colis_par_palette_eur integer,
  colis_par_palette_centrale integer,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

-- Au cas où la table products existait déjà (très ancienne version) mais
-- sans ces colonnes plus récentes.
alter table public.products add column if not exists category_id uuid references public.categories (id) on delete set null;
alter table public.products add column if not exists poids_colis_kg numeric;
alter table public.products add column if not exists colis_par_palette_eur integer;
alter table public.products add column if not exists colis_par_palette_centrale integer;

alter table public.products enable row level security;

drop policy if exists "products_select_all" on public.products;
create policy "products_select_all" on public.products
  for select using (auth.uid() is not null);
drop policy if exists "products_insert_all" on public.products;
create policy "products_insert_all" on public.products
  for insert with check (auth.uid() is not null);
drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin" on public.products
  for update using (public.is_admin());
drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Emplacements d'un produit : combien de colis dans telle alvéole.
-- ----------------------------------------------------------------------------
create table if not exists public.product_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  alveole_id uuid not null references public.alveoles (id) on delete cascade,
  colis integer not null default 0,
  type_palette text check (type_palette in ('eur', 'centrale')),
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles (id)
);

-- Au cas où product_locations existait déjà (très ancienne version, avant
-- les alvéoles précises) mais sans ces colonnes — c'est exactement ce qui
-- causait l'erreur "column pl.alveole_id does not exist".
alter table public.product_locations add column if not exists product_id uuid references public.products (id) on delete cascade;
alter table public.product_locations add column if not exists alveole_id uuid references public.alveoles (id) on delete cascade;
alter table public.product_locations add column if not exists colis integer not null default 0;
alter table public.product_locations add column if not exists type_palette text check (type_palette in ('eur', 'centrale'));
alter table public.product_locations add column if not exists added_at timestamptz not null default now();
alter table public.product_locations add column if not exists added_by uuid references public.profiles (id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_locations_product_alveole_key'
  ) then
    alter table public.product_locations
      add constraint product_locations_product_alveole_key unique (product_id, alveole_id);
  end if;
end $$;

alter table public.product_locations enable row level security;

drop policy if exists "product_locations_select_all" on public.product_locations;
create policy "product_locations_select_all" on public.product_locations
  for select using (auth.uid() is not null);
drop policy if exists "product_locations_insert_all" on public.product_locations;
create policy "product_locations_insert_all" on public.product_locations
  for insert with check (auth.uid() is not null);
drop policy if exists "product_locations_update_all" on public.product_locations;
create policy "product_locations_update_all" on public.product_locations
  for update using (auth.uid() is not null);
drop policy if exists "product_locations_delete_admin" on public.product_locations;
create policy "product_locations_delete_admin" on public.product_locations
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Vue : poids actuel et capacité restante de chaque alvéole.
-- ----------------------------------------------------------------------------
create or replace view public.alveole_occupancy
with (security_invoker = true) as
select
  a.id as alveole_id,
  a.zone_id,
  a.code,
  a.capacite_kg,
  coalesce(sum(pl.colis * coalesce(p.poids_colis_kg, 0)), 0) as poids_actuel_kg,
  count(pl.id) filter (where pl.colis > 0) as nb_produits_differents
from public.alveoles a
left join public.product_locations pl on pl.alveole_id = a.id
left join public.products p on p.id = pl.product_id
group by a.id;

-- ----------------------------------------------------------------------------
-- Index utiles
-- ----------------------------------------------------------------------------
create index if not exists idx_products_ean on public.products (ean);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_alveoles_zone on public.alveoles (zone_id);
create index if not exists idx_product_locations_product on public.product_locations (product_id);
create index if not exists idx_product_locations_alveole on public.product_locations (alveole_id);

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. Lance ensuite migration_002_signalements_messages.sql.
-- ============================================================================
