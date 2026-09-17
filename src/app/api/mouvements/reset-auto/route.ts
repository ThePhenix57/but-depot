import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/mouvements/reset-auto — appelée automatiquement chaque semaine
// par Vercel Cron (voir vercel.json, "0 23 * * 0" = dimanche 23h UTC, ~lundi
// 00h/01h heure de Paris selon l'heure d'été/hiver — Vercel Cron ne gère
// pas les fuseaux horaires, donc l'heure exacte glisse d'une heure entre
// été et hiver, mais ça reste bien "début de semaine, heure de Paris").
//
// Fait exactement ce que fait la réinitialisation manuelle depuis
// /admin/journal (voir /api/mouvements/reset) : sauvegarde tout le journal
// dans journal_reset_backups puis le vide, sans code admin puisque c'est le
// site lui-même qui déclenche l'action (protégé par CRON_SECRET à la
// place — voir DEPLOIEMENT.md pour la configurer sur Vercel).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();

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

  // Rien à faire : évite une sauvegarde vide inutile chaque semaine si le
  // journal n'a pas bougé (ou vient déjà d'être réinitialisé).
  if (!tout || tout.length === 0) {
    return NextResponse.json({ ok: true, nbLignes: 0, ignore: true });
  }

  const { error: backupError } = await supabase.from("journal_reset_backups").insert({
    created_by: null,
    motif: "Réinitialisation automatique hebdomadaire (chaque lundi, heure de Paris).",
    nb_lignes: tout.length,
    contenu: tout,
  });
  if (backupError) return NextResponse.json({ error: backupError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from("mouvements").delete().not("id", "is", null);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true, nbLignes: tout.length });
}
