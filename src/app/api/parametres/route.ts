import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/parametres — lit les réglages globaux (une seule ligne).
// Accessible à tout compte connecté : sert entre autres à générer le QR
// code d'une alvéole avec le bon préfixe partout où il est affiché
// (impression, fiche produit, journal).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("parametres")
    .select("qr_prefixe_alveole")
    .eq("id", true)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ parametres: data });
}

// PATCH /api/parametres — modifie les réglages globaux. Réservé aux admins
// (policy RLS "parametres_update_admin").
// Body: { qrPrefixeAlveole }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux admins." }, { status: 403 });
  }

  const body = await request.json();
  const qrPrefixeAlveole = String(body.qrPrefixeAlveole ?? "");

  const { data, error } = await supabase
    .from("parametres")
    .update({ qr_prefixe_alveole: qrPrefixeAlveole, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("qr_prefixe_alveole")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ parametres: data });
}
