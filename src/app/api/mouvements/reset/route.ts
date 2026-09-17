import { createClient } from "@/lib/supabase/server";
import { verifierCodeJournal } from "@/lib/adminCode";
import { NextRequest, NextResponse } from "next/server";

// POST /api/mouvements/reset — body { code, motif }
// Vide tout le journal des rangements, après vérification du code admin.
// Garde une sauvegarde complète (qui, quand, pourquoi, et tout le contenu
// effacé) dans journal_reset_backups avant de supprimer quoi que ce soit.
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
  const motif = String(body.motif || "").trim();

  if (!motif) {
    return NextResponse.json({ error: "Indique une raison pour cette réinitialisation." }, { status: 400 });
  }

  const { valide, defini } = await verifierCodeJournal(supabase, code);
  if (!defini) {
    return NextResponse.json(
      { error: "Aucun code admin n'a encore été défini. Défini-le d'abord ci-dessous." },
      { status: 400 }
    );
  }
  if (!valide) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 403 });
  }

  const { data: tout, error: lectureError } = await supabase
    .from("mouvements")
    .select(
      `id, type, colis, type_palette, message, created_at,
       product:products(ean, name),
       alveole:alveoles(code, zone:zones(code, label)),
       auteur:profiles(full_name, email)`
    )
    .order("created_at", { ascending: false });

  if (lectureError) return NextResponse.json({ error: lectureError.message }, { status: 500 });

  const { error: backupError } = await supabase.from("journal_reset_backups").insert({
    created_by: user.id,
    motif,
    nb_lignes: tout?.length ?? 0,
    contenu: tout ?? [],
  });
  if (backupError) return NextResponse.json({ error: backupError.message }, { status: 500 });

  // .not("id", "is", null) matche toutes les lignes (PostgREST refuse un
  // delete sans condition) — vide bien toute la table.
  const { error: deleteError } = await supabase.from("mouvements").delete().not("id", "is", null);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true, nbLignes: tout?.length ?? 0 });
}
