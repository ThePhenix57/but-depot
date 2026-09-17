import { createClient } from "@/lib/supabase/server";
import { peutConfigurerSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/sav/colonnes/:id — renomme et/ou déplace une colonne
// (admin/dev). Body: { nom?, ordre? }
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
  if (body.nom !== undefined) {
    const nom = String(body.nom).trim();
    if (!nom) return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });
    updates.nom = nom;
  }
  if (body.ordre !== undefined) updates.ordre = Number(body.ordre);

  const { data, error } = await supabase
    .from("sav_colonnes")
    .update(updates)
    .eq("id", id)
    .select("id, nom, ordre")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ colonne: data });
}

// DELETE /api/sav/colonnes/:id — supprime une colonne (admin/dev). Les
// tickets qu'elle contient doivent être déplacés avant (la contrainte de
// clé étrangère empêche une suppression avec des tickets dedans, pour ne
// jamais perdre un ticket silencieusement).
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

  const { count } = await supabase
    .from("sav_tickets")
    .select("id", { count: "exact", head: true })
    .eq("colonne_id", id);
  if (count && count > 0) {
    return NextResponse.json(
      { error: `Déplace d'abord le(s) ${count} ticket(s) de cette colonne avant de la supprimer.` },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("sav_colonnes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
