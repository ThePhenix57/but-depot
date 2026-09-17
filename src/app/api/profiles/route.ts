import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/profiles — liste minimale des comptes (id, nom, rôle), pour le
// sélecteur de destinataire de la messagerie directe. Contrairement à
// /api/employes, accessible à tout compte connecté (pas seulement admin) :
// il ne renvoie ni email ni date de création.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data });
}
