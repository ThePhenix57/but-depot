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
    redirect(`/login?error=${encodeURIComponent("Identifiants incorrects")}`);
  }

  redirect("/recherche");
}
