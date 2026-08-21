import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/alveoles/:id — modifie une alvéole (capacité, taille max, zone).
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
  if ("code" in body) updates.code = String(body.code).toUpperCase();
  if ("zone_id" in body) updates.zone_id = body.zone_id;
  if ("capacite_kg" in body)
    updates.capacite_kg = body.capacite_kg === "" || body.capacite_kg == null ? null : Number(body.capacite_kg);
  if ("taille_palette_max" in body) updates.taille_palette_max = body.taille_palette_max || null;

  const { data, error } = await supabase
    .from("alveoles")
    .update(updates)
    .eq("id", id)
    .select("id, zone_id, code, capacite_kg, taille_palette_max")
    .single();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier les alvéoles." },
        { status: 403 }
      );
    }
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce code d'alvéole existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alveole: data });
}

// DELETE /api/alveoles/:id
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

  const { error } = await supabase.from("alveoles").delete().eq("id", id);
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier les alvéoles." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
