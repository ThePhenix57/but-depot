"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { IconPower } from "@/components/icons";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      title="Déconnexion"
      aria-label="Déconnexion"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/40 text-white hover:bg-white/10"
    >
      <IconPower className="h-4 w-4" />
    </button>
  );
}
