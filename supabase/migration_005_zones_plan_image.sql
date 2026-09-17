-- ============================================================================
-- BUT Dépôt — migration 005 : positionnement des zones en % sur la photo
-- du plan (clic-glisser dans /admin/zones), au lieu de la grille de cases.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois : ne touche pas aux zones déjà
-- créées (elles restent, juste sans position tant que tu ne les as pas
-- redessinées sur le nouveau plan).
-- ============================================================================

alter table public.zones add column if not exists pos_x_pct numeric;
alter table public.zones add column if not exists pos_y_pct numeric;
alter table public.zones add column if not exists largeur_pct numeric;
alter table public.zones add column if not exists hauteur_pct numeric;

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. Va dans /admin/zones : la photo du plan s'affiche, dessine
-- chaque zone dessus au clic-glisser. Les anciennes colonnes (Col./Ligne/
-- Larg./Haut. en cases) restent en base mais ne sont plus utilisées par le
-- site — sans danger de les laisser telles quelles.
-- ============================================================================
