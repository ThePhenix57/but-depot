import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/produits/recherche?ean=1234567890123
// Renvoie le produit (avec la liste de ses emplacements/zones) ou 404.
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
    .select("id, ean, name, created_at")
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
    .select("id, zone:zones(id, code, label, pos_x, pos_y, largeur, hauteur, couleur)")
    .eq("product_id", product.id);

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 });
  }

  return NextResponse.json({
    found: true,
    product,
    locations: (locations ?? []).map((l) => l.zone),
  });
}
