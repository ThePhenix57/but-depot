-- Ajoute un rôle "dev" : peut travailler sur le plan de l'entrepôt (créer
-- des zones, dessiner/ajuster les rectangles sur le plan, créer des
-- alvéoles, créer des catégories) mais ne peut RIEN supprimer de tout ça
-- (zones, alvéoles, catégories restent des suppressions réservées aux
-- admins), et n'a accès à rien d'autre côté admin : pas les employés, pas
-- les produits, pas les signalements, pas le journal des rangements, pas le
-- planning, pas les objectifs de la semaine. Un dev ne voit pas non plus la
-- discussion "admin" de la messagerie (déjà strictement réservée aux
-- comptes role='admin', donc rien à changer là).

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('employe', 'admin', 'dev'));

-- Fonction utilitaire séparée de is_admin() : celle-ci reste strictement
-- réservée aux vrais admins (journal, planning, employés, suppressions...),
-- is_admin_ou_dev() ne sert qu'aux quelques actions de création que le rôle
-- dev doit aussi pouvoir faire.
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

-- Zones : dev peut créer/modifier, pas supprimer (zones_delete_admin reste
-- inchangée, réservée à is_admin()).
drop policy if exists "zones_write_admin" on public.zones;
create policy "zones_write_admin" on public.zones
  for insert with check (public.is_admin_ou_dev());
drop policy if exists "zones_update_admin" on public.zones;
create policy "zones_update_admin" on public.zones
  for update using (public.is_admin_ou_dev());

-- Rectangles du plan (une zone peut en avoir plusieurs, voir
-- migration_007) : dev peut ajouter/retirer un rectangle, ça fait partie de
-- "toucher au plan" et c'est sans risque (pas de cascade sur les alvéoles).
drop policy if exists "zone_rects_insert_admin" on public.zone_rects;
create policy "zone_rects_insert_admin" on public.zone_rects
  for insert with check (public.is_admin_ou_dev());
drop policy if exists "zone_rects_delete_admin" on public.zone_rects;
create policy "zone_rects_delete_admin" on public.zone_rects
  for delete using (public.is_admin_ou_dev());

-- Catégories : dev peut créer (et lier des zones à la création), pas
-- supprimer (categories_delete_admin/category_zones_delete_admin restent
-- inchangées, réservées à is_admin()).
drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin" on public.categories
  for insert with check (public.is_admin_ou_dev());
drop policy if exists "category_zones_write_admin" on public.category_zones;
create policy "category_zones_write_admin" on public.category_zones
  for insert with check (public.is_admin_ou_dev());

notify pgrst, 'reload schema';
