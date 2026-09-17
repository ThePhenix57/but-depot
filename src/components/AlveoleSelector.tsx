"use client";

import { useState } from "react";
import type { AlveoleWithOccupancy, Zone } from "@/lib/types";
import { alveoleAcceptePalette, type TypePalette } from "@/lib/palettes";
import { IconScan } from "@/components/icons";

export type AlveoleChoix =
  | { mode: "existante"; alveoleId: string }
  | { mode: "nouvelle"; zoneId: string; code: string };

interface Props {
  alveoles: AlveoleWithOccupancy[];
  zones: Zone[];
  typePalette: TypePalette;
  poidsPaletteKg: number | null;
  suggestedZoneIds: string[];
  currentAlveoleIds: string[];
  value: AlveoleChoix | null;
  onChange: (choix: AlveoleChoix) => void;
}

export default function AlveoleSelector({
  alveoles,
  zones,
  typePalette,
  poidsPaletteKg,
  suggestedZoneIds,
  currentAlveoleIds,
  value,
  onChange,
}: Props) {
  const [mode, setMode] = useState<"existante" | "nouvelle">(
    value?.mode ?? "existante"
  );
  const [nouveauZoneId, setNouveauZoneId] = useState(
    value?.mode === "nouvelle" ? value.zoneId : ""
  );
  const [nouveauCode, setNouveauCode] = useState(
    value?.mode === "nouvelle" ? value.code : ""
  );
  const [scanCode, setScanCode] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const compatibles = alveoles.filter(
    (a) => !a.bloquee && alveoleAcceptePalette(a.taille_palette_max, typePalette)
  );

  // Tri : déjà utilisée par ce produit > zone suggérée > libre > le reste.
  const sorted = [...compatibles].sort((a, b) => {
    const score = (a: AlveoleWithOccupancy) =>
      currentAlveoleIds.includes(a.id) ? 0 : suggestedZoneIds.includes(a.zone_id) ? 1 : 2;
    const diff = score(a) - score(b);
    if (diff !== 0) return diff;
    return a.code.localeCompare(b.code);
  });

  // Scan d'une étiquette QR d'alvéole (voir /admin/alveoles, bouton "QR") :
  // une douchette/PDA "tape" le code de l'alvéole tel quel dans ce champ.
  // Dès que ça correspond exactement à une alvéole, on la sélectionne toute
  // seule — pas besoin d'appuyer sur un bouton.
  function handleScan(texte: string) {
    setScanCode(texte);
    const trouvee = alveoles.find((a) => a.code.toLowerCase() === texte.trim().toLowerCase());
    if (!trouvee) {
      setScanMessage(null);
      return;
    }
    if (!compatibles.some((a) => a.id === trouvee.id)) {
      setScanMessage(
        trouvee.bloquee
          ? `⚠ ${trouvee.code} est bloquée (${trouvee.bloquee_motif || "problème signalé"}) — choisis une autre alvéole.`
          : `⚠ ${trouvee.code} n'accepte pas ce type de palette.`
      );
      return;
    }
    setMode("existante");
    onChange({ mode: "existante", alveoleId: trouvee.id });
    setScanMessage(`✓ ${trouvee.code} sélectionnée.`);
    setScanCode("");
  }

  function zoneLabel(zoneId: string) {
    const z = zones.find((z) => z.id === zoneId);
    return z ? z.label || z.code : "?";
  }

  function capaciteTexte(a: AlveoleWithOccupancy) {
    if (a.capacite_kg == null) return `${a.poids_actuel_kg} kg (capacité non définie)`;
    const projete = a.poids_actuel_kg + (poidsPaletteKg ?? 0);
    const depasse = projete > a.capacite_kg;
    return `${a.poids_actuel_kg}/${a.capacite_kg} kg${depasse ? " ⚠ dépassement si ajoutée" : ""}`;
  }

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="relative mb-2">
        <IconScan className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-but-gray" />
        <input
          value={scanCode}
          onChange={(e) => handleScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Scanner ou taper le code de l'alvéole..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-2 text-sm focus:border-but-red focus:outline-none"
        />
      </div>
      {scanMessage && (
        <p className={`mb-2 text-xs ${scanMessage.startsWith("✓") ? "text-green-700" : "text-but-red-dark"}`}>
          {scanMessage}
        </p>
      )}
      <div className="mb-2 flex gap-4 text-xs font-semibold">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={mode === "existante"}
            onChange={() => setMode("existante")}
          />
          Alvéole existante
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={mode === "nouvelle"}
            onChange={() => setMode("nouvelle")}
          />
          Nouvelle alvéole
        </label>
      </div>

      {mode === "existante" ? (
        <select
          value={value?.mode === "existante" ? value.alveoleId : ""}
          onChange={(e) => onChange({ mode: "existante", alveoleId: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
        >
          <option value="">— Choisir une alvéole —</option>
          {sorted.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} ({zoneLabel(a.zone_id)}) —{" "}
              {currentAlveoleIds.includes(a.id) ? "déjà ce produit ici — " : ""}
              {capaciteTexte(a)}
            </option>
          ))}
        </select>
      ) : null}
      {mode === "existante" && alveoles.some((a) => a.bloquee) && (
        <p className="mt-1 text-xs text-but-gray">
          Les alvéoles bloquées (⚠ problème signalé) sont masquées de cette liste.
        </p>
      )}
      {mode === "nouvelle" && (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={nouveauZoneId}
            onChange={(e) => {
              setNouveauZoneId(e.target.value);
              if (nouveauCode) onChange({ mode: "nouvelle", zoneId: e.target.value, code: nouveauCode });
            }}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
          >
            <option value="">Zone...</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label || z.code}
              </option>
            ))}
          </select>
          <input
            value={nouveauCode}
            onChange={(e) => {
              setNouveauCode(e.target.value);
              if (nouveauZoneId) onChange({ mode: "nouvelle", zoneId: nouveauZoneId, code: e.target.value });
            }}
            placeholder="Code (ex: F1-0-A)"
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
