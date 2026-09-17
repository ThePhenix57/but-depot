import { createClient } from "@/lib/supabase/server";
import { peutConfigurerSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/sav/champs/:id — modifie un champ personnalisé (admin/dev).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await peutConfigurerSav(supabase, user.id))) {
    return NextResponse.json({ error: "Réservé aux admins/dev." }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return NextResponse.json({ error: "Le libellé ne peut pas être vide." }, { status: 400 });
    updates.label = label;
  }
  if (body.type !== undefined) updates.type = body.type === "texte" ? "texte" : "checkbox";
  if (body.categorie !== undefined) {
    updates.categorie = body.categorie === "meuble" || body.categorie === "electromenager" ? body.categorie : null;
  }
  if (body.ordre !== undefined) updates.ordre = Number(body.ordre);

  const { data, error } = await supabase
    .from("sav_champs_perso")
    .update(updates)
    .eq("id", id)
    .select("id, label, type, categorie, ordre")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ champ: data });
}

// DELETE /api/sav/champs/:id — supprime un champ personnalisé (admin/dev).
// Les valeurs déjà saisies sur des tickets existants sont supprimées avec
// (on delete cascade) — c'est le comportement attendu pour un champ qu'on
// retire du formulaire.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await peutConfigurerSav(supabase, user.id))) {
    return NextResponse.json({ error: "Réservé aux admins/dev." }, { status: 403 });
  }

  const { error } = await supabase.from("sav_champs_perso").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
