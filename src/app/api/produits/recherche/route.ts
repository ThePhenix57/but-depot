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

  const champsProduit =
    "id, ean, name, category_id, poids_colis_kg, colis_par_palette_eur, colis_par_palette_centrale, palette_conseillee, created_at, colis_multiples, nb_colis_par_meuble";

  let product: {
    id: string;
    ean: string;
    name: string;
    category_id: string | null;
    poids_colis_kg: number | null;
    colis_par_palette_eur: number | null;
    colis_par_palette_centrale: number | null;
    created_at: string;
    colis_multiples: boolean;
    nb_colis_par_meuble: number | null;
  } | null = null;
  // Renseigné si le code scanné est un code "colis" plus long que l'EAN-13
  // du produit (meuble livré en plusieurs colis, voir colis_multiples) —
  // les 2 derniers chiffres sont le numéro de colis, juste informatif.
  let numeroColisScanne: string | null = null;

  // Un "%" dans le code tapé veut dire "cherche par la fin du code" (comme
  // dans le journal des rangements) : "%42569" trouve tout EAN qui se
  // termine par ces chiffres, même s'il y en a plusieurs qui correspondent
  // — dans ce cas on renvoie la liste pour que l'employé choisisse.
  if (ean.includes("%")) {
    const { data: candidats, error: candidatsError } = await supabase
      .from("products")
      .select(champsProduit)
      .ilike("ean", ean)
      .limit(20);

    if (candidatsError) {
      return NextResponse.json({ error: candidatsError.message }, { status: 500 });
    }
    if (!candidats || candidats.length === 0) {
      return NextResponse.json({ found: false });
    }
    if (candidats.length > 1) {
      return NextResponse.json({ found: "multiple", options: candidats });
    }
    product = candidats[0];
  } else {
    const { data: exact, error: productError } = await supabase
      .from("products")
      .select(champsProduit)
      .eq("ean", ean)
      .maybeSingle();

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    if (exact) {
      product = exact;
    } else if (/^\d+$/.test(ean) && ean.length > 13) {
      // Pas de correspondance exacte, mais le code est plus long qu'un
      // EAN-13 classique : c'est peut-être un code "colis" d'un meuble
      // livré en plusieurs colis (EAN-13 + 2 chiffres de numéro de colis
      // collés derrière, ex: "123456789012001" -> EAN "1234567890120",
      // colis "01"). On retente avec les 13 premiers chiffres.
      const eanBase = ean.slice(0, 13);
      const { data: candidat, error: candidatError } = await supabase
        .from("products")
        .select(champsProduit)
        .eq("ean", eanBase)
        .eq("colis_multiples", true)
        .maybeSingle();
      if (candidatError) {
        return NextResponse.json({ error: candidatError.message }, { status: 500 });
      }
      if (candidat) {
        product = candidat;
        numeroColisScanne = ean.slice(13);
      }
    }

    if (!product) {
      return NextResponse.json({ found: false });
    }
  }

  const { data: locations, error: locError } = await supabase
    .from("product_locations")
    .select(
      "id, product_id, alveole_id, colis, type_palette, alveole:alveoles(id, zone_id, code, capacite_kg, taille_palette_max, zone:zones(id, code, label, couleur))"
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
    numeroColisScanne,
  });
}
