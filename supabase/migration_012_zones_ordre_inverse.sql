-- ============================================================================
-- BUT Dépôt — migration 012 : ordre d'affichage des travées par zone
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Sur le terrain, le numéro de travée augmente en s'éloignant de l'accueil
-- — mais selon l'orientation de l'allée sur le plan, ça peut vouloir dire
-- "de gauche à droite" ou "de droite à gauche". Ce réglage (par zone)
-- permet à l'aperçu (clic sur le plan dans /recherche) d'afficher les
-- travées dans le même ordre que ce qu'on voit en marchant dans l'allée,
-- au lieu de toujours du plus petit numéro au plus grand.
-- ============================================================================

alter table public.zones add column if not exists ordre_inverse boolean not null default false;

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. /admin/zones a une case à cocher par zone ("Inverser l'ordre
-- des travées") qui contrôle l'ordre d'affichage dans l'aperçu.
-- ============================================================================
