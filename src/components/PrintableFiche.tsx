import type { Product, Zone } from "@/lib/types";

interface Props {
  product: Product;
  locations: Zone[];
}

// Reproduit le format de la fiche papier (A4 paysage) : nom en haut, 5
// derniers chiffres du code EAN en très gros au centre, emplacement(s) à
// droite. Rendu uniquement lors de l'impression (voir globals.css).
export default function PrintableFiche({ product, locations }: Props) {
  const last5 = product.ean.slice(-5);

  return (
    <div id="fiche-impression" className="hidden print:block">
      <div className="grid h-[180mm] grid-cols-[2fr_1fr] grid-rows-[1fr_2fr] gap-0 border-4 border-black">
        <div className="col-span-2 flex items-center justify-center border-b-4 border-black bg-but-gray-light px-6 text-center text-5xl font-bold">
          {product.name}
        </div>
        <div className="flex items-center justify-center text-[160px] font-bold leading-none">
          {last5}
        </div>
        <div className="flex flex-col border-l-4 border-black">
          <div className="bg-but-dark px-4 py-3 text-center text-2xl font-bold text-white">
            EMPLACEMENT
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-4xl font-bold">
            {locations.length === 0 && <span>—</span>}
            {locations.map((z) => (
              <span key={z.id}>{z.code}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
