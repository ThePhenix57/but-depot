import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/me — identité + rôle du compte connecté. Sert au client (pages
// "use client") qui n'a pas accès direct à la session serveur, par exemple
// pour savoir s'il faut afficher l'onglet "Admin" de la messagerie.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, acces_sav")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    id: user.id,
    full_name: profile?.full_name || user.email || null,
    role: profile?.role || "employe",
    // true pour admin/dev même si la case n'est pas cochée (voir
    // src/lib/sav.ts côté serveur) — pratique pour le client qui n'a qu'à
    // vérifier ce booléen sans reconnaître le rôle en plus.
    acces_sav: profile?.role === "admin" || profile?.role === "dev" || !!profile?.acces_sav,
  });
}
