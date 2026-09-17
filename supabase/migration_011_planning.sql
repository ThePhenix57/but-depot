-- ============================================================================
-- BUT Dépôt — migration 011 : planning des employés
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Les admins définissent les horaires (`/admin/planning`) ; tout le monde
-- peut consulter le planning de la semaine (`/planning`, imprimable), et la
-- page d'accueil affiche à chaque employé connecté ses horaires du jour.
-- ============================================================================

create table if not exists public.plannings (
  id uuid primary key default gen_random_uuid(),
  employe_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  -- Pause facultative (une seule par ligne ; pour plusieurs pauses le même
  -- jour, un admin ajoute une deuxième ligne pour cet employé/ce jour).
  pause_debut time,
  pause_fin time,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.plannings enable row level security;

-- Consultable par tout compte connecté (pas seulement le sien) : l'idée est
-- que chacun puisse voir le planning de toute l'équipe.
drop policy if exists "plannings_select_all" on public.plannings;
create policy "plannings_select_all" on public.plannings
  for select using (auth.uid() is not null);

-- Écriture réservée aux admins.
drop policy if exists "plannings_insert_admin" on public.plannings;
create policy "plannings_insert_admin" on public.plannings
  for insert with check (public.is_admin());
drop policy if exists "plannings_update_admin" on public.plannings;
create policy "plannings_update_admin" on public.plannings
  for update using (public.is_admin());
drop policy if exists "plannings_delete_admin" on public.plannings;
create policy "plannings_delete_admin" on public.plannings
  for delete using (public.is_admin());

create index if not exists idx_plannings_date on public.plannings (date);
create index if not exists idx_plannings_employe on public.plannings (employe_id, date);

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. /admin/planning (admin) crée/modifie/supprime les horaires,
-- /planning (tout le monde, imprimable) affiche la semaine, et la page
-- d'accueil affiche les horaires du jour de la personne connectée.
-- ============================================================================
