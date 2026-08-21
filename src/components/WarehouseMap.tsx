"use client";

import type { Zone } from "@/lib/types";

interface Props {
  zones: Zone[];
  highlightedZoneIds?: string[];
  /** Zone survolée/sélectionnée (mode admin) */
  selectedZoneId?: string | null;
  onZoneClick?: (zone: Zone) => void;
}

// Plan simplifié de l'entrepôt : chaque zone est un rectangle positionné sur
// une grille CSS (pos_x/pos_y = colonne/ligne, largeur/hauteur = nombre de
// cases occupées). Pas besoin d'un vrai plan scanné : c'est un schéma que
// l'admin ajuste depuis /admin/zones pour se rapprocher de la disposition
// réelle des allées.
export default function WarehouseMap({
  zones,
  highlightedZoneIds = [],
  selectedZoneId = null,
  onZoneClick,
}: Props) {
  if (zones.length === 0) {
    return (
      <p className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-but-gray">
        Aucune zone définie sur le plan pour le moment.
      </p>
    );
  }

  const maxCol = Math.max(...zones.map((z) => z.pos_x + z.largeur)) || 1;
  const maxRow = Math.max(...zones.map((z) => z.pos_y + z.hauteur)) || 1;

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 bg-white p-4">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${maxCol}, minmax(64px, 1fr))`,
          gridTemplateRows: `repeat(${maxRow}, minmax(56px, auto))`,
        }}
      >
        {zones.map((zone) => {
          const highlighted = highlightedZoneIds.includes(zone.id);
          const selected = selectedZoneId === zone.id;
          return (
            <button
              type="button"
              key={zone.id}
              onClick={() => onZoneClick?.(zone)}
              className={[
                "flex flex-col items-center justify-center rounded border text-xs font-semibold transition",
                onZoneClick ? "cursor-pointer" : "cursor-default",
                highlighted
                  ? "z-10 scale-105 border-but-red bg-but-red text-white shadow-lg ring-4 ring-but-red/30"
                  : "border-gray-200 bg-but-gray-light text-but-dark hover:border-gray-300",
                selected ? "outline outline-2 outline-offset-2 outline-but-dark" : "",
              ].join(" ")}
              style={{
                gridColumn: `${zone.pos_x + 1} / span ${zone.largeur}`,
                gridRow: `${zone.pos_y + 1} / span ${zone.hauteur}`,
              }}
              title={zone.label ?? zone.code}
            >
              <span>{zone.code}</span>
              {highlighted && <span className="text-[10px] font-normal">produit ici</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
