"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  value: string;
  // Taille en pixels CSS (le SVG reste net à toutes les tailles, c'est un
  // vecteur — utile ici car les étiquettes sont ensuite imprimées en mm).
  size?: number;
  className?: string;
}

// Génère un QR code en SVG directement dans le navigateur (bibliothèque
// "qrcode", aucune requête réseau). Utilisé pour les étiquettes d'alvéole :
// le contenu du QR est le code exact de l'alvéole (ex: "F1-0-A"), pour
// qu'une douchette/PDA qui le scanne "tape" ce code tel quel, comme s'il
// avait été saisi au clavier.
export default function QrCodeSvg({ value, size = 160, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toString(value, { type: "svg", margin: 1, width: size }, (err, svg) => {
      if (!err && ref.current) {
        ref.current.innerHTML = svg;
      }
    });
  }, [value, size]);

  return <div ref={ref} className={className} style={{ width: size, height: size }} />;
}
