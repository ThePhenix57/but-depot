import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/planning?from=YYYY-MM-DD&to=YYYY-MM-DD
// Liste les horaires sur une période (une semaine typiquement). Accessible
// à tout compte connecté — tout le monde peut consulter le planning de
// l'équipe, pas seulement le sien (voir /planning).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  let query = supabase
    .from("plannings")
    .select("id, employe_id, date, heure_debut, heure_fin, pause_debut, pause_fin, repos, employe:profiles!plannings_employe_id_fkey(full_name, email)")
    .order("date", { ascending: true })
    .order("heure_debut", { ascending: true });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plannings: data ?? [] });
}

// POST /api/planning — crée un horaire. Réservé aux admins (policy RLS
// "plannings_insert_admin").
// Body: { employeId, date, heureDebut, heureFin, pauseDebut?, pauseFin? }
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
  const employeId = String(body.employeId || "").trim();
  const date = String(body.date || "").trim();
  const repos = !!body.repos;
  // Un jour de repos n'a pas besoin d'heures : on stocke "00:00" pour
  // respecter la contrainte not null, mais horairesEffectifs les ignore
  // dès que repos=true.
  const heureDebut = repos ? "00:00" : String(body.heureDebut || "").trim();
  const heureFin = repos ? "00:00" : String(body.heureFin || "").trim();
  const pauseDebut = !repos && body.pauseDebut ? String(body.pauseDebut).trim() : null;
  const pauseFin = !repos && body.pauseFin ? String(body.pauseFin).trim() : null;

  if (!employeId || !date || (!repos && (!heureDebut || !heureFin))) {
    return NextResponse.json(
      { error: "Employé, date, heure de début et heure de fin sont obligatoires." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("plannings")
    .insert({
      employe_id: employeId,
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      pause_debut: pauseDebut,
      pause_fin: pauseFin,
      repos,
      created_by: user.id,
    })
    .select("id, employe_id, date, heure_debut, heure_fin, pause_debut, pause_fin, repos, employe:profiles!plannings_employe_id_fkey(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ planning: data });
}

