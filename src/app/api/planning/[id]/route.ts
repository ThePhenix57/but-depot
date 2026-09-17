import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", status: 401 as const };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: "Réservé aux admins.", status: 403 as const };
  }
  return { user };
}

// PATCH /api/planning/:id — modifie un horaire existant. Réservé aux admins.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const repos = "repos" in body ? !!body.repos : undefined;

  const updates: Record<string, unknown> = {};
  if (repos !== undefined) updates.repos = repos;
  if (repos) {
    // Jour de repos : on ignore les heures/pauses envoyées, elles ne
    // servent à rien tant que repos=true (voir horairesEffectifs).
    updates.heure_debut = "00:00";
    updates.heure_fin = "00:00";
    updates.pause_debut = null;
    updates.pause_fin = null;
  } else {
    if ("heureDebut" in body) updates.heure_debut = body.heureDebut;
    if ("heureFin" in body) updates.heure_fin = body.heureFin;
    if ("pauseDebut" in body) updates.pause_debut = body.pauseDebut || null;
    if ("pauseFin" in body) updates.pause_fin = body.pauseFin || null;
  }

  const { data, error } = await supabase
    .from("plannings")
    .update(updates)
    .eq("id", id)
    .select("id, employe_id, date, heure_debut, heure_fin, pause_debut, pause_fin, repos, employe:profiles!plannings_employe_id_fkey(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ planning: data });
}

// DELETE /api/planning/:id — supprime un horaire. Réservé aux admins.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("plannings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
