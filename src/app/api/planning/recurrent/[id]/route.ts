import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/planning/recurrent/:id — supprime un horaire habituel
// (l'employé n'aura alors plus d'horaire par défaut ce jour-là, sauf
// exception ponctuelle posée pour une semaine précise). Réservé aux admins.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { error } = await supabase.from("planning_recurrent").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
