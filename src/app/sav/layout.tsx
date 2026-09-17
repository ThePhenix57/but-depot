import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Accès à la section SAV : admin et dev toujours, employé seulement si un
// admin a coché "accès SAV" sur sa fiche (/admin/employes). Voir
// src/lib/sav.ts pour la même règle côté API.
export default async function SavLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, acces_sav")
    .eq("id", user.id)
    .single();

  const accede = profile?.role === "admin" || profile?.role === "dev" || profile?.acces_sav === true;
  if (!accede) redirect("/");

  return <>{children}</>;
}
