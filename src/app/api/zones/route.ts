import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/zones — liste toutes les zones du plan (tout utilisateur connecté).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("zones")
    .select("id, code, label, pos_x, pos_y, largeur, hauteur, couleur")
    .order("code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones: data });
}

// POST /api/zones — crée une nouvelle zone sur le plan (admin uniquement,
// vérifié par la policy RLS "zones_write_admin").
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { code, label, pos_x, pos_y, largeur, hauteur, couleur } = body;

  if (!code) {
    return NextResponse.json({ error: "Le code est obligatoire." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("zones")
    .insert({
      code: String(code).toUpperCase(),
      label: label || null,
      pos_x: Number(pos_x) || 0,
      pos_y: Number(pos_y) || 0,
      largeur: Number(largeur) || 1,
      hauteur: Number(hauteur) || 1,
      couleur: couleur || "#E2001A",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce code existe déjà." }, { status: 409 });
    }
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
