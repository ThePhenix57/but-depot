import { createClient } from "@/lib/supabase/server";
import { aAccesSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

// POST /api/sav/tickets/reorder — glisser-déposer une carte sur le
// tableau : met à jour la colonne et l'ordre de plusieurs tickets en une
// fois (le ticket déplacé + les autres cartes de la/les colonne(s)
// concernée(s), pour garder un ordre propre).
// Body: { updates: { id: string, colonneId: string, ordre: number }[] }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await aAccesSav(supabase, user.id))) {
    return NextResponse.json({ error: "Accès SAV non autorisé." }, { status: 403 });
  }

  const body = await request.json();
  const updates: { id: string; colonneId: string; ordre: number }[] = Array.isArray(body.updates) ? body.updates : [];
  if (updates.length === 0) {
    return NextResponse.json({ error: "Aucune mise à jour fournie." }, { status: 400 });
  }

  // Supabase n'a pas de "update multi-lignes en une requête" simple côté
  // client JS — on fait une petite série d'updates en parallèle (le volume
  // par déplacement reste faible, une seule colonne à la fois en général).
  const resultats = await Promise.all(
    updates.map((u) =>
      supabase
        .from("sav_tickets")
        .update({ colonne_id: u.colonneId, ordre: u.ordre, updated_at: new Date().toISOString() })
        .eq("id", u.id)
    )
  );
  const erreur = resultats.find((r) => r.error);
  if (erreur?.error) return NextResponse.json({ error: erreur.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
