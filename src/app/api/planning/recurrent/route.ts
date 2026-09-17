import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/planning/recurrent — liste tous les horaires habituels (tous
// employés confondus). Accessible à tout compte connecté : /planning et la
// page d'accueil en ont besoin pour calculer l'horaire du jour de chacun.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("planning_recurrent")
    .select(
      "id, employe_id, jour_semaine, heure_debut, heure_fin, pause_debut, pause_fin, employe:profiles!planning_recurrent_employe_id_fkey(full_name, email)"
    )
    .order("jour_semaine", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurrents: data ?? [] });
}

// POST /api/planning/recurrent — crée ou remplace l'horaire habituel d'un
// employé pour un jour de semaine donné ("pour toujours" : s'applique à
// toutes les semaines à venir tant que ce n'est pas changé ici, ou
// exceptionné pour une semaine précise dans /admin/planning). Réservé aux
// admins.
// Body: { employeId, jourSemaine (1-7), heureDebut, heureFin, pauseDebut?, pauseFin? }
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
  const jourSemaine = Number(body.jourSemaine);
  const heureDebut = String(body.heureDebut || "").trim();
  const heureFin = String(body.heureFin || "").trim();
  const pauseDebut = body.pauseDebut ? String(body.pauseDebut).trim() : null;
  const pauseFin = body.pauseFin ? String(body.pauseFin).trim() : null;

  if (!employeId || !jourSemaine || jourSemaine < 1 || jourSemaine > 7 || !heureDebut || !heureFin) {
    return NextResponse.json(
      { error: "Employé, jour de semaine, heure de début et heure de fin sont obligatoires." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("planning_recurrent")
    .upsert(
      {
        employe_id: employeId,
        jour_semaine: jourSemaine,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        pause_debut: pauseDebut,
        pause_fin: pauseFin,
        created_by: user.id,
      },
      { onConflict: "employe_id,jour_semaine" }
    )
    .select(
      "id, employe_id, jour_semaine, heure_debut, heure_fin, pause_debut, pause_fin, employe:profiles!planning_recurrent_employe_id_fkey(full_name, email)"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurrent: data });
}
