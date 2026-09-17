"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { IconChevronDown, IconMenu } from "@/components/icons";

interface Props {
  role: string | null;
  fullName: string | null;
  accesSav?: boolean;
}

// Navigation du haut : "Recherche" reste toujours visible (l'action de tous
// les jours), le reste (outils + pages admin) est rangé dans un menu
// déroulant pour éviter une rangée de liens qui s'allonge à chaque nouvelle
// fonctionnalité.
export default function HeaderNav({ role, fullName, accesSav = false }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const lienMenu =
    "block rounded-lg px-3 py-2 text-sm text-but-dark transition hover:bg-but-gray-light";

  return (
    <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      <Link href="/" className="rounded-lg px-2.5 py-1.5 transition hover:bg-white/10">
        Accueil
      </Link>
      <Link href="/recherche" className="rounded-lg px-2.5 py-1.5 transition hover:bg-white/10">
        Recherche
      </Link>

      <div ref={ref} className="relative ml-1">
        <button
          onClick={() => setOuvert((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 transition hover:bg-white/10"
        >
          <IconMenu className="h-4 w-4" />
          Menu
          <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`} />
        </button>

        {ouvert && (
          <div className="absolute right-0 z-40 mt-2 w-56 animate-fade-in overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-card-hover">
            <Link href="/produits" className={lienMenu} onClick={() => setOuvert(false)}>
              Produits
            </Link>
            {accesSav && (
              <Link href="/sav" className={lienMenu} onClick={() => setOuvert(false)}>
                SAV
              </Link>
            )}
            <Link href="/codebarre" className={lienMenu} onClick={() => setOuvert(false)}>
              Codes-barres
            </Link>
            <Link href="/verifications" className={lienMenu} onClick={() => setOuvert(false)}>
              Vérifications
            </Link>
            <Link href="/planning" className={lienMenu} onClick={() => setOuvert(false)}>
              Planning
            </Link>
            {(role === "admin" || role === "dev") && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <Link href="/admin/zones" className={lienMenu} onClick={() => setOuvert(false)}>
                  Plan de l&apos;entrepôt
                </Link>
                <Link href="/admin/alveoles" className={lienMenu} onClick={() => setOuvert(false)}>
                  Alvéoles
                </Link>
                <Link href="/admin/categories" className={lienMenu} onClick={() => setOuvert(false)}>
                  Catégories
                </Link>
                <Link href="/admin/zones-speciales" className={lienMenu} onClick={() => setOuvert(false)}>
                  Zones spéciales
                </Link>
              </>
            )}
            {role === "admin" && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <Link href="/admin/planning" className={lienMenu} onClick={() => setOuvert(false)}>
                  Planning (gérer)
                </Link>
                <Link href="/admin/objectifs" className={lienMenu} onClick={() => setOuvert(false)}>
                  Objectifs de la semaine
                </Link>
                <Link href="/admin/produits" className={lienMenu} onClick={() => setOuvert(false)}>
                  Produits (gérer)
                </Link>
                <Link href="/admin/employes" className={lienMenu} onClick={() => setOuvert(false)}>
                  Employés
                </Link>
                <Link href="/admin/signalements" className={lienMenu} onClick={() => setOuvert(false)}>
                  Signalements
                </Link>
                <Link href="/admin/journal" className={lienMenu} onClick={() => setOuvert(false)}>
                  Journal des rangements
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <span className="hidden text-white/80 sm:inline">
        {fullName} {role === "admin" ? "(admin)" : ""}
      </span>
      <LogoutButton />
    </nav>
  );
}
