-- ============================================================================
-- BUT Dépôt — migration 010 : palette conseillée par produit
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Un simple conseil (pas une règle bloquante, contrairement à
-- taille_palette_max sur les alvéoles) : quel type de palette utiliser de
-- préférence pour décharger/ranger ce produit. S'affiche comme indication
-- sur la fiche produit et au moment du rangement.
-- ============================================================================

alter table public.products add column if not exists palette_conseillee text;

alter table public.products drop constraint if exists products_palette_conseillee_check;
alter table public.products
  add constraint products_palette_conseillee_check
  check (palette_conseillee is null or palette_conseillee in ('eur', 'centrale'));

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. /admin/produits permet de créer un produit (EAN, nom, poids,
-- palette conseillée) et de modifier ce champ pour les produits existants.
-- ============================================================================
