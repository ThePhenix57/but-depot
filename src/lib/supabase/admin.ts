import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client "admin" avec la clé service_role — À N'UTILISER QUE côté serveur
// (route handlers dans src/app/api/**), jamais importé dans un composant
// client. Sert uniquement à créer/inviter des comptes employés depuis
// l'écran d'administration.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant : ajoute-le dans .env.local / Vercel."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
