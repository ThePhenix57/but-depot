"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=Merci de remplir email et mot de passe");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // On affiche le message exact renvoyé par Supabase (ex: "Email not
    // confirmed") plutôt qu'un message générique : c'est un outil interne,
    // ça aide à diagnostiquer sans avoir à regarder les logs serveur.
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/recherche");
}
