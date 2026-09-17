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

// PATCH /api/employes/:id — change le rôle (employe <-> admin), la date de
// naissance et/ou l'accès SAV (voir /admin/employes).
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
  const updates: Record<string, unknown> = {};
  if ("role" in body)
    updates.role = body.role === "admin" ? "admin" : body.role === "dev" ? "dev" : "employe";
  if ("date_naissance" in body) updates.date_naissance = body.date_naissance || null;
  if ("acces_sav" in body) updates.acces_sav = !!body.acces_sav;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(updates)
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
