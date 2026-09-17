import { createClient } from "@/lib/supabase/server";
import { aAccesSav, peutConfigurerSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

// GET /api/sav/colonnes — liste les colonnes du tableau SAV, dans l'ordre
// d'affichage. Accessible à tout compte ayant accès au SAV.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await aAccesSav(supabase, user.id))) {
    return NextResponse.json({ error: "Accès SAV non autorisé." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("sav_colonnes")
    .select("id, nom, ordre")
    .order("ordre", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ colonnes: data ?? [] });
}

// POST /api/sav/colonnes — crée une nouvelle colonne (admin/dev).
// Body: { nom }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await peutConfigurerSav(supabase, user.id))) {
    return NextResponse.json({ error: "Réservé aux admins/dev." }, { status: 403 });
  }

  const body = await request.json();
  const nom = String(body.nom || "").trim();
  if (!nom) return NextResponse.json({ error: "Nom de colonne obligatoire." }, { status: 400 });

  const { data: existantes } = await supabase.from("sav_colonnes").select("ordre").order("ordre", { ascending: false }).limit(1);
  const ordre = (existantes?.[0]?.ordre ?? -1) + 1;

  const { data, error } = await supabase
    .from("sav_colonnes")
    .insert({ nom, ordre })
    .select("id, nom, ordre")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ colonne: data });
}
