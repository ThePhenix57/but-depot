-- Zones spéciales personnalisables (zone tampon, Drive, CAM, chariot...) :
-- contrairement aux zones du plan de l'entrepôt (table "zones", liées à
-- des alvéoles), une zone spéciale n'a pas de position sur le plan — c'est
-- juste un nom + un identifiant, pour générer un QR code avec le même
-- préfixe que les alvéoles (réglage "Format du QR code" sur
-- /admin/alveoles, table parametres.qr_prefixe_alveole).
-- Exemple : nom "Chariot 1", identifiant "123" -> QR "9990000000226@123".
create table if not exists public.zones_speciales (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'autre' check (type in ('tampon', 'drive', 'cam', 'chariot', 'autre')),
  nom text not null,
  identifiant text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.zones_speciales enable row level security;

drop policy if exists "zones_speciales_select_all" on public.zones_speciales;
create policy "zones_speciales_select_all" on public.zones_speciales
  for select using (auth.uid() is not null);
-- Même règle que pour les zones du plan : dev peut créer/modifier, seule
-- la suppression reste réservée à l'admin.
drop policy if exists "zones_speciales_write_admin_dev" on public.zones_speciales;
create policy "zones_speciales_write_admin_dev" on public.zones_speciales
  for insert with check (public.is_admin_ou_dev());
drop policy if exists "zones_speciales_update_admin_dev" on public.zones_speciales;
create policy "zones_speciales_update_admin_dev" on public.zones_speciales
  for update using (public.is_admin_ou_dev());
drop policy if exists "zones_speciales_delete_admin" on public.zones_speciales;
create policy "zones_speciales_delete_admin" on public.zones_speciales
  for delete using (public.is_admin());

notify pgrst, 'reload schema';
