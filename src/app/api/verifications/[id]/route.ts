import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/verifications/:id  (id = product_locations.id)
// Confirme "ce produit est toujours là" : remet à zéro le compteur d'un
// mois (verifie_at = maintenant) et garde une trace dans le journal
// global. Accessible à tout compte connecté, comme le reste de la
// vérification périodique du stock (voir /verifications).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: emplacement, error: lectureError } = await supabase
    .from("product_locations")
    .select("product_id, alveole_id, colis, type_palette")
    .eq("id", id)
    .maybeSingle();

  if (lectureError) return NextResponse.json({ error: lectureError.message }, { status: 500 });
  if (!emplacement) {
    return NextResponse.json({ error: "Emplacement introuvable." }, { status: 404 });
  }

  const maintenant = new Date().toISOString();

  const { error } = await supabase
    .from("product_locations")
    .update({ verifie_at: maintenant })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("mouvements").insert({
    type: "verification",
    product_id: emplacement.product_id,
    alveole_id: emplacement.alveole_id,
    colis: emplacement.colis,
    type_palette: emplacement.type_palette,
    message: "Confirmé toujours en place",
    created_by: user.id,
  });

  return NextResponse.json({ ok: true, verifie_at: maintenant });
}
