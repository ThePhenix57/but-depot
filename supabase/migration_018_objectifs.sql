-- Objectifs/tâches de la semaine : un admin peut poser un objectif global
-- pour toute l'équipe (employe_id null) ou une tâche pour un employé précis
-- — pour toute la semaine (date null) ou pour un jour précis (date
-- renseignée). Affiché sur la page d'accueil (voir /admin/objectifs).
create table if not exists public.objectifs (
  id uuid primary key default gen_random_uuid(),
  -- Lundi de la semaine concernée (même convention que le planning) — sert
  -- à retrouver "les objectifs de cette semaine" même pour un objectif
  -- global ou sans date précise.
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

create index if not exists idx_objectifs_semaine on public.objectifs (semaine_debut);
create index if not exists idx_objectifs_employe on public.objectifs (employe_id, date);

notify pgrst, 'reload schema';
