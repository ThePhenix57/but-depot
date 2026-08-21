import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", status: 401 as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Réservé aux comptes admin/direction.", status: 403 as const };
  }
  return { user };
}

// PATCH /api/employes/:id — change le rôle (employe <-> admin).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const check = await requireAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const role = body.role === "admin" ? "admin" : "employe";

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/employes/:id — supprime totalement le compte (auth + profil).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const check = await requireAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
