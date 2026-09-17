import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/signalements — liste les signalements actifs (pas expirés, pas
// traités), avec l'alvéole et la zone concernées. Utilisé par la page admin
// et par tout employé qui veut voir les alertes en cours.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("signalements")
    .select(
      "id, alveole_id, message, created_by, created_at, expires_at, traite, alveole:alveoles(id, code, zone_id, zone:zones(id, code, label))"
    )
    .eq("traite", false)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signalements: data });
}

// POST /api/signalements — un employé (ou admin) signale un problème sur
// une alvéole. Body: { alveoleId, message, expiresInHours? } (pas de
// expiresInHours = ne disparaît jamais tout seul).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const alveoleId = String(body.alveoleId || "").trim();
  const message = String(body.message || "").trim();
  const expiresInHours = body.expiresInHours != null ? Number(body.expiresInHours) : null;

  if (!alveoleId || !message) {
    return NextResponse.json({ error: "Alvéole et message sont obligatoires." }, { status: 400 });
  }

  const expiresAt =
    expiresInHours && expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()
      : null;

  const { data, error } = await supabase
    .from("signalements")
    .insert({
      alveole_id: alveoleId,
      message,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("id, alveole_id, message, created_at, expires_at, traite")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trace aussi dans le journal global (voir /admin/journal) pour avoir
  // tout l'historique d'une alvéole (rangement/sortie/vérification/
  // signalement) au même endroit.
  await supabase.from("mouvements").insert({
    type: "signalement",
    alveole_id: alveoleId,
    message,
    created_by: user.id,
  });

  return NextResponse.json({ signalement: data });
}
