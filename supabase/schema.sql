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
-- 2. Zones de l'entrepôt (le "plan" simplifié)
--    pos_x / pos_y / largeur / hauteur = position sur une grille (voir WarehouseMap).
-- ----------------------------------------------------------------------------
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,        -- ex: "A12"
  label text,                       -- ex: "Allée 1 - Casier 2" (facultatif)
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
-- 3. Produits
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  ean text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

alter table public.products enable row level security;

create policy "products_select_all" on public.products
  for select using (auth.uid() is not null);

-- Employé ET admin peuvent créer un nouveau produit (comme sur le Google Sheet).
create policy "products_insert_all" on public.products
  for insert with check (auth.uid() is not null);

-- Modifier/supprimer un produit reste réservé à l'admin/direction.
create policy "products_update_admin" on public.products
  for update using (public.is_admin());
create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Emplacements d'un produit (un produit peut avoir plusieurs zones)
-- ----------------------------------------------------------------------------
create table if not exists public.product_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles (id),
  unique (product_id, zone_id)
);

alter table public.product_locations enable row level security;

create policy "product_locations_select_all" on public.product_locations
  for select using (auth.uid() is not null);

-- Employé ET admin peuvent AJOUTER un emplacement à un produit.
create policy "product_locations_insert_all" on public.product_locations
  for insert with check (auth.uid() is not null);

-- Seul un admin peut SUPPRIMER un emplacement (rangement retiré/déplacé).
create policy "product_locations_delete_admin" on public.product_locations
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Index utiles
-- ----------------------------------------------------------------------------
create index if not exists idx_products_ean on public.products (ean);
create index if not exists idx_product_locations_product on public.product_locations (product_id);
create index if not exists idx_product_locations_zone on public.product_locations (zone_id);

-- ----------------------------------------------------------------------------
-- 6. Quelques zones d'exemple pour démarrer (à adapter/supprimer dans l'admin)
-- ----------------------------------------------------------------------------
insert into public.zones (code, label, pos_x, pos_y, largeur, hauteur, couleur) values
  ('A12', 'Allée A - Casier 12', 0, 0, 1, 1, '#E2001A'),
  ('B03', 'Allée B - Casier 3',  1, 0, 1, 1, '#E2001A'),
  ('C05', 'Allée C - Casier 5',  2, 0, 1, 1, '#E2001A')
on conflict (code) do nothing;

-- ============================================================================
-- Après avoir exécuté ce script, crée ton premier compte admin :
-- 1. Fichier DEPLOIEMENT.md, section "Créer le premier compte admin".
-- ============================================================================
