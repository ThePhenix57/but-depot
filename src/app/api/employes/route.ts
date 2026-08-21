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

// GET /api/employes — liste tous les comptes (admin uniquement).
export async function GET() {
  const check = await requireAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employes: data });
}

// POST /api/employes — crée un nouveau compte employé/admin et lui envoie
// un email d'invitation Supabase pour qu'il choisisse son mot de passe.
// Body: { email, full_name, role }
export async function POST(request: NextRequest) {
  const check = await requireAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const full_name = String(body.full_name || "").trim();
  const role = body.role === "admin" ? "admin" : "employe";

  if (!email || !full_name) {
    return NextResponse.json(
      { error: "Email et nom complet sont obligatoires." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data.user });
}
