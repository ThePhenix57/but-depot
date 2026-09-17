import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Le rôle "dev" peut entrer dans /admin/* (zones, alvéoles, catégories),
  // mais chaque section qui lui est interdite (employés, produits,
  // signalements, journal, planning, objectifs) a son propre layout.tsx qui
  // re-vérifie strictement role === "admin" et le renvoie ailleurs.
  if (profile?.role !== "admin" && profile?.role !== "dev") {
    redirect("/recherche");
  }

  return <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">{children}</div>;
}
