-- ============================================================================
-- BUT Dépôt — migration 014 : anniversaires
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Additif et sûr à rejouer plusieurs fois.
--
-- Date de naissance par employé (facultative, définie par un admin depuis
-- /admin/employes). Le jour J, la page d'accueil met en avant la personne
-- qui fête son anniversaire (visible de tous) avec des confettis pour elle.
-- ============================================================================

alter table public.profiles add column if not exists date_naissance date;

notify pgrst, 'reload schema';

-- ============================================================================
-- Terminé. /admin/employes permet de renseigner la date de naissance de
-- chaque employé ; la page d'accueil s'occupe du reste automatiquement.
-- ============================================================================
