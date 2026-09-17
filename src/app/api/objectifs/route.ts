import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/objectifs?semaine=YYYY-MM-DD — liste les objectifs/tâches d'une
// semaine (le lundi de cette semaine). Accessible à tout compte connecté :
// tout le monde voit les objectifs d'équipe et les tâches de chacun (comme
// le planning).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const semaine = request.nextUrl.searchParams.get("semaine");
  if (!semaine) {
    return NextResponse.json({ error: "Paramètre semaine obligatoire." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("objectifs")
    .select("id, semaine_debut, employe_id, date, texte, created_at, employe:profiles!objectifs_employe_id_fkey(full_name, email)")
    .eq("semaine_debut", semaine)
    .order("date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ objectifs: data ?? [] });
}

// POST /api/objectifs — crée un objectif/tâche. Réservé aux admins (policy
// RLS "objectifs_insert_admin").
// Body: { semaineDebut, employeId?, date?, texte }
export async function POST(request: NextRequest) {
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
  const semaineDebut = String(body.semaineDebut || "").trim();
  const employeId = body.employeId ? String(body.employeId).trim() : null;
  const date = body.date ? String(body.date).trim() : null;
  const texte = String(body.texte || "").trim();

  if (!semaineDebut || !texte) {
    return NextResponse.json({ error: "Semaine et texte sont obligatoires." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("objectifs")
    .insert({
      semaine_debut: semaineDebut,
      employe_id: employeId,
      date,
      texte,
      created_by: user.id,
    })
    .select("id, semaine_debut, employe_id, date, texte, created_at, employe:profiles!objectifs_employe_id_fkey(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ objectif: data });
}
