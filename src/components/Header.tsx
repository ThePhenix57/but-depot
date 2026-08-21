import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
    fullName = profile?.full_name ?? user.email ?? null;
  }

  return (
    <header className="bg-but-red text-white print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/recherche" className="flex items-center gap-3">
          <img src="/logo-but.png" alt="BUT" className="h-8 w-8 rounded" />
          <span className="text-lg font-bold leading-tight">
            BUT Dépôt
            <span className="block text-xs font-normal text-white/80">
              Fiche rangement de marchandise
            </span>
          </span>
        </Link>

        {user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/recherche" className="hover:underline">
              Recherche
            </Link>
            {role === "admin" && (
              <>
                <Link href="/admin/zones" className="hover:underline">
                  Plan
                </Link>
                <Link href="/admin/alveoles" className="hover:underline">
                  Alvéoles
                </Link>
                <Link href="/admin/categories" className="hover:underline">
                  Catégories
                </Link>
                <Link href="/admin/produits" className="hover:underline">
                  Produits
                </Link>
                <Link href="/admin/employes" className="hover:underline">
                  Employés
                </Link>
              </>
            )}
            <span className="hidden text-white/80 sm:inline">
              {fullName} {role === "admin" ? "(admin)" : ""}
            </span>
            <LogoutButton />
          </nav>
        )}
      </div>
    </header>
  );
}
