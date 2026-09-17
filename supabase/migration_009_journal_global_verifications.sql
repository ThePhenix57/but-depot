-- ============================================================================
-- BUT Dépôt — migration 009 : journal global + vérifications périodiques
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Deux changements :
--
-- 1. Le journal ("mouvements") ne gardait qu'une trace des RANGEMENTS. Il
--    devient un journal global : chaque ligne a maintenant un "type"
--    (rangement / sortie / verification / signalement) pour couvrir aussi
--    les vidages d'alvéole, les vérifications périodiques, et les
--    signalements de problème — un seul historique complet au lieu de
--    plusieurs endroits séparés.
--
-- 2. product_locations gagne une colonne "verifie_at" : la dernière fois
--    qu'un employé a confirmé "oui, ce produit est toujours là". Sert à
--    repérer les emplacements en place depuis plus d'un mois qu'il faut
--    aller vérifier physiquement (le site n'étant pas connecté en direct
--    au stock réel — voir le bouton "Vider" ajouté précédemment).
-- ============================================================================

-- 1. Type de mouvement.
alter table public.mouvements add column if not exists type text not null default 'rangement';

alter table public.mouvements drop constraint if exists mouvements_type_check;
alter table public.mouvements
  add constraint mouvements_type_check
  check (type in ('rangement', 'sortie', 'verification', 'signalement'));

-- "colis" et "product_id" n'ont plus de sens pour tous les types (ex: un
-- signalement peut concerner une alvéole sans produit précis en tête) : on
-- les rend facultatifs plutôt que de casser l'existant.
alter table public.mouvements alter column colis drop not null;
alter table public.mouvements alter column product_id drop not null;

-- Message libre : motif d'un vidage, texte d'un signalement, etc.
alter table public.mouvements add column if not exists message text;

create index if not exists idx_mouvements_type on public.mouvements (type);
create index if not exists idx_mouvements_alveole on public.mouvements (alveole_id);

-- 2. Dernière vérification physique de chaque emplacement.
alter table public.product_locations add column if not exists verifie_at timestamptz;
update public.product_locations set verifie_at = added_at where verifie_at is null;
alter table public.product_locations alter column verifie_at set default now();

create index if not exists idx_product_locations_verifie_at on public.product_locations (verifie_at);

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. /admin/journal affiche maintenant tous les types de mouvement, et
-- la nouvelle page /verifications liste les emplacements à vérifier (plus
-- d'un mois sans confirmation), accessible à tous les employés connectés.
-- ============================================================================
