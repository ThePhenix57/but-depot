// Décompose un code d'alvéole au format "F1-0-A" (allée F, travée 1, étage
// 0, position A) en ses 4 parties. Suit la convention confirmée par
// l'entrepôt : {allée}{travée}-{étage}-{position}. Renvoie null si le code
// ne suit pas ce format (ex: codes créés à la main avant cette convention)
// — dans ce cas, on retombe simplement sur un affichage texte classique.
export interface AlveoleCodeParts {
  allee: string;
  travee: string;
  etage: string;
  position: string;
}

const RE = /^([A-Za-z]+)(\d+)-(\w+)-(\w+)$/;

export function parseAlveoleCode(code: string): AlveoleCodeParts | null {
  const m = RE.exec(code.trim());
  if (!m) return null;
  return { allee: m[1], travee: m[2], etage: m[3], position: m[4] };
}

// Clé identifiant une "travée" (un rack physique précis : une allée + un
// numéro de travée) — tous les étages/positions de cette travée forment un
// même meuble qu'on peut représenter comme une seule étagère à imprimer/afficher.
export function claveTravee(parts: AlveoleCodeParts): string {
  return `${parts.allee}${parts.travee}`;
}
