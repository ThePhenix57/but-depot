-- ============================================================================
-- BUT Dépôt — migration 013 : horaires habituels (planning récurrent)
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Jusqu'ici un admin devait remplir chaque semaine à la main. Cette table
-- garde un horaire "habituel" par employé et jour de semaine (lundi à
-- dimanche), appliqué pour toujours — chaque semaine future reprend
-- automatiquement ces horaires, sans rien remplir. Un admin peut toujours
-- changer une semaine précise (table "plannings" existante) : cette
-- exception ponctuelle prend le pas sur l'habituel pour cette date-là,
-- sans y toucher pour les autres semaines.
-- ============================================================================

create table if not exists public.planning_recurrent (
  id uuid primary key default gen_random_uuid(),
  employe_id uuid not null references public.profiles (id) on delete cascade,
  -- 1 = lundi ... 7 = dimanche.
  jour_semaine smallint not null check (jour_semaine between 1 and 7),
  heure_debut time not null,
  heure_fin time not null,
  pause_debut time,
  pause_fin time,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  -- Un seul horaire habituel par employé et jour de semaine (le modifier
  -- remplace l'ancien plutôt que d'en ajouter un deuxième).
  unique (employe_id, jour_semaine)
);

alter table public.planning_recurrent enable row level security;

drop policy if exists "planning_recurrent_select_all" on public.planning_recurrent;
create policy "planning_recurrent_select_all" on public.planning_recurrent
  for select using (auth.uid() is not null);

drop policy if exists "planning_recurrent_insert_admin" on public.planning_recurrent;
create policy "planning_recurrent_insert_admin" on public.planning_recurrent
  for insert with check (public.is_admin());
drop policy if exists "planning_recurrent_update_admin" on public.planning_recurrent;
create policy "planning_recurrent_update_admin" on public.planning_recurrent
  for update using (public.is_admin());
drop policy if exists "planning_recurrent_delete_admin" on public.planning_recurrent;
create policy "planning_recurrent_delete_admin" on public.planning_recurrent
  for delete using (public.is_admin());

create index if not exists idx_planning_recurrent_employe on public.planning_recurrent (employe_id);

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. /admin/planning a maintenant deux vues : "Semaine" (comme avant,
-- pour une exception ponctuelle) et "Horaires habituels" (pour toujours).
-- /planning et la page d'accueil affichent l'habituel, sauf pour les jours
-- où une exception a été posée pour cette semaine précise.
-- ============================================================================
