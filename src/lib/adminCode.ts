import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Petit utilitaire pour le code admin qui protège la réinitialisation du
// journal des rangements (voir migration_008). Le code n'est jamais stocké
// en clair : on garde seulement son empreinte (hash) avec un sel aléatoire
// propre à chaque définition du code.
export function genererSel(): string {
  return randomBytes(16).toString("hex");
}

export function hasherCode(code: string, sel: string): string {
  return createHash("sha256").update(sel + code).digest("hex");
}

// Vérifie un code admin tapé par l'utilisateur contre celui enregistré
// pour "journal_reset" (voir migration_008). Utilisé à la fois pour
// réinitialiser le journal et pour consulter les sauvegardes.
export async function verifierCodeJournal(
  supabase: SupabaseClient,
  code: string
): Promise<{ valide: boolean; defini: boolean }> {
  const { data } = await supabase
    .from("admin_codes")
    .select("code_hash, code_sel")
    .eq("cle", "journal_reset")
    .maybeSingle();

  if (!data) return { valide: false, defini: false };
  const valide = !!code && hasherCode(code, data.code_sel) === data.code_hash;
  return { valide, defini: true };
}
