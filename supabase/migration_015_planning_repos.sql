-- Ajoute la possibilité de marquer un jour comme "repos" pour une semaine
-- précise (exception ponctuelle qui annule l'horaire habituel de ce jour,
-- sans avoir à saisir des heures) — voir /admin/planning, vue "Semaine".
alter table public.plannings add column if not exists repos boolean not null default false;

notify pgrst, 'reload schema';
