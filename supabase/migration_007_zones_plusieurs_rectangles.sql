-- ============================================================================
-- BUT Dépôt — migration 007 : une zone peut couvrir plusieurs rectangles
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Avant, une zone (allée) ne pouvait avoir qu'UNE seule position sur le
-- plan. Mais dans un vrai entrepôt, une même zone peut être coupée en deux
-- endroits séparés sur le plan (ex: les racks E à M interrompus au milieu
-- par une allée de circulation) — il fallait pouvoir dessiner plusieurs
-- rectangles pour la même zone. Cette migration déplace la position/taille
-- dans une nouvelle table "zone_rects" (une zone → plusieurs rectangles),
-- et reprend automatiquement le rectangle déjà dessiné de chaque zone
-- placée pour ne rien perdre.
-- ============================================================================

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

drop policy if exists "zone_rects_select_all" on public.zone_rects;
create policy "zone_rects_select_all" on public.zone_rects
  for select using (auth.uid() is not null);
drop policy if exists "zone_rects_insert_admin" on public.zone_rects;
create policy "zone_rects_insert_admin" on public.zone_rects
  for insert with check (public.is_admin());
drop policy if exists "zone_rects_delete_admin" on public.zone_rects;
create policy "zone_rects_delete_admin" on public.zone_rects
  for delete using (public.is_admin());

create index if not exists idx_zone_rects_zone on public.zone_rects (zone_id);

-- Reprend le rectangle déjà placé de chaque zone (colonnes pos_x_pct etc.
-- sur "zones", ajoutées par migration_005) dans la nouvelle table — sans
-- rien dupliquer si ce script est relancé.
insert into public.zone_rects (zone_id, pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct)
select z.id, z.pos_x_pct, z.pos_y_pct, z.largeur_pct, z.hauteur_pct
from public.zones z
where z.pos_x_pct is not null
  and z.pos_y_pct is not null
  and z.largeur_pct is not null
  and z.hauteur_pct is not null
  and not exists (select 1 from public.zone_rects zr where zr.zone_id = z.id);

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. Dans /admin/zones, chaque zone peut maintenant avoir plusieurs
-- rectangles : utilise "Ajouter un rectangle" pour dessiner une deuxième
-- zone séparée (ex: rack A pour le SAV, dessiné en 2 endroits différents,
-- toujours sous le même code de zone).
-- ============================================================================
