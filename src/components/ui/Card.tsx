import type { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Retire le padding interne par défaut (ex: carte avec sa propre en-tête colorée). */
  noPadding?: boolean;
  /** Légère élévation au survol — pour les cartes cliquables. */
  hover?: boolean;
}

// Carte standard du site : fond blanc, bord très léger, ombre douce,
// arrondi cohérent. Remplace les nombreuses variantes de
// "rounded-lg border border-gray-200 bg-white p-4" dispersées dans les
// pages par un seul composant partagé.
export default function Card({
  noPadding = false,
  hover = false,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <div
      className={[
        "rounded-2xl border border-gray-200 bg-white shadow-card",
        hover ? "transition hover:-translate-y-0.5 hover:shadow-card-hover" : "",
        noPadding ? "" : "p-5",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
