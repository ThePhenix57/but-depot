import type { SupabaseClient } from "@supabase/supabase-js";

// Cherche une alvéole par son code exact.
export async function findAlveoleByCode(supabase: SupabaseClient, code: string) {
  return supabase
    .from("alveoles")
    .select("id, zone_id, code, capacite_kg, taille_palette_max")
    .eq("code", code)
    .maybeSingle();
}

// Crée une alvéole dans une zone donnée (utilisé quand l'employé tape un
// code d'alvéole qui n'existe pas encore, ou par l'admin).
export async function createAlveole(
  supabase: SupabaseClient,
  params: {
    zoneId: string;
    code: string;
    capaciteKg?: number | null;
    taillePaletteMax?: string | null;
  }
) {
  return supabase
    .from("alveoles")
    .insert({
      zone_id: params.zoneId,
      code: params.code,
      capacite_kg: params.capaciteKg ?? null,
      taille_palette_max: params.taillePaletteMax ?? null,
    })
    .select("id, zone_id, code, capacite_kg, taille_palette_max")
    .single();
}

// Poids actuellement stocké dans une alvéole (toutes marchandises confondues)
// via la vue alveole_occupancy.
export async function getOccupancy(supabase: SupabaseClient, alveoleId: string) {
  return supabase
    .from("alveole_occupancy")
    .select("alveole_id, zone_id, code, capacite_kg, poids_actuel_kg, nb_produits_differents")
    .eq("alveole_id", alveoleId)
    .maybeSingle();
}

// Ajoute (ou augmente) le nombre de colis d'un produit dans une alvéole.
// Si le produit est déjà rangé dans cette alvéole, on additionne les colis
// (une palette de plus au même endroit) plutôt que de créer une deuxième
// ligne, comme le faisait le classeur Google Sheets pour les emplacements.
export async function ajouterColis(
  supabase: SupabaseClient,
  params: {
    productId: string;
    alveoleId: string;
    colis: number;
    typePalette: string;
    addedBy: string;
  }
) {
  const { data: existing, error: findError } = await supabase
    .from("product_locations")
    .select("id, colis")
    .eq("product_id", params.productId)
    .eq("alveole_id", params.alveoleId)
    .maybeSingle();

  if (findError) return { error: findError.message };

  if (existing) {
    const { data, error } = await supabase
      .from("product_locations")
      .update({ colis: existing.colis + params.colis, type_palette: params.typePalette })
      .eq("id", existing.id)
      .select("id, colis")
      .single();
    if (error) return { error: error.message };
    return { data };
  }

  const { data, error } = await supabase
    .from("product_locations")
    .insert({
      product_id: params.productId,
      alveole_id: params.alveoleId,
      colis: params.colis,
      type_palette: params.typePalette,
      added_by: params.addedBy,
    })
    .select("id, colis")
    .single();
  if (error) return { error: error.message };
  return { data };
}
