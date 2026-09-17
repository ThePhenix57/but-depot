import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/zones-speciales/:id — modifie le type/nom/identifiant d'une
// zone spéciale (admin/dev).
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
  if ("type" in body && ["tampon", "drive", "cam", "chariot", "autre"].includes(body.type)) {
    updates.type = body.type;
  }
  if ("nom" in body) updates.nom = String(body.nom).trim();
  if ("identifiant" in body) updates.identifiant = String(body.identifiant).trim();

  const { data, error } = await supabase
    .from("zones_speciales")
    .update(updates)
    .eq("id", id)
    .select("id, type, nom, identifiant, created_at")
    .single();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/dev peut modifier une zone spéciale." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ zoneSpeciale: data });
}

// DELETE /api/zones-speciales/:id — supprime une zone spéciale (admin
// uniquement, policy RLS "zones_speciales_delete_admin").
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

  const { error } = await supabase.from("zones_speciales").delete().eq("id", id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seule la direction (admin) peut supprimer une zone spéciale." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
