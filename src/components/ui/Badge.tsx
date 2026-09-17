import type { HTMLAttributes } from "react";

type Tone = "gray" | "red" | "green" | "yellow" | "dark";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const TONES: Record<Tone, string> = {
  gray: "bg-but-gray-light text-but-gray",
  red: "bg-but-red/10 text-but-red-dark",
  green: "bg-green-50 text-green-700",
  yellow: "bg-yellow-50 text-yellow-700",
  dark: "bg-but-dark text-white",
};

// Petite étiquette ronde (statut, catégorie, "Aujourd'hui"...) — même
// composant partout au lieu de recopier les classes à chaque usage.
export default function Badge({ tone = "gray", className = "", children, ...rest }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        TONES[tone],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
