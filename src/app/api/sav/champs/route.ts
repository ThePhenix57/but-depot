import { createClient } from "@/lib/supabase/server";
import { aAccesSav, peutConfigurerSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

// GET /api/sav/champs — liste les champs personnalisés (cases à
// cocher/texte) du formulaire de ticket SAV.
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
    .from("sav_champs_perso")
    .select("id, label, type, categorie, ordre")
    .order("ordre", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ champs: data ?? [] });
}

// POST /api/sav/champs — crée un champ personnalisé (admin/dev).
// Body: { label, type: "checkbox" | "texte", categorie: "meuble" | "electromenager" | null }
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
  const label = String(body.label || "").trim();
  const type = body.type === "texte" ? "texte" : "checkbox";
  const categorie = body.categorie === "meuble" || body.categorie === "electromenager" ? body.categorie : null;

  if (!label) return NextResponse.json({ error: "Le libellé du champ est obligatoire." }, { status: 400 });

  const { data: existants } = await supabase.from("sav_champs_perso").select("ordre").order("ordre", { ascending: false }).limit(1);
  const ordre = (existants?.[0]?.ordre ?? -1) + 1;

  const { data, error } = await supabase
    .from("sav_champs_perso")
    .insert({ label, type, categorie, ordre })
    .select("id, label, type, categorie, ordre")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ champ: data });
}
