import type { Product, RangementResultat } from "@/lib/types";
import { PALETTE_TYPES } from "@/lib/palettes";

interface Props {
  product: Product;
  resultats: RangementResultat[];
}

// Une fiche A4 paysage par palette rangée (voir globals.css pour le CSS
// d'impression : #fiche-impression est le seul élément visible à
// l'impression, "page-break-after" sépare chaque palette sur sa propre
// page — comme l'ancien classeur Google Sheets, mais avec le bon nombre de
// pages généré automatiquement.
export default function PrintableFiches({ product, resultats }: Props) {
  const last5 = product.ean.slice(-5);

  return (
    <div id="fiche-impression" className="hidden print:block">
      {resultats.map((r, i) => (
        <div
          key={`${r.alveole_code}-${i}`}
          className="grid h-[180mm] grid-cols-[2fr_1fr] grid-rows-[1fr_2fr] gap-0 border-4 border-black"
          style={i < resultats.length - 1 ? { pageBreakAfter: "always" } : undefined}
        >
          <div className="col-span-2 flex flex-col items-center justify-center border-b-4 border-black bg-but-gray-light px-6 text-center">
            <span className="text-5xl font-bold">{product.name}</span>
            {resultats.length > 1 && (
              <span className="mt-2 text-lg font-semibold text-but-gray">
                Palette {i + 1} / {resultats.length} — {PALETTE_TYPES[r.type_palette].label} (
                {PALETTE_TYPES[r.type_palette].dimensions})
              </span>
            )}
          </div>
          <div className="flex flex-col items-center justify-center text-[160px] font-bold leading-none">
            {last5}
            {r.poids_palette_kg != null && (
              <span className="text-2xl font-semibold text-but-gray">
                ≈ {r.poids_palette_kg} kg ({r.colis} colis)
              </span>
            )}
          </div>
          <div className="flex flex-col border-l-4 border-black">
            <div className="bg-but-dark px-4 py-3 text-center text-2xl font-bold text-white">
              EMPLACEMENT
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-4xl font-bold">
              <span>{r.alveole_code}</span>
              <span className="text-lg font-normal text-but-gray">
                {r.zone_label || r.zone_code}
              </span>
              {r.depassement && (
                <span className="mt-2 rounded bg-but-red px-3 py-1 text-base font-bold text-white">
                  ⚠ Poids max de l&apos;alvéole dépassé
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
