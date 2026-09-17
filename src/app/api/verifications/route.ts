import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/verifications
// Liste tous les emplacements occupés dont personne n'a confirmé la
// présence depuis plus d'un mois (voir /verifications). Accessible à tout
// compte connecté — ce n'est pas une page admin, n'importe quel employé
// peut aller vérifier physiquement et cocher.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const seuil = new Date();
  seuil.setMonth(seuil.getMonth() - 1);

  const { data, error } = await supabase
    .from("product_locations")
    .select(
      `id, colis, verifie_at, added_at,
       product:products(id, name, ean),
       alveole:alveoles(id, code, zone:zones(id, code, label))`
    )
    .gt("colis", 0)
    .lte("verifie_at", seuil.toISOString())
    .order("verifie_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ emplacements: data ?? [] });
}
