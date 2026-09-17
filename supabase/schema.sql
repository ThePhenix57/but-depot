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
  -- 'dev' : peut créer des zones/alvéoles/catégories et toucher au plan de
  -- l'entrepôt, mais ne peut rien supprimer et n'a accès à rien d'autre
  -- côté admin (voir migration_019_role_dev.sql).
  role text not null default 'employe' check (role in ('employe', 'admin', 'dev')),
  -- Facultative, définie par un admin (/admin/employes) — sert à mettre en
  -- avant l'anniversaire de chacun sur la page d'accueil.
  date_naissance date,
  -- Accès à la section SAV (/sav) pour un compte "employe" — case à cocher
  -- par un admin sur /admin/employes. Admin et dev y ont toujours accès
  -- (voir public.a_acces_sav() plus bas), cette colonne ne sert que pour un
  -- employé précis. Voir migration_020_sav.sql.
  acces_sav boolean not null default false,
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

-- Fonction utilitaire séparée : admin OU dev — sert uniquement aux quelques
-- actions de création que le rôle dev peut aussi faire (zones, rectangles
-- du plan, alvéoles, catégories). is_admin() ci-dessus reste strictement
-- réservée aux vrais admins pour tout le reste (suppressions, journal,
-- planning, employés...).
create or replace function public.is_admin_ou_dev()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'dev')
  );
$$;

-- Tout compte connecté peut voir la liste des collègues (nom, rôle) — sert
-- d'annuaire pour la messagerie directe. Pas de donnée sensible exposée.
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

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
  -- Position/taille en % de la photo du plan (0-100), dessinées au
  -- clic-glisser dans /admin/zones. Restent vides tant que la zone n'a pas
  -- encore été placée sur le plan.
  pos_x_pct numeric,
  pos_y_pct numeric,
  largeur_pct numeric,
  hauteur_pct numeric,
  couleur text not null default '#E2001A',
  -- Sur le terrain le numéro de travée augmente en s'éloignant de
  -- l'accueil, dans un sens qui dépend de l'orientation de l'allée sur le
  -- plan — ce réglage permet à l'aperçu d'afficher les travées dans le bon
  -- sens (voir migration_012).
  ordre_inverse boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.zones enable row level security;

create policy "zones_select_all" on public.zones
  for select using (auth.uid() is not null);

-- Dev peut créer/modifier une zone (ex: "toucher au plan"), pas la
-- supprimer (une suppression de zone efface aussi ses alvéoles en cascade).
create policy "zones_write_admin" on public.zones
  for insert with check (public.is_admin_ou_dev());
create policy "zones_update_admin" on public.zones
  for update using (public.is_admin_ou_dev());
create policy "zones_delete_admin" on public.zones
  for delete using (public.is_admin());

-- Une zone peut couvrir plusieurs rectangles séparés sur la photo du plan
-- (ex: les racks E à M interrompus au milieu par une allée de circulation).
create table if not exists public.zone_rects (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  pos_x_pct numeric not null,
  pos_y_pct numeric not null,
  largeur_pct numeric not null,
  hauteur_pct numeric not null,
  created_at timestamptz not null default now()
);

alter table public.zone_rects enable row level security;

create policy "zone_rects_select_all" on public.zone_rects
  for select using (auth.uid() is not null);
-- Dev peut ajouter/retirer un rectangle : ça fait partie de "toucher au
-- plan" et c'est sans risque (pas de cascade sur les alvéoles).
create policy "zone_rects_insert_admin" on public.zone_rects
  for insert with check (public.is_admin_ou_dev());
create policy "zone_rects_delete_admin" on public.zone_rects
  for delete using (public.is_admin_ou_dev());

create index if not exists idx_zone_rects_zone on public.zone_rects (zone_id);

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
  -- Blocage (ex: lisse cassée) : reste bloquée jusqu'à déblocage manuel par un admin.
  bloquee boolean not null default false,
  bloquee_motif text,
  bloquee_par uuid references public.profiles (id),
  bloquee_at timestamptz,
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
-- Dev peut créer une catégorie, pas la supprimer ni la modifier.
create policy "categories_write_admin" on public.categories
  for insert with check (public.is_admin_ou_dev());
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
  for insert with check (public.is_admin_ou_dev());
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
  -- Simple conseil (pas une règle bloquante) : quel type de palette
  -- privilégier pour décharger/ranger ce produit.
  palette_conseillee text check (palette_conseillee is null or palette_conseillee in ('eur', 'centrale')),
  -- Meuble livré en plusieurs colis sous le même EAN-13 : chaque colis
  -- porte un code plus long (EAN-13 + 2 chiffres de numéro de colis collés
  -- derrière). Voir migration_022_ean_multi_colis.sql.
  colis_multiples boolean not null default false,
  nb_colis_par_meuble integer,
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
  -- Dernière fois qu'un employé a confirmé "ce produit est toujours là"
  -- (voir /verifications) — le site n'étant pas connecté en direct au
  -- stock réel, ça sert à repérer les emplacements à recontrôler.
  verifie_at timestamptz not null default now(),
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
-- 7bis. Signalements : un employé signale un problème sur une alvéole (ex:
--       "lisse cassée"). Disparaît automatiquement après le délai choisi
--       (ou reste si aucun délai), sauf traitement par un admin. Le blocage
--       de l'alvéole (colonnes bloquee_* ci-dessus) reste séparé et
--       manuel : signaler ne bloque pas automatiquement.
-- ----------------------------------------------------------------------------
create table if not exists public.signalements (
  id uuid primary key default gen_random_uuid(),
  alveole_id uuid not null references public.alveoles (id) on delete cascade,
  message text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  traite boolean not null default false,
  traite_par uuid references public.profiles (id),
  traite_at timestamptz
);

alter table public.signalements enable row level security;

create policy "signalements_select_all" on public.signalements
  for select using (auth.uid() is not null);
create policy "signalements_insert_all" on public.signalements
  for insert with check (auth.uid() is not null);
create policy "signalements_update_admin" on public.signalements
  for update using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7ter. Messagerie : discussion globale, discussion admin, messages directs.
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_type text not null check (channel_type in ('global', 'admin', 'direct')),
  sender_id uuid not null references public.profiles (id),
  recipient_id uuid references public.profiles (id), -- rempli seulement pour 'direct'
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select" on public.messages
  for select using (
    channel_type = 'global'
    or (channel_type = 'admin' and public.is_admin())
    or (channel_type = 'direct' and (sender_id = auth.uid() or recipient_id = auth.uid()))
  );
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      channel_type = 'global'
      or (channel_type = 'admin' and public.is_admin())
      or (channel_type = 'direct' and recipient_id is not null)
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 7quater. Journal des rangements (réservé aux admins) : une ligne par
-- action de rangement, contrairement à product_locations qui ne garde que
-- le total actuel.
-- ----------------------------------------------------------------------------
create table if not exists public.mouvements (
  id uuid primary key default gen_random_uuid(),
  -- rangement (réception), sortie (vidage/retrait), verification (contrôle
  -- périodique "toujours là"), signalement (problème signalé).
  type text not null default 'rangement' check (type in ('rangement', 'sortie', 'verification', 'signalement')),
  product_id uuid references public.products (id) on delete cascade,
  alveole_id uuid not null references public.alveoles (id) on delete cascade,
  colis integer,
  type_palette text check (type_palette in ('eur', 'centrale')),
  message text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.mouvements enable row level security;

create policy "mouvements_select_admin" on public.mouvements
  for select using (public.is_admin());
create policy "mouvements_insert_self" on public.mouvements
  for insert with check (created_by = auth.uid());
-- Nécessaire pour que la réinitialisation du journal (/admin/journal)
-- puisse réellement vider la table après avoir sauvegardé son contenu
-- (voir migration_017 — sans ça le DELETE ne supprimait rien).
create policy "mouvements_delete_admin" on public.mouvements
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7quinquies. Planning des employés : les admins définissent les horaires,
-- tout le monde peut consulter (page /planning, imprimable) et la page
-- d'accueil affiche les horaires du jour à la personne connectée.
-- ----------------------------------------------------------------------------
create table if not exists public.plannings (
  id uuid primary key default gen_random_uuid(),
  employe_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  pause_debut time,
  pause_fin time,
  -- Exception "jour de repos" pour cette date précise : annule l'horaire
  -- habituel de ce jour sans qu'il faille saisir des heures fictives (voir
  -- migration_015). heure_debut/heure_fin restent renseignées (ignorées côté
  -- calcul) pour respecter la contrainte not null.
  repos boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.plannings enable row level security;

create policy "plannings_select_all" on public.plannings
  for select using (auth.uid() is not null);
create policy "plannings_insert_admin" on public.plannings
  for insert with check (public.is_admin());
create policy "plannings_update_admin" on public.plannings
  for update using (public.is_admin());
create policy "plannings_delete_admin" on public.plannings
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7sexies. Horaires habituels (planning récurrent) : un horaire par employé
-- et jour de semaine, appliqué pour toujours. Une exception ponctuelle
-- (table plannings ci-dessus) prend le pas pour une date précise.
-- ----------------------------------------------------------------------------
create table if not exists public.planning_recurrent (
  id uuid primary key default gen_random_uuid(),
  employe_id uuid not null references public.profiles (id) on delete cascade,
  jour_semaine smallint not null check (jour_semaine between 1 and 7),
  heure_debut time not null,
  heure_fin time not null,
  pause_debut time,
  pause_fin time,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (employe_id, jour_semaine)
);

alter table public.planning_recurrent enable row level security;

create policy "planning_recurrent_select_all" on public.planning_recurrent
  for select using (auth.uid() is not null);
create policy "planning_recurrent_insert_admin" on public.planning_recurrent
  for insert with check (public.is_admin());
create policy "planning_recurrent_update_admin" on public.planning_recurrent
  for update using (public.is_admin());
create policy "planning_recurrent_delete_admin" on public.planning_recurrent
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Index utiles
-- ----------------------------------------------------------------------------
create index if not exists idx_signalements_alveole on public.signalements (alveole_id);
create index if not exists idx_plannings_date on public.plannings (date);
create index if not exists idx_plannings_employe on public.plannings (employe_id, date);
create index if not exists idx_planning_recurrent_employe on public.planning_recurrent (employe_id);
create index if not exists idx_messages_channel on public.messages (channel_type, created_at);
create index if not exists idx_mouvements_created_at on public.mouvements (created_at desc);
create index if not exists idx_mouvements_product on public.mouvements (product_id);
create index if not exists idx_messages_direct on public.messages (sender_id, recipient_id, created_at);
create index if not exists idx_products_ean on public.products (ean);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_alveoles_zone on public.alveoles (zone_id);
create index if not exists idx_product_locations_product on public.product_locations (product_id);
create index if not exists idx_product_locations_alveole on public.product_locations (alveole_id);
create index if not exists idx_objectifs_semaine on public.objectifs (semaine_debut);
create index if not exists idx_objectifs_employe on public.objectifs (employe_id, date);

-- ----------------------------------------------------------------------------
-- 7septies. Réinitialisation sécurisée du journal (/admin/journal) : un
-- code admin (hash+sel, jamais stocké en clair) à taper pour vider le
-- journal ou consulter les sauvegardes gardées à chaque réinitialisation.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_codes (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique, -- ex: 'journal_reset'
  code_hash text not null,
  code_sel text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.admin_codes enable row level security;

create policy "admin_codes_all_admin" on public.admin_codes
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.journal_reset_backups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  motif text not null default '',
  nb_lignes integer not null,
  contenu jsonb not null
);

alter table public.journal_reset_backups enable row level security;

create policy "journal_reset_backups_select_admin" on public.journal_reset_backups
  for select using (public.is_admin());
create policy "journal_reset_backups_insert_admin" on public.journal_reset_backups
  for insert with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7octies. Objectifs/tâches de la semaine (voir /admin/objectifs) : un
-- objectif global d'équipe (employe_id null) ou une tâche pour un employé
-- précis, pour toute la semaine (date null) ou un jour précis.
-- ----------------------------------------------------------------------------
create table if not exists public.objectifs (
  id uuid primary key default gen_random_uuid(),
  semaine_debut date not null,
  employe_id uuid references public.profiles (id) on delete cascade,
  date date,
  texte text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.objectifs enable row level security;

create policy "objectifs_select_all" on public.objectifs
  for select using (auth.uid() is not null);
create policy "objectifs_insert_admin" on public.objectifs
  for insert with check (public.is_admin());
create policy "objectifs_delete_admin" on public.objectifs
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8bis. Réglages globaux (une seule ligne) : préfixe collé devant le code
-- d'une alvéole pour générer son QR (voir /admin/alveoles et
-- migration_016_parametres_qr.sql).
-- ----------------------------------------------------------------------------
create table if not exists public.parametres (
  id boolean primary key default true,
  qr_prefixe_alveole text not null default '',
  updated_at timestamptz not null default now(),
  constraint parametres_singleton check (id)
);

insert into public.parametres (id) values (true) on conflict (id) do nothing;

alter table public.parametres enable row level security;

create policy "parametres_select_all" on public.parametres
  for select using (auth.uid() is not null);
create policy "parametres_update_admin" on public.parametres
  for update using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8b. SAV (service après-vente) : tickets clients sur un tableau façon
-- Trello, colonnes/champs personnalisables par admin/dev. Voir
-- migration_020_sav.sql pour le détail des choix.
-- ----------------------------------------------------------------------------
create or replace function public.a_acces_sav()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select role in ('admin', 'dev') or acces_sav
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$;

create table if not exists public.sav_colonnes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sav_colonnes enable row level security;

create policy "sav_colonnes_select" on public.sav_colonnes
  for select using (public.a_acces_sav());
create policy "sav_colonnes_write_admin_dev" on public.sav_colonnes
  for insert with check (public.is_admin_ou_dev());
create policy "sav_colonnes_update_admin_dev" on public.sav_colonnes
  for update using (public.is_admin_ou_dev());
create policy "sav_colonnes_delete_admin_dev" on public.sav_colonnes
  for delete using (public.is_admin_ou_dev());

insert into public.sav_colonnes (nom, ordre) values
  ('En attente de traitement', 0),
  ('En traitement', 1),
  ('En cours de réparation', 2),
  ('En attente de retour', 3);

create table if not exists public.sav_champs_perso (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  type text not null default 'checkbox' check (type in ('checkbox', 'texte')),
  categorie text check (categorie in ('meuble', 'electromenager')),
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sav_champs_perso enable row level security;

create policy "sav_champs_select" on public.sav_champs_perso
  for select using (public.a_acces_sav());
create policy "sav_champs_write_admin_dev" on public.sav_champs_perso
  for insert with check (public.is_admin_ou_dev());
create policy "sav_champs_update_admin_dev" on public.sav_champs_perso
  for update using (public.is_admin_ou_dev());
create policy "sav_champs_delete_admin_dev" on public.sav_champs_perso
  for delete using (public.is_admin_ou_dev());

insert into public.sav_champs_perso (label, type, categorie, ordre) values
  ('Boîte d''origine', 'checkbox', 'electromenager', 0),
  ('Chargeur / câble', 'checkbox', 'electromenager', 1),
  ('Batterie', 'checkbox', 'electromenager', 2),
  ('Notice', 'checkbox', 'electromenager', 3),
  ('Télécommande', 'checkbox', 'electromenager', 4),
  ('Boîte / emballage d''origine', 'checkbox', 'meuble', 0),
  ('Notice de montage', 'checkbox', 'meuble', 1),
  ('Visserie complète', 'checkbox', 'meuble', 2);

create table if not exists public.sav_tickets (
  id uuid primary key default gen_random_uuid(),
  numero bigserial,
  client_nom text not null,
  client_prenom text not null,
  numero_facture text,
  produit_id uuid references public.products (id) on delete set null,
  produit_nom text not null,
  produit_ref text,
  produit_ean text,
  categorie text not null default 'autre' check (categorie in ('meuble', 'electromenager', 'autre')),
  commentaire text,
  colonne_id uuid not null references public.sav_colonnes (id),
  ordre integer not null default 0,
  ylios_fait boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sav_tickets enable row level security;

create policy "sav_tickets_select" on public.sav_tickets
  for select using (public.a_acces_sav());
create policy "sav_tickets_insert" on public.sav_tickets
  for insert with check (public.a_acces_sav());
create policy "sav_tickets_update" on public.sav_tickets
  for update using (public.a_acces_sav());
create policy "sav_tickets_delete_admin" on public.sav_tickets
  for delete using (public.is_admin());

create index if not exists idx_sav_tickets_colonne on public.sav_tickets (colonne_id, ordre);

create table if not exists public.sav_ticket_champs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.sav_tickets (id) on delete cascade,
  champ_id uuid not null references public.sav_champs_perso (id) on delete cascade,
  valeur_bool boolean,
  valeur_texte text,
  unique (ticket_id, champ_id)
);

alter table public.sav_ticket_champs enable row level security;

create policy "sav_ticket_champs_select" on public.sav_ticket_champs
  for select using (public.a_acces_sav());
create policy "sav_ticket_champs_insert" on public.sav_ticket_champs
  for insert with check (public.a_acces_sav());
create policy "sav_ticket_champs_update" on public.sav_ticket_champs
  for update using (public.a_acces_sav());
create policy "sav_ticket_champs_delete" on public.sav_ticket_champs
  for delete using (public.a_acces_sav());

create table if not exists public.sav_commentaires (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.sav_tickets (id) on delete cascade,
  auteur_id uuid references public.profiles (id),
  texte text not null,
  created_at timestamptz not null default now()
);

alter table public.sav_commentaires enable row level security;

create policy "sav_commentaires_select" on public.sav_commentaires
  for select using (public.a_acces_sav());
create policy "sav_commentaires_insert" on public.sav_commentaires
  for insert with check (public.a_acces_sav());
create policy "sav_commentaires_delete_admin" on public.sav_commentaires
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8c. Zones spéciales (tampon, Drive, CAM, chariot...) : personnalisables,
-- sans position sur le plan — juste un nom + un identifiant, pour générer
-- un QR code avec le même préfixe que les alvéoles (réglage "Format du QR
-- code" sur /admin/alveoles, table parametres.qr_prefixe_alveole).
-- Exemple : nom "Chariot 1", identifiant "123" -> QR "9990000000226@123".
-- Voir migration_021_zones_speciales.sql.
-- ----------------------------------------------------------------------------
create table if not exists public.zones_speciales (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'autre' check (type in ('tampon', 'drive', 'cam', 'chariot', 'autre')),
  nom text not null,
  identifiant text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.zones_speciales enable row level security;

create policy "zones_speciales_select_all" on public.zones_speciales
  for select using (auth.uid() is not null);
-- Même règle que pour les zones du plan : dev peut créer/modifier, seule
-- la suppression reste réservée à l'admin.
create policy "zones_speciales_write_admin_dev" on public.zones_speciales
  for insert with check (public.is_admin_ou_dev());
create policy "zones_speciales_update_admin_dev" on public.zones_speciales
  for update using (public.is_admin_ou_dev());
create policy "zones_speciales_delete_admin" on public.zones_speciales
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Exemple pour démarrer (à adapter/supprimer dans l'admin)
-- ----------------------------------------------------------------------------
-- Zones d'exemple créées SANS position sur le plan (pos_x_pct etc. restent
-- vides) : va dans /admin/zones, mets ta propre photo en place de
-- public/plan-entrepot.jpg, puis dessine chaque zone au clic-glisser.
insert into public.zones (code, label, couleur) values
  ('A', 'Allée A', '#E2001A'),
  ('B', 'Allée B', '#E2001A'),
  ('C', 'Allée C', '#E2001A')
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

notify pgrst, 'reload schema';

-- ============================================================================
-- Après avoir exécuté ce script, crée ton premier compte admin :
-- 1. Fichier DEPLOIEMENT.md, section "Créer le premier compte admin".
-- ============================================================================
