"use client";

import { useEffect, useState } from "react";
import BarcodeSvg from "@/components/BarcodeSvg";
import EtiquettesCodeBarre from "@/components/EtiquettesCodeBarre";
import { IconPrinter } from "@/components/icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// Génère et imprime des codes-barres à partir de codes tapés (un par
// ligne) : utile pour ré-imprimer une étiquette manquante ou illisible sur
// un colis, ou en créer une pour un produit qui n'en a pas.
//
// Format utilisé : Code128 plutôt qu'un véritable EAN-13/EAN-8. Un vrai
// EAN-13 doit faire exactement 13 chiffres avec une clé de contrôle
// calculée — un code de 15 ou 17 chiffres n'est pas un EAN-13 valide.
// Code128 accepte n'importe quelle longueur et se lit très bien par les
// douchettes/PDA d'entrepôt classiques, donc c'est ce qui est utilisé ici
// pour que ça marche quelle que soit la longueur du code tapé.
export default function CodeBarrePage() {
  const [texte, setTexte] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [printCodes, setPrintCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (printCodes) {
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [printCodes]);

  function genererApercu(e: React.FormEvent) {
    e.preventDefault();
    const liste = texte
      .split(/[\n,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    setCodes(liste);
  }

  function imprimer(code?: string) {
    setPrintCodes(code ? [code] : codes);
  }

  return (
    <>
    <div className="mx-auto max-w-3xl px-4 py-8 print:hidden">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">
        Générateur de codes-barres
      </h1>
      <p className="mb-6 text-sm text-but-gray">
        Tape un ou plusieurs codes (un par ligne, ou séparés par une virgule)
        pour générer et imprimer leur code-barres — pratique pour remplacer
        une étiquette abîmée ou manquante sur un colis.
      </p>

      <form onSubmit={genererApercu} className="mb-6 flex flex-col gap-3">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={"Ex:\n3245678901234\n3245678901241"}
          rows={5}
          className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-but-red focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary">
            Générer l&apos;aperçu
          </Button>
          {codes.length > 0 && (
            <Button type="button" onClick={() => imprimer()}>
              <IconPrinter className="h-4 w-4" />
              Imprimer les {codes.length} étiquette{codes.length > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </form>

      {codes.length > 0 && (
        <div className="flex flex-wrap gap-4 animate-fade-in">
          {codes.map((code, i) => (
            <Card key={`${code}-${i}`} noPadding className="flex flex-col items-center gap-2 p-3">
              <BarcodeSvg value={code} height={50} />
              <button
                onClick={() => imprimer(code)}
                className="flex items-center gap-1 text-xs font-semibold text-but-red hover:underline"
              >
                <IconPrinter className="h-3.5 w-3.5" />
                Imprimer seulement celle-ci
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>

    {printCodes && <EtiquettesCodeBarre codes={printCodes} />}
    </>
  );
}
