-- ============================================================================
-- BUT Dépôt — migration 002 : signalements/blocage d'alvéole + messagerie
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Contrairement à schema.sql, ce script est ADDITIF : il ne touche pas aux
-- données déjà en place (comptes, produits, zones...). Sûr à exécuter sur
-- une base qui a déjà de vraies données.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Élargit l'accès à la liste des profils : tout compte connecté peut
--    voir ses collègues (nom, rôle) — sert d'annuaire pour la messagerie
--    directe. Avant, un employé ne voyait que sa propre fiche. Rien de
--    sensible n'est exposé (l'email reste seulement listé côté admin via
--    la page Employés, qui vérifie le rôle séparément de la base).
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- 1. Blocage d'une alvéole (ex: lisse cassée) — admin uniquement.
-- ----------------------------------------------------------------------------
alter table public.alveoles add column if not exists bloquee boolean not null default false;
alter table public.alveoles add column if not exists bloquee_motif text;
alter table public.alveoles add column if not exists bloquee_par uuid references public.profiles (id);
alter table public.alveoles add column if not exists bloquee_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. Signalements : un employé signale un problème sur une alvéole (ex:
--    "lisse cassée"). La note disparaît toute seule après le délai choisi
--    (ou reste si "jamais"), sauf si un admin l'a déjà traitée. Le blocage
--    de l'alvéole (section 1) est séparé et reste jusqu'à déblocage manuel.
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

drop policy if exists "signalements_select_all" on public.signalements;
create policy "signalements_select_all" on public.signalements
  for select using (auth.uid() is not null);

-- Employé ET admin peuvent signaler un problème.
drop policy if exists "signalements_insert_all" on public.signalements;
create policy "signalements_insert_all" on public.signalements
  for insert with check (auth.uid() is not null);

-- Marquer un signalement comme traité reste réservé à l'admin/direction.
drop policy if exists "signalements_update_admin" on public.signalements;
create policy "signalements_update_admin" on public.signalements
  for update using (public.is_admin());

create index if not exists idx_signalements_alveole on public.signalements (alveole_id);

-- ----------------------------------------------------------------------------
-- 3. Messagerie : discussion globale, discussion admin, messages individuels.
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

-- Visible : tout le monde pour 'global', admins seulement pour 'admin',
-- et pour 'direct' seulement l'expéditeur ou le destinataire.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    channel_type = 'global'
    or (channel_type = 'admin' and public.is_admin())
    or (channel_type = 'direct' and (sender_id = auth.uid() or recipient_id = auth.uid()))
  );

-- Envoi : on ne peut envoyer qu'en son propre nom, dans un canal autorisé.
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      channel_type = 'global'
      or (channel_type = 'admin' and public.is_admin())
      or (channel_type = 'direct' and recipient_id is not null)
    )
  );

create index if not exists idx_messages_channel on public.messages (channel_type, created_at);
create index if not exists idx_messages_direct on public.messages (sender_id, recipient_id, created_at);

-- Active le "Realtime" (mises à jour en direct) sur cette table (sans
-- erreur si elle y est déjà, pour pouvoir rejouer ce script sans risque).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Force l'API à relire le schéma tout de suite (sinon "signalements"/
-- "messages" peuvent rester "introuvables" côté site jusqu'à une minute,
-- comme ça a été le cas pour "categories").
notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. Rien d'autre à faire : les nouvelles pages du site (Signalements,
-- Messagerie) utilisent directement ces tables.
-- ============================================================================
