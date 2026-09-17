-- ============================================================================
-- BUT Dépôt — migration 008 : réinitialisation sécurisée du journal
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Ajoute : un code admin (protégé par hash+sel, jamais stocké en clair) qui
-- doit être tapé pour vider tout le journal des rangements ET pour
-- consulter les sauvegardes gardées à chaque réinitialisation (qui, quand,
-- et tout le contenu effacé).
-- ============================================================================

create table if not exists public.admin_codes (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique, -- ex: 'journal_reset'
  code_hash text not null,
  code_sel text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.admin_codes enable row level security;

drop policy if exists "admin_codes_all_admin" on public.admin_codes;
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

-- Au cas où cette table existait déjà sans la colonne "motif" (rejoue de
-- ce script après une première version).
alter table public.journal_reset_backups add column if not exists motif text not null default '';

alter table public.journal_reset_backups enable row level security;

drop policy if exists "journal_reset_backups_select_admin" on public.journal_reset_backups;
create policy "journal_reset_backups_select_admin" on public.journal_reset_backups
  for select using (public.is_admin());
drop policy if exists "journal_reset_backups_insert_admin" on public.journal_reset_backups;
create policy "journal_reset_backups_insert_admin" on public.journal_reset_backups
  for insert with check (public.is_admin());

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. Dans /admin/journal, un admin doit d'abord définir un code (une
-- fois), puis ce code est nécessaire pour vider le journal ou consulter les
-- sauvegardes des réinitialisations précédentes.
-- ============================================================================
