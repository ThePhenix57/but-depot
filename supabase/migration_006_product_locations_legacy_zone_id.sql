-- ============================================================================
-- BUT Dépôt — migration 006 : corrige une colonne héritée sur product_locations
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Ta base a une colonne "zone_id" sur product_locations qui vient d'une
-- version du site encore plus ancienne que celle que migration_001 avait
-- anticipée — elle n'existe dans aucun de nos scripts, donc rien ne
-- l'avait jamais neutralisée. Comme elle est obligatoire (NOT NULL) et que
-- le site actuel ne la renseigne jamais (la zone d'un emplacement se
-- retrouve via product_locations → alveoles → zones, pas directement),
-- chaque rangement échouait avec :
--   "null value in column "zone_id" of relation "product_locations"
--    violates not-null constraint"
-- Ce script rend cette colonne facultative (si elle existe) pour débloquer
-- les rangements — sans danger même si ta base ne l'a pas (script neuf).
-- ============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_locations' and column_name = 'zone_id'
  ) then
    alter table public.product_locations alter column zone_id drop not null;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. Réessaie de ranger un produit : ça devrait passer maintenant.
-- ============================================================================
