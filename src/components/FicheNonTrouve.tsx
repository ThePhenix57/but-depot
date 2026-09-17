interface Props {
  ean: string;
}

// Fiche A4 paysage imprimable immédiatement quand le produit n'est pas
// encore dans la base : les 5 derniers chiffres de l'EAN en grand, et une
// case EMPLACEMENT vide à remplir à la main sur la palette, en attendant
// d'enregistrer le produit correctement sur le site (voir
// components/PrintableFiches.tsx pour la fiche imprimée une fois le
// produit rangé, qui remplit automatiquement l'emplacement).
export default function FicheNonTrouve({ ean }: Props) {
  const last5 = ean.slice(-5);

  return (
    <div id="fiche-impression" className="hidden print:block">
      <div className="grid h-[180mm] grid-cols-[2fr_1fr] grid-rows-[1fr_2fr] gap-0 border-4 border-black">
        <div className="col-span-2 flex flex-col items-center justify-center border-b-4 border-black bg-but-gray-light px-6 text-center">
          <span className="flex items-center gap-3 text-5xl font-bold">
            ⚠ PRODUIT NON TROUVÉ
          </span>
        </div>
        <div className="flex flex-col items-center justify-center text-[160px] font-bold leading-none">
          {last5}
        </div>
        <div className="flex flex-col border-l-4 border-black">
          <div className="bg-but-dark px-4 py-3 text-center text-2xl font-bold text-white">
            EMPLACEMENT
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-4xl font-bold">
            <span>—</span>
          </div>
        </div>
      </div>
    </div>
  );
}
