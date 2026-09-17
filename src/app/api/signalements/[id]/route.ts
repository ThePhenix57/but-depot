import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/signalements/:id — marque un signalement comme traité
// (dismiss). Réservé à l'admin (policy RLS "signalements_update_admin").
export async function PATCH(
  request: NextRequest,
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

  const { error } = await supabase
    .from("signalements")
    .update({ traite: true, traite_par: user.id, traite_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut traiter un signalement." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
