import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/produits
// Body: { ean, name, categoryId?, poidsColisKg?, colisParPaletteEur?, colisParPaletteCentrale? }
// Crée uniquement la fiche produit. Le rangement (choix d'alvéole, nombre
// de palettes) se fait ensuite via /api/rangement — ça permet de réutiliser
// exactement le même flux de rangement pour un produit neuf ou existant.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const ean = String(body.ean || "").trim();
  const name = String(body.name || "").trim();
  const categoryId = body.categoryId || null;
  const poidsColisKg = body.poidsColisKg != null && body.poidsColisKg !== "" ? Number(body.poidsColisKg) : null;
  const colisParPaletteEur =
    body.colisParPaletteEur != null && body.colisParPaletteEur !== "" ? Number(body.colisParPaletteEur) : null;
  const colisParPaletteCentrale =
    body.colisParPaletteCentrale != null && body.colisParPaletteCentrale !== ""
      ? Number(body.colisParPaletteCentrale)
      : null;
  const paletteConseillee =
    body.paletteConseillee === "eur" || body.paletteConseillee === "centrale" ? body.paletteConseillee : null;
  const colisMultiples = body.colisMultiples === true;
  const nbColisParMeuble =
    body.nbColisParMeuble != null && body.nbColisParMeuble !== "" ? Number(body.nbColisParMeuble) : null;

  if (!ean || !name) {
    return NextResponse.json({ error: "Code EAN et nom sont obligatoires." }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      ean,
      name,
      category_id: categoryId,
      poids_colis_kg: poidsColisKg,
      colis_par_palette_eur: colisParPaletteEur,
      colis_par_palette_centrale: colisParPaletteCentrale,
      palette_conseillee: paletteConseillee,
      colis_multiples: colisMultiples,
      nb_colis_par_meuble: nbColisParMeuble,
      created_by: user.id,
    })
    .select(
      "id, ean, name, category_id, poids_colis_kg, colis_par_palette_eur, colis_par_palette_centrale, palette_conseillee, created_at, colis_multiples, nb_colis_par_meuble"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce code EAN existe déjà dans la base." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product });
}

// GET /api/produits — liste tous les produits (utilisé par /admin/produits).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, ean, name, category_id, poids_colis_kg, colis_par_palette_eur, colis_par_palette_centrale, palette_conseillee, created_at, colis_multiples, nb_colis_par_meuble"
    )
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}
