import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let fullName: string | null = null;
  let accesSav = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, acces_sav")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
    fullName = profile?.full_name ?? user.email ?? null;
    accesSav = role === "admin" || role === "dev" || profile?.acces_sav === true;
  }

  return (
    <header className="sticky top-0 z-50 bg-but-red text-white shadow-md print:hidden">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <img src="/logo-but.png" alt="BUT" className="h-9 w-9 rounded-lg bg-white/10 p-1" />
          <span className="text-lg font-bold leading-tight">
            BUT Dépôt
            <span className="hidden text-xs font-normal text-white/80 sm:block">
              Fiche rangement de marchandise
            </span>
          </span>
        </Link>

        {user && <HeaderNav role={role} fullName={fullName} accesSav={accesSav} />}
      </div>
    </header>
  );
}
