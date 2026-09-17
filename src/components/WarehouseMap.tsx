"use client";

import { useRef, useState } from "react";
import type { Zone } from "@/lib/types";

export interface RectPct {
  pos_x_pct: number;
  pos_y_pct: number;
  largeur_pct: number;
  hauteur_pct: number;
}

interface Props {
  zones: Zone[];
  /** Zones où le produit recherché est déjà stocké (surbrillance forte). */
  highlightedZoneIds?: string[];
  /** Zones suggérées d'après la catégorie du produit (surbrillance légère). */
  suggestedZoneIds?: string[];
  /** Zone survolée/sélectionnée (mode admin) */
  selectedZoneId?: string | null;
  onZoneClick?: (zone: Zone) => void;
  /** Mode admin : permet de dessiner un rectangle au clic-glisser sur la photo. */
  editable?: boolean;
  /** Appelé quand l'admin vient de dessiner un rectangle (clic-glisser terminé). */
  onRectDrawn?: (rect: RectPct) => void;
}

// Plan de l'entrepôt : la photo/schéma réel du site en fond, avec chaque
// zone dessinée par-dessus comme un ou plusieurs rectangles positionnés en
// % (pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct — 0 à 100). Une zone
// peut avoir PLUSIEURS rectangles (ex: un rack coupé en deux endroits
// séparés sur le plan, ou un rack SAV dessiné en 2 morceaux) — tous
// affichés/mis en évidence ensemble puisqu'ils représentent la même zone.
export default function WarehouseMap({
  zones,
  highlightedZoneIds = [],
  suggestedZoneIds = [],
  selectedZoneId = null,
  onZoneClick,
  editable = false,
  onRectDrawn,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<RectPct | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  // Chaque zone peut avoir plusieurs rectangles : on les aplatit tous en
  // une seule liste de boîtes à afficher, chacune gardant une référence à
  // sa zone d'origine.
  const boites = zones.flatMap((zone) => (zone.rects ?? []).map((rect) => ({ zone, rect })));

  function pctFromEvent(e: { clientX: number; clientY: number }) {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    const x = Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - box.top) / box.height) * 100));
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!editable) return;
    // Ne pas démarrer un dessin si on clique sur un rectangle déjà placé
    // (on veut pouvoir cliquer dessus pour sélectionner sa zone, pas le
    // redessiner par-dessus).
    if ((e.target as HTMLElement).closest("[data-zone-box]")) return;
    const start = pctFromEvent(e);
    dragStart.current = start;
    setDraft({ pos_x_pct: start.x, pos_y_pct: start.y, largeur_pct: 0, hauteur_pct: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!editable || !dragStart.current) return;
    const cur = pctFromEvent(e);
    const start = dragStart.current;
    setDraft({
      pos_x_pct: Math.min(start.x, cur.x),
      pos_y_pct: Math.min(start.y, cur.y),
      largeur_pct: Math.abs(cur.x - start.x),
      hauteur_pct: Math.abs(cur.y - start.y),
    });
  }

  function handlePointerUp() {
    if (!editable || !dragStart.current) return;
    dragStart.current = null;
    if (draft && draft.largeur_pct > 0.5 && draft.hauteur_pct > 0.5) {
      onRectDrawn?.(draft);
    }
    setDraft(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
      <div
        ref={containerRef}
        className={`relative w-full select-none ${editable ? "cursor-crosshair" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/plan-entrepot.jpg"
          alt="Plan de l'entrepôt"
          draggable={false}
          className="block w-full select-none"
        />

        {boites.map(({ zone, rect }) => {
          const highlighted = highlightedZoneIds.includes(zone.id);
          const suggested = !highlighted && suggestedZoneIds.includes(zone.id);
          const selected = selectedZoneId === zone.id;
          return (
            <button
              type="button"
              key={rect.id}
              data-zone-box
              onClick={() => onZoneClick?.(zone)}
              className={[
                "absolute flex items-center justify-center rounded border text-xs font-semibold transition",
                onZoneClick ? "cursor-pointer" : "cursor-default",
                highlighted
                  ? "z-10 border-but-red bg-but-red/80 text-white shadow-lg ring-4 ring-but-red/30"
                  : suggested
                  ? "z-10 border-but-red bg-but-red/20 text-but-red-dark ring-2 ring-but-red/40"
                  : "border-but-dark/40 bg-but-dark/10 text-but-dark hover:bg-but-dark/20",
                selected ? "outline outline-2 outline-offset-1 outline-but-dark" : "",
              ].join(" ")}
              style={{
                left: `${rect.pos_x_pct}%`,
                top: `${rect.pos_y_pct}%`,
                width: `${rect.largeur_pct}%`,
                height: `${rect.hauteur_pct}%`,
              }}
              title={zone.label ?? zone.code}
            >
              {zone.code}
            </button>
          );
        })}

        {draft && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-but-red bg-but-red/10"
            style={{
              left: `${draft.pos_x_pct}%`,
              top: `${draft.pos_y_pct}%`,
              width: `${draft.largeur_pct}%`,
              height: `${draft.hauteur_pct}%`,
            }}
          />
        )}
      </div>

      {boites.length === 0 && (
        <p className="p-3 text-center text-xs text-but-gray">
          Aucune zone placée sur le plan pour le moment.
        </p>
      )}
    </div>
  );
}
