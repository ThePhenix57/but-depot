export type TypePalette = "eur" | "centrale";

export const PALETTE_TYPES: Record<
  TypePalette,
  { label: string; dimensions: string }
> = {
  eur: { label: "Palette EUR", dimensions: "1200 x 800 mm" },
  centrale: { label: "Palette centrale (à chevron)", dimensions: "2400 x 900 mm" },
};

export const PALETTE_TYPE_OPTIONS: TypePalette[] = ["eur", "centrale"];

// Une alvéole dimensionnée pour la palette centrale (plus grande) accepte
// aussi la palette EUR (plus petite). L'inverse n'est pas vrai.
export function alveoleAcceptePalette(
  tailleMaxAlveole: TypePalette | null | undefined,
  typePalette: TypePalette
): boolean {
  if (!tailleMaxAlveole) return true; // pas précisé = pas de restriction
  if (tailleMaxAlveole === "centrale") return true; // accepte tout
  return typePalette === "eur";
}
