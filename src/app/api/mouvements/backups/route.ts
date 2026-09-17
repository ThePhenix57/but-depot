import { createClient } from "@/lib/supabase/server";
import { verifierCodeJournal } from "@/lib/adminCode";
import { NextRequest, NextResponse } from "next/server";

// POST /api/mouvements/backups — body { code }
// Liste les sauvegardes des précédentes réinitialisations du journal (qui,
// quand, pourquoi, combien de lignes, et le détail complet), après
// vérification du code admin. En POST (pas GET) pour ne jamais faire
// transiter le code dans une URL.
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
  const { valide, defini } = await verifierCodeJournal(supabase, code);
  if (!defini) {
    return NextResponse.json({ error: "Aucun code admin n'a encore été défini." }, { status: 400 });
  }
  if (!valide) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("journal_reset_backups")
    .select("id, created_at, motif, nb_lignes, contenu, auteur:profiles(full_name, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ backups: data });
}
