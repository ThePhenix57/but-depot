import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/emplacements/:id  (id = product_locations.id)
// Retire un emplacement d'un produit. Réservé aux admins/direction
// (la policy RLS "product_locations_delete_admin" le vérifie déjà côté
// base de données ; on renvoie ici un message plus clair si ce n'est pas
// un admin).
export async function DELETE(
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Seul un compte admin/direction peut supprimer un emplacement." },
      { status: 403 }
    );
  }

  // Garde le contenu avant suppression pour le journal (voir plus bas).
  const { data: avant } = await supabase
    .from("product_locations")
    .select("product_id, alveole_id, colis, type_palette")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("product_locations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (avant) {
    await supabase.from("mouvements").insert({
      type: "sortie",
      product_id: avant.product_id,
      alveole_id: avant.alveole_id,
      colis: avant.colis,
      type_palette: avant.type_palette,
      message: "Emplacement supprimé",
      created_by: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}

// PATCH /api/emplacements/:id  (id = product_locations.id)
// "Vider" un emplacement : remet son nombre de colis à 0, ce qui libère
// l'alvéole partout dans le site (toutes les requêtes filtrent déjà sur
// colis > 0 pour savoir si une alvéole est occupée). Sert à corriger le
// stock affiché ici quand un client a pris le dernier colis et que ça n'a
// été signalé que sur le PDA/gun officiel, jamais sur ce site — le site
// n'étant pas connecté en direct au stock réel de BUT. Contrairement à la
// suppression (DELETE, réservée aux admins), n'importe quel compte
// authentifié peut vider un emplacement, comme le permet déjà la policy
// RLS "product_locations_update_all".
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

  let action = "vider";
  try {
    const body = await request.json();
    if (body?.action) action = body.action;
  } catch {
    // pas de corps envoyé : on garde l'action par défaut ("vider")
  }

  if (action !== "vider") {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  // Garde le contenu avant vidage pour le journal (voir plus bas).
  const { data: avant } = await supabase
    .from("product_locations")
    .select("product_id, alveole_id, colis, type_palette")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("product_locations")
    .update({ colis: 0 })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (avant) {
    await supabase.from("mouvements").insert({
      type: "sortie",
      product_id: avant.product_id,
      alveole_id: avant.alveole_id,
      colis: avant.colis,
      type_palette: avant.type_palette,
      message: "Vidé depuis l'aperçu de zone",
      created_by: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
