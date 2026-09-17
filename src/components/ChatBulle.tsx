"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Messagerie from "@/components/Messagerie";
import { IconChat, IconClose } from "@/components/icons";

// Petite bulle de messagerie flottante (en bas à droite), visible sur
// toutes les pages une fois connecté. Un clic ouvre un panneau au format
// portrait (~9:16) avec le même contenu que la page /messagerie complète,
// avec une animation d'agrandissement partant de la bulle.
export default function ChatBulle() {
  const pathname = usePathname();
  const [connecte, setConnecte] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setConnecte(!!json?.id))
      .catch(() => setConnecte(false));
  }, []);

  // Pas de bulle sur la page /login (pas connecté de toute façon), ni sur
  // /messagerie elle-même (déjà le même contenu en plein écran).
  if (!connecte || pathname?.startsWith("/messagerie")) return null;

  return (
    <div className="print:hidden">
      <div
        className={`fixed bottom-24 right-6 z-50 flex w-[22rem] max-w-[92vw] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-out ${
          ouvert
            ? "h-[39rem] max-h-[75vh] scale-100 opacity-100"
            : "pointer-events-none h-0 max-h-[75vh] scale-90 opacity-0"
        }`}
      >
        {/* Toujours monté (même quand la bulle est visuellement fermée) :
            ça garde la conversation et les messages en mémoire d'un
            ouverture à l'autre, et surtout ça permet à l'animation de
            fermeture d'être symétrique à celle d'ouverture (le contenu ne
            disparaît pas brutalement avant que le panneau ait fini de se
            rétracter). */}
        <Messagerie compact onClose={() => setOuvert(false)} />
      </div>

      <button
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? "Fermer la messagerie" : "Ouvrir la messagerie"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-but-red text-white shadow-lg"
      >
        {ouvert ? <IconClose className="h-6 w-6" /> : <IconChat className="h-6 w-6" />}
      </button>
    </div>
  );
}
