import { createClient } from "@/lib/supabase/server";
import { verifierCodeJournal } from "@/lib/adminCode";
import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/code-journal/verifier — vérifie un code sans rien faire
// d'autre (utilisé pour valider avant d'afficher un formulaire, par ex).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux admins." }, { status: 403 });
  }

  const body = await request.json();
  const code = String(body.code || "").trim();
  const resultat = await verifierCodeJournal(supabase, code);
  return NextResponse.json(resultat);
}
