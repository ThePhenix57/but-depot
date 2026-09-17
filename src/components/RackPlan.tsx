import type { AlveoleWithOccupancy } from "@/lib/types";
import { parseAlveoleCode } from "@/lib/alveoleCode";

interface Props {
  // Alvéoles de la même travée uniquement (voir claveTravee dans lib/alveoleCode.ts).
  alveoles: AlveoleWithOccupancy[];
  // Codes à mettre en évidence (l'alvéole où le produit recherché se trouve).
  cibles: string[];
  titre: string;
}

function comparerEtages(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return nb - na; // étage le plus haut en premier
  return b.localeCompare(a);
}

// Petit schéma d'une travée (un rack précis) vue de face : les étages
// empilés (le plus haut en haut, comme dans la réalité), et sur chaque
// étage les positions côte à côte (ex: A, B, C de gauche à droite).
// Couleur de chaque case : rouge = bloquée (lisse cassée), jaune = le
// produit recherché est ici, vert = libre.
export default function RackPlan({ alveoles, cibles, titre }: Props) {
  const lignes = new Map<string, { position: string; alveole: AlveoleWithOccupancy }[]>();
  const positionsVues = new Set<string>();

  for (const a of alveoles) {
    const parts = parseAlveoleCode(a.code);
    if (!parts) continue;
    positionsVues.add(parts.position);
    const ligne = lignes.get(parts.etage) ?? [];
    ligne.push({ position: parts.position, alveole: a });
    lignes.set(parts.etage, ligne);
  }

  const etages = [...lignes.keys()].sort(comparerEtages);
  const positions = [...positionsVues].sort((a, b) => a.localeCompare(b));

  if (etages.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="mb-2 text-xs font-semibold text-but-gray">{titre}</p>
      <div className="flex flex-col gap-1">
        {etages.map((etage) => {
          const cellules = new Map(lignes.get(etage)!.map((c) => [c.position, c.alveole]));
          return (
            <div key={etage} className="flex items-center gap-1">
              <span className="w-14 shrink-0 text-right text-[11px] text-but-gray">
                étage {etage}
              </span>
              <div className="flex flex-1 gap-1">
                {positions.map((pos) => {
                  const a = cellules.get(pos);
                  if (!a) return <div key={pos} className="h-9 flex-1 rounded bg-gray-50" />;
                  const estCible = cibles.includes(a.code);
                  const couleur = a.bloquee
                    ? "border-but-red bg-but-red text-white"
                    : estCible
                      ? "border-yellow-500 bg-yellow-400 text-but-dark"
                      : "border-green-600 bg-green-500 text-white";
                  return (
                    <div
                      key={pos}
                      className={`flex h-9 flex-1 items-center justify-center rounded border text-xs font-semibold ${couleur}`}
                      title={`${a.code}${a.bloquee ? " — bloquée" : estCible ? " — produit ici" : " — libre"}`}
                    >
                      {pos}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-2 text-[11px] text-but-gray">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-but-red" /> Bloquée
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" /> Produit ici
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" /> Libre
        </span>
      </div>
    </div>
  );
}
