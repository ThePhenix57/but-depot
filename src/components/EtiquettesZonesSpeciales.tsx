import QrCodeSvg from "@/components/QrCodeSvg";
import { contenuQrAlveole } from "@/lib/qr";
import type { ZoneSpeciale } from "@/lib/types";

interface Props {
  zones: ZoneSpeciale[];
  // Même préfixe que pour les alvéoles (réglage "Format du QR code" sur
  // /admin/alveoles) — collé devant l'identifiant dans le QR uniquement.
  prefixeQr?: string;
}

// Feuille d'étiquettes QR code pour les zones spéciales (tampon, Drive,
// CAM, chariot...), imprimable en A4 paysage, plusieurs par page — même
// principe que EtiquettesAlveoles.tsx mais pour les zones sans position
// sur le plan. Fichier séparé pour ne jamais toucher au composant
// d'impression des alvéoles. Réutilise l'id "fiche-impression" (voir
// globals.css) : un seul élément imprimable à la fois sur la page.
export default function EtiquettesZonesSpeciales({ zones, prefixeQr }: Props) {
  return (
    <div id="fiche-impression" className="hidden print:block">
      <div className="flex flex-wrap content-start gap-6 p-4">
        {zones.map((z) => (
          <div
            key={z.id}
            className="flex flex-col items-center justify-center gap-1 rounded border-2 border-black px-4 py-3"
            style={{ breakInside: "avoid" }}
          >
            <QrCodeSvg value={contenuQrAlveole(z.identifiant, prefixeQr)} size={110} />
            <span className="text-lg font-bold">{z.nom}</span>
            <span className="text-xs text-but-gray">{z.identifiant}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
