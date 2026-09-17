import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/produits/:id — modifie une fiche produit (nom, catégorie,
// poids/colis, colis par palette). Réservé à l'admin (policy RLS
// "products_update_admin").
export async function PATCH(
  request: NextRequest,
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

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if ("name" in body) updates.name = String(body.name).trim();
  if ("category_id" in body) updates.category_id = body.category_id || null;
  if ("poids_colis_kg" in body)
    updates.poids_colis_kg = body.poids_colis_kg === "" || body.poids_colis_kg == null ? null : Number(body.poids_colis_kg);
  if ("colis_par_palette_eur" in body)
    updates.colis_par_palette_eur =
      body.colis_par_palette_eur === "" || body.colis_par_palette_eur == null ? null : Number(body.colis_par_palette_eur);
  if ("colis_par_palette_centrale" in body)
    updates.colis_par_palette_centrale =
      body.colis_par_palette_centrale === "" || body.colis_par_palette_centrale == null
        ? null
        : Number(body.colis_par_palette_centrale);
  if ("palette_conseillee" in body)
    updates.palette_conseillee =
      body.palette_conseillee === "eur" || body.palette_conseillee === "centrale" ? body.palette_conseillee : null;
  if ("colis_multiples" in body) updates.colis_multiples = body.colis_multiples === true;
  if ("nb_colis_par_meuble" in body)
    updates.nb_colis_par_meuble =
      body.nb_colis_par_meuble === "" || body.nb_colis_par_meuble == null ? null : Number(body.nb_colis_par_meuble);

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select(
      "id, ean, name, category_id, poids_colis_kg, colis_par_palette_eur, colis_par_palette_centrale, palette_conseillee, colis_multiples, nb_colis_par_meuble"
    )
    .single();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier une fiche produit." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
