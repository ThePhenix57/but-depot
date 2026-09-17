-- Réglages globaux du site (une seule ligne, id fixe) : pour l'instant,
-- juste le préfixe collé devant le code d'une alvéole quand on génère son
-- QR code (voir /admin/alveoles) — pratique pour que le QR corresponde au
-- format attendu par un lecteur/PDA existant (ex: "999000000000Nosica@"),
-- sans toucher au code affiché en clair sur l'étiquette.
create table if not exists public.parametres (
  id boolean primary key default true,
  qr_prefixe_alveole text not null default '',
  updated_at timestamptz not null default now(),
  constraint parametres_singleton check (id)
);

insert into public.parametres (id) values (true) on conflict (id) do nothing;

alter table public.parametres enable row level security;

drop policy if exists "parametres_select_all" on public.parametres;
create policy "parametres_select_all" on public.parametres
  for select using (auth.uid() is not null);
drop policy if exists "parametres_update_admin" on public.parametres;
create policy "parametres_update_admin" on public.parametres
  for update using (public.is_admin());

notify pgrst, 'reload schema';
