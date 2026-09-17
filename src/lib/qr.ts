// Construit le texte encodé dans le QR code d'une alvéole : le préfixe
// configuré par un admin (voir /admin/alveoles, "Format du QR code" et la
// table "parametres") collé devant le code de l'alvéole. Si aucun préfixe
// n'est configuré, c'est juste le code tel quel (ex: "B1-5-A") — comportement
// historique du site, inchangé par défaut.
export function contenuQrAlveole(code: string, prefixe: string | null | undefined): string {
  return `${prefixe ?? ""}${code}`;
}
