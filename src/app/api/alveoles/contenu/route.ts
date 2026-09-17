import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/alveoles/contenu?zoneId=... — pour chaque alvéole d'une zone,
// la liste des produits qui y sont actuellement stockés (nom, EAN, nombre
// de colis). Sert à l'aperçu d'une travée/zone (clic sur le plan dans
// /recherche) : voir ce qu'il y a dans chaque alvéole sans devoir chercher
// un produit précis d'abord.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const zoneId = request.nextUrl.searchParams.get("zoneId");
  if (!zoneId) {
    return NextResponse.json({ error: "zoneId manquant" }, { status: 400 });
  }

  const { data: alveolesZone, error: alvError } = await supabase
    .from("alveoles")
    .select("id")
    .eq("zone_id", zoneId);
  if (alvError) return NextResponse.json({ error: alvError.message }, { status: 500 });

  const alveoleIds = (alveolesZone ?? []).map((a) => a.id);
  if (alveoleIds.length === 0) {
    return NextResponse.json({ contenu: [] });
  }

  const { data, error } = await supabase
    .from("product_locations")
    .select("id, alveole_id, colis, type_palette, product:products(id, name, ean)")
    .in("alveole_id", alveoleIds)
    .gt("colis", 0);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contenu: data ?? [] });
}
