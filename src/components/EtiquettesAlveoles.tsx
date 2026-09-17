import QrCodeSvg from "@/components/QrCodeSvg";
import { contenuQrAlveole } from "@/lib/qr";

interface AlveoleEtiquette {
  code: string;
  // Nom affiché sous le code — la catégorie couvrant la zone de l'alvéole
  // (ex: "TVilum", "Literie", voir /admin/categories) si elle existe,
  // sinon le code/label de zone brut en repli.
  zoneLabel?: string | null;
}

interface Props {
  alveoles: AlveoleEtiquette[];
  // Préfixe configuré dans /admin/alveoles ("Format du QR code") collé
  // devant le code dans le QR uniquement — le texte affiché en clair reste
  // le code seul, plus lisible pour un humain qui colle l'étiquette.
  prefixeQr?: string;
}

// Feuille d'étiquettes QR code pour les alvéoles, imprimable en A4 paysage,
// plusieurs par page — à découper et coller sur les racks. Par défaut le QR
// encode le code exact de l'alvéole (ex: "F1-0-A") ; si un préfixe est
// configuré (voir /admin/alveoles), il est collé devant (ex:
// "999000000000Nosica@F1-0-A") pour coller au format attendu par un
// lecteur/PDA existant. Réutilise l'id "fiche-impression" (voir
// globals.css) : un seul élément imprimable à la fois sur la page.
export default function EtiquettesAlveoles({ alveoles, prefixeQr }: Props) {
  return (
    <div id="fiche-impression" className="hidden print:block">
      <div className="flex flex-wrap content-start gap-6 p-4">
        {alveoles.map((a, i) => (
          <div
            key={`${a.code}-${i}`}
            className="flex flex-col items-center justify-center gap-1 rounded border-2 border-black px-4 py-3"
            style={{ breakInside: "avoid" }}
          >
            <QrCodeSvg value={contenuQrAlveole(a.code, prefixeQr)} size={110} />
            <span className="text-lg font-bold">{a.code}</span>
            {a.zoneLabel && <span className="text-xs text-but-gray">{a.zoneLabel}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
