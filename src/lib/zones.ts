import type { SupabaseClient } from "@supabase/supabase-js";

// Cherche une zone par son code ; si elle n'existe pas encore sur le plan,
// la crée automatiquement à la suite de la grille (l'admin pourra ensuite
// la repositionner proprement depuis /admin/zones).
export async function findOrCreateZone(supabase: SupabaseClient, code: string) {
  const { data: existing, error: findError } = await supabase
    .from("zones")
    .select("id, code, label, pos_x, pos_y, largeur, hauteur, couleur")
    .eq("code", code)
    .maybeSingle();

  if (findError) return { error: findError.message };
  if (existing) return existing;

  const { data: maxRow } = await supabase
    .from("zones")
    .select("pos_x")
    .order("pos_x", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosX = maxRow ? Number(maxRow.pos_x) + 1 : 0;

  const { data: created, error: createError } = await supabase
    .from("zones")
    .insert({ code, pos_x: nextPosX, pos_y: 0, largeur: 1, hauteur: 1 })
    .select("id, code, label, pos_x, pos_y, largeur, hauteur, couleur")
    .single();

  if (createError) return { error: createError.message };
  return created;
}
