import type { SupabaseClient } from "@supabase/supabase-js";

// Petits utilitaires d'accès SAV côté serveur (API routes) — la vraie
// barrière de sécurité reste les policies RLS (public.a_acces_sav() /
// public.is_admin_ou_dev(), voir migration_020_sav.sql), ceci sert juste à
// renvoyer un message d'erreur clair plutôt qu'un tableau vide silencieux.

// Accès à la section SAV : admin et dev toujours, employé seulement si
// profiles.acces_sav est coché par un admin.
export async function aAccesSav(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role, acces_sav")
    .eq("id", userId)
    .single();
  if (!data) return false;
  return data.role === "admin" || data.role === "dev" || data.acces_sav === true;
}

// Gestion des colonnes/champs personnalisés du tableau SAV : admin + dev
// (comme pour le plan de l'entrepôt).
export async function peutConfigurerSav(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin" || data?.role === "dev";
}
