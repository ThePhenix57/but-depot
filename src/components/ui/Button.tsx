import type { ButtonHTMLAttributes } from "react";
import { IconLoader } from "@/components/icons";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Affiche un petit spinner et désactive le bouton (action en cours). */
  loading?: boolean;
}

// Bouton standard du site : mêmes styles partout (couleurs, arrondi,
// tailles, état désactivé/chargement) au lieu de répéter les classes
// Tailwind dans chaque page. Un simple <button> classique reste possible
// là où ce composant ne convient pas (ex: cellule de tableau très dense).
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-but-red text-white shadow-sm hover:bg-but-red-dark disabled:hover:bg-but-red",
  secondary:
    "bg-but-dark text-white shadow-sm hover:bg-but-dark/90 disabled:hover:bg-but-dark",
  outline:
    "border border-gray-300 bg-white text-but-dark hover:border-but-red hover:text-but-red disabled:hover:border-gray-300 disabled:hover:text-but-dark",
  ghost: "text-but-dark hover:bg-but-gray-light",
  danger:
    "border border-but-red/30 bg-white text-but-red hover:bg-but-red hover:text-white disabled:hover:bg-white disabled:hover:text-but-red",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && <IconLoader className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
