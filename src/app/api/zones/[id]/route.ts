import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/zones/:id — modifie une zone (position, taille, couleur, label).
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
  for (const key of ["code", "label", "pos_x", "pos_y", "largeur", "hauteur", "couleur"]) {
    if (key in body) updates[key] = body[key];
  }
  if (typeof updates.code === "string") updates.code = updates.code.toUpperCase();

  const { data, error } = await supabase
    .from("zones")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier le plan." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ zone: data });
}

// DELETE /api/zones/:id — supprime une zone du plan (et donc tous les
// emplacements de produits qui pointaient dessus, via ON DELETE CASCADE).
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

  const { error } = await supabase.from("zones").delete().eq("id", id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier le plan." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
