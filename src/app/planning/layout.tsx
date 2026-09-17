import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Le rôle "dev" n'a pas accès au planning (ni pour le consulter, ni pour le
// gérer — voir /admin/planning/layout.tsx pour le volet gestion).
export default async function PlanningLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "dev") {
      redirect("/recherche");
    }
  }
  return <>{children}</>;
}
