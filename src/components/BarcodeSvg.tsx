"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  // Hauteur des barres en pixels CSS ; la largeur s'ajuste automatiquement
  // à la longueur du code.
  height?: number;
  className?: string;
}

// Génère un code-barres linéaire Code128 en SVG (bibliothèque "jsbarcode",
// aucune requête réseau). Code128 est utilisé plutôt qu'un vrai EAN-13 car
// il accepte n'importe quelle longueur et n'importe quels caractères — les
// codes de 13, 15 ou 17 chiffres qu'on tape ici ne sont pas forcément des
// EAN-13 valides (qui font toujours exactement 13 chiffres avec une clé de
// contrôle), alors que Code128 les lit tous sans problème sur une douchette
// d'entrepôt classique.
export default function BarcodeSvg({ value, height = 70, className }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        displayValue: true,
        fontSize: 16,
        margin: 8,
      });
    } catch {
      // Code vide ou caractère non supporté : on laisse le SVG tel quel.
    }
  }, [value, height]);

  return <svg ref={ref} className={className} />;
}
