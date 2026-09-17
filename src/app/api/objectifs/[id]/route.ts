import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/objectifs/:id — supprime un objectif/tâche. Réservé aux
// admins (policy RLS "objectifs_delete_admin").
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

  const { error } = await supabase.from("objectifs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
