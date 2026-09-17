import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Renvoie ailleurs tout compte qui n'est pas strictement "admin" — utilisé
// par les layout.tsx des sections interdites au rôle "dev" (employés,
// produits, signalements, journal, planning, objectifs). Le layout parent
// /admin/layout.tsx laisse déjà passer admin ET dev ; ce garde-fou
// supplémentaire referme l'accès sur les sections qui doivent rester
// strictement admin.
export async function requireAdminStrict() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    redirect("/admin/zones");
  }
}
