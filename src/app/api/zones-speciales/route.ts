import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/zones-speciales — liste toutes les zones spéciales (tampon,
// Drive, CAM, chariot...). Accessible à tout compte connecté (consultation
// pour scanner/imprimer un QR), la création/modification/suppression reste
// réservée admin/dev — voir migration_021_zones_speciales.sql.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("zones_speciales")
    .select("id, type, nom, identifiant, created_at")
    .order("nom");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zonesSpeciales: data });
}

// POST /api/zones-speciales — crée une zone spéciale (admin/dev, policy RLS
// "zones_speciales_write_admin_dev"). Body: { type, nom, identifiant }.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const nom = String(body.nom || "").trim();
  const identifiant = String(body.identifiant || "").trim();
  const type = ["tampon", "drive", "cam", "chariot", "autre"].includes(body.type) ? body.type : "autre";

  if (!nom || !identifiant) {
    return NextResponse.json({ error: "Le nom et l'identifiant sont obligatoires." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("zones_speciales")
    .insert({ type, nom, identifiant, created_by: user.id })
    .select("id, type, nom, identifiant, created_at")
    .single();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/dev peut créer une zone spéciale." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ zoneSpeciale: data });
}
