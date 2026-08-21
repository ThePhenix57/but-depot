import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/produits/recherche?ean=1234567890123
// Renvoie le produit (avec ses emplacements détaillés : alvéole + zone +
// nombre de colis) et les zones suggérées d'après sa catégorie.
export async function GET(request: NextRequest) {
  const ean = request.nextUrl.searchParams.get("ean")?.trim();
  if (!ean) {
    return NextResponse.json({ error: "Code EAN manquant" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      "id, ean, name, category_id, poids_colis_kg, colis_par_palette_eur, colis_par_palette_centrale, created_at"
    )
    .eq("ean", ean)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json({ found: false });
  }

  const { data: locations, error: locError } = await supabase
    .from("product_locations")
    .select(
      "id, product_id, alveole_id, colis, type_palette, alveole:alveoles(id, zone_id, code, capacite_kg, taille_palette_max, zone:zones(id, code, label, pos_x, pos_y, largeur, hauteur, couleur))"
    )
    .eq("product_id", product.id)
    .gt("colis", 0);

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 });
  }

  let suggestedZoneIds: string[] = [];
  if (product.category_id) {
    const { data: links } = await supabase
      .from("category_zones")
      .select("zone_id")
      .eq("category_id", product.category_id);
    suggestedZoneIds = (links ?? []).map((l) => l.zone_id);
  }

  return NextResponse.json({
    found: true,
    product,
    locations: locations ?? [],
    suggestedZoneIds,
  });
}
