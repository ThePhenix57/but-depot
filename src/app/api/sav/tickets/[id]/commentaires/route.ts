import { createClient } from "@/lib/supabase/server";
import { aAccesSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

// POST /api/sav/tickets/:id/commentaires — ajoute un commentaire au fil de
// discussion du ticket (façon Trello). Body: { texte }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await aAccesSav(supabase, user.id))) {
    return NextResponse.json({ error: "Accès SAV non autorisé." }, { status: 403 });
  }

  const body = await request.json();
  const texte = String(body.texte || "").trim();
  if (!texte) return NextResponse.json({ error: "Commentaire vide." }, { status: 400 });

  const { data, error } = await supabase
    .from("sav_commentaires")
    .insert({ ticket_id: id, auteur_id: user.id, texte })
    .select("id, ticket_id, auteur_id, texte, created_at, auteur:profiles!sav_commentaires_auteur_id_fkey(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ commentaire: data });
}
