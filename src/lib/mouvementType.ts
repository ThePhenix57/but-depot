import type { TypeMouvement } from "@/lib/types";

// Libellé + couleur de badge pour chaque type de ligne du journal global
// (voir /admin/journal). Un seul endroit à modifier si on ajoute un type.
export const TYPES_MOUVEMENT: Record<TypeMouvement, { label: string; classe: string }> = {
  rangement: { label: "Rangement", classe: "bg-green-100 text-green-800" },
  sortie: { label: "Sortie", classe: "bg-orange-100 text-orange-800" },
  verification: { label: "Vérification", classe: "bg-blue-100 text-blue-800" },
  signalement: { label: "Signalement", classe: "bg-but-red/10 text-but-red" },
};
