-- ============================================================================
-- BUT Dépôt — schéma de base de données
-- À exécuter une seule fois dans Supabase : Dashboard > SQL Editor > New query
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profils utilisateurs (étend auth.users géré par Supabase Auth)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'employe' check (role in ('employe', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Fonction utilitaire : l'utilisateur connecté est-il admin ?
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

-- Un utilisateur voit son propre profil ; un admin voit tout le monde.
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Seul un admin peut changer le rôle / modifier un autre profil.
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- Un utilisateur peut modifier son propre nom (pas son rôle : voir trigger plus bas si besoin).
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- Création automatique du profil à l'inscription d'un compte (rôle par défaut = employe)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'employe')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Zones de l'entrepôt (les grandes "allées" affichées sur le plan)
--    pos_x / pos_y / largeur / hauteur = position sur une grille (voir WarehouseMap).
--    Chaque zone contient ensuite plusieurs alvéoles précises (section 3).
-- ----------------------------------------------------------------------------
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,        -- ex: "F" (allée F)
  label text,                       -- ex: "Allée F - Literie" (facultatif)
  pos_x integer not null default 0,
  pos_y integer not null default 0,
  largeur integer not null default 1,
  hauteur integer not null default 1,
  couleur text not null default '#E2001A',
  created_at timestamptz not null default now()
);

alter table public.zones enable row level security;

create policy "zones_select_all" on public.zones
  for select using (auth.uid() is not null);

create policy "zones_write_admin" on public.zones
  for insert with check (public.is_admin());
create policy "zones_update_admin" on public.zones
  for update using (public.is_admin());
create policy "zones_delete_admin" on public.zones
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Alvéoles : emplacement précis à l'intérieur d'une zone (ex: "F1-0-A").
--    capacite_kg = limite de poids de l'alvéole (sécurité des lisses) ;
--    laisser vide tant que la limite n'est pas connue (pas d'alerte affichée).
-- ----------------------------------------------------------------------------
-- taille_palette_max : plus grande palette qui rentre physiquement dans
-- l'alvéole. 'eur' = palette EUR (1200x800mm) seulement ; 'centrale' =
-- accepte aussi la palette centrale/à chevron (2400x900mm), donc l'EUR
-- aussi. Laisser vide tant que ce n'est pas précisé = pas de restriction
-- affichée (les deux tailles sont proposées).
create table if not exists public.alveoles (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  code text not null unique,        -- ex: "F1-0-A"
  capacite_kg numeric,
  taille_palette_max text check (taille_palette_max in ('eur', 'centrale')),
  created_at timestamptz not null default now()
);

alter table public.alveoles enable row level security;

create policy "alveoles_select_all" on public.alveoles
  for select using (auth.uid() is not null);

-- Un employé peut créer une alvéole à la volée en rangeant un produit
-- (comme les zones avant) ; la modifier (capacité, etc.) reste admin.
create policy "alveoles_insert_all" on public.alveoles
  for insert with check (auth.uid() is not null);
create policy "alveoles_update_admin" on public.alveoles
  for update using (public.is_admin());
create policy "alveoles_delete_admin" on public.alveoles
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Catégories de produits (ex: "Literie") + zones autorisées pour chacune.
--    Sert à suggérer automatiquement les bonnes zones à l'employé qui range
--    un produit (ex: tous les lits vont en zone F à H).
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_all" on public.categories
  for select using (auth.uid() is not null);
create policy "categories_write_admin" on public.categories
  for insert with check (public.is_admin());
create policy "categories_update_admin" on public.categories
  for update using (public.is_admin());
create policy "categories_delete_admin" on public.categories
  for delete using (public.is_admin());

create table if not exists public.category_zones (
  category_id uuid not null references public.categories (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  primary key (category_id, zone_id)
);

alter table public.category_zones enable row level security;

create policy "category_zones_select_all" on public.category_zones
  for select using (auth.uid() is not null);
create policy "category_zones_write_admin" on public.category_zones
  for insert with check (public.is_admin());
create policy "category_zones_delete_admin" on public.category_zones
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Produits
--    poids_colis_kg = poids d'UN colis, quel que soit le type de palette.
--    colis_par_palette_eur / _centrale = nombre de colis sur une palette
--    complète de ce type (une palette centrale, plus grande, en contient
--    en général davantage). Sert à calculer le poids d'une palette pour la
--    comparer à la capacité de l'alvéole choisie.
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

alter table public.products enable row level security;

create policy "products_select_all" on public.products
  for select using (auth.uid() is not null);

-- Employé ET admin peuvent créer un nouveau produit (comme sur le Google Sheet).
create policy "products_insert_all" on public.products
  for insert with check (auth.uid() is not null);

-- Modifier un produit (nom, catégorie, poids/palette...) reste réservé à
-- l'admin/direction : ces infos servent aux calculs de sécurité (lisses),
-- une erreur de saisie ne doit pas pouvoir venir de n'importe quel compte.
create policy "products_update_admin" on public.products
  for update using (public.is_admin());
create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. Emplacements d'un produit : combien de colis de ce produit se trouvent
--    dans telle alvéole (un produit peut être réparti sur plusieurs alvéoles).
-- ----------------------------------------------------------------------------
create table if not exists public.product_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  alveole_id uuid not null references public.alveoles (id) on delete cascade,
  colis integer not null default 0,
  -- Type de la dernière palette déposée ici (informatif ; le poids total
  -- de l'alvéole se base sur "colis", valable quel que soit le type).
  type_palette text check (type_palette in ('eur', 'centrale')),
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles (id),
  unique (product_id, alveole_id)
);

alter table public.product_locations enable row level security;

create policy "product_locations_select_all" on public.product_locations
  for select using (auth.uid() is not null);

-- Employé ET admin peuvent AJOUTER/AUGMENTER un emplacement (réception).
create policy "product_locations_insert_all" on public.product_locations
  for insert with check (auth.uid() is not null);
create policy "product_locations_update_all" on public.product_locations
  for update using (auth.uid() is not null);

-- Seul un admin peut SUPPRIMER un emplacement (rangement retiré/déplacé).
create policy "product_locations_delete_admin" on public.product_locations
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. Vue : poids actuel et capacité restante de chaque alvéole.
--    security_invoker = les policies RLS ci-dessus s'appliquent normalement.
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
-- 8. Index utiles
-- ----------------------------------------------------------------------------
create index if not exists idx_products_ean on public.products (ean);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_alveoles_zone on public.alveoles (zone_id);
create index if not exists idx_product_locations_product on public.product_locations (product_id);
create index if not exists idx_product_locations_alveole on public.product_locations (alveole_id);

-- ----------------------------------------------------------------------------
-- 9. Exemple pour démarrer (à adapter/supprimer dans l'admin)
-- ----------------------------------------------------------------------------
insert into public.zones (code, label, pos_x, pos_y, largeur, hauteur, couleur) values
  ('A', 'Allée A', 0, 0, 1, 1, '#E2001A'),
  ('B', 'Allée B', 1, 0, 1, 1, '#E2001A'),
  ('C', 'Allée C', 2, 0, 1, 1, '#E2001A')
on conflict (code) do nothing;

insert into public.alveoles (zone_id, code, capacite_kg)
select z.id, v.code, v.capacite_kg
from (values
  ('A12', 'A', 500),
  ('B03', 'B', 500),
  ('C05', 'C', 500)
) as v(code, zone_code, capacite_kg)
join public.zones z on z.code = v.zone_code
on conflict (code) do nothing;

-- ============================================================================
-- Après avoir exécuté ce script, crée ton premier compte admin :
-- 1. Fichier DEPLOIEMENT.md, section "Créer le premier compte admin".
-- ============================================================================
