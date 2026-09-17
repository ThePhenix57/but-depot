import BarcodeSvg from "@/components/BarcodeSvg";

interface Props {
  codes: string[];
}

// Feuille d'étiquettes code-barres (Code128) imprimable en A4 paysage,
// plusieurs par page — à découper. Réutilise l'id "fiche-impression" (voir
// globals.css) : un seul élément imprimable à la fois sur la page.
export default function EtiquettesCodeBarre({ codes }: Props) {
  return (
    <div id="fiche-impression" className="hidden print:block">
      <div className="flex flex-wrap content-start gap-6 p-4">
        {codes.map((code, i) => (
          <div
            key={`${code}-${i}`}
            className="flex flex-col items-center justify-center rounded border-2 border-black px-6 py-4"
            style={{ breakInside: "avoid" }}
          >
            <BarcodeSvg value={code} height={60} />
          </div>
        ))}
      </div>
    </div>
  );
}
