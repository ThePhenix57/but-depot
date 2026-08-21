"use client";

import { useEffect, useState } from "react";
import type { AlveoleWithOccupancy, Zone } from "@/lib/types";
import { PALETTE_TYPE_OPTIONS, PALETTE_TYPES } from "@/lib/palettes";

export default function AlveolesAdminPage() {
  const [alveoles, setAlveoles] = useState<AlveoleWithOccupancy[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [filtreZone, setFiltreZone] = useState("");

  // Création simple
  const [zoneId, setZoneId] = useState("");
  const [code, setCode] = useState("");
  const [capaciteKg, setCapaciteKg] = useState("");
  const [tailleMax, setTailleMax] = useState("");

  // Génération en série
  const [bulkZoneId, setBulkZoneId] = useState("");
  const [aisleCode, setAisleCode] = useState("");
  const [bayFrom, setBayFrom] = useState(1);
  const [bayTo, setBayTo] = useState(6);
  const [levelFrom, setLevelFrom] = useState(0);
  const [levelTo, setLevelTo] = useState(3);
  const [positions, setPositions] = useState("A,B,C");
  const [bulkCapacite, setBulkCapacite] = useState("");
  const [bulkTailleMax, setBulkTailleMax] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [alvRes, zoneRes] = await Promise.all([fetch("/api/alveoles"), fetch("/api/zones")]);
    const alvJson = await alvRes.json();
    const zoneJson = await zoneRes.json();
    if (alvRes.ok) setAlveoles(alvJson.alveoles);
    if (zoneRes.ok) setZones(zoneJson.zones);
  }

  function zoneLabel(id: string) {
    const z = zones.find((z) => z.id === id);
    return z ? z.label || z.code : "?";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/alveoles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoneId, code, capaciteKg: capaciteKg || null, taillePaletteMax: tailleMax || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    setMessage(`Alvéole ${json.alveole.code} créée.`);
    setCode("");
    load();
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/alveoles/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zoneId: bulkZoneId,
        aisleCode,
        bayFrom,
        bayTo,
        levelFrom,
        levelTo,
        positions: positions.split(",").map((p) => p.trim()).filter(Boolean),
        capaciteKg: bulkCapacite || null,
        taillePaletteMax: bulkTailleMax || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    setMessage(
      `${json.creees} alvéole(s) créée(s) sur ${json.demandees} demandées (${json.ignorees} existaient déjà).`
    );
    load();
  }

  async function handleUpdate(a: AlveoleWithOccupancy, updates: Record<string, unknown>) {
    const res = await fetch(`/api/alveoles/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) load();
  }

  async function handleDelete(a: AlveoleWithOccupancy) {
    if (!confirm(`Supprimer l'alvéole ${a.code} ? Elle sera retirée de tous les produits qui y sont rangés.`))
      return;
    const res = await fetch(`/api/alveoles/${a.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const filtered = filtreZone ? alveoles.filter((a) => a.zone_id === filtreZone) : alveoles;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-but-dark">Alvéoles</h1>
      <p className="mb-6 text-sm text-but-gray">
        Les emplacements précis à l&apos;intérieur de chaque zone (ex:
        F1-0-A). La capacité (kg) sécurise les lisses : le site alerte si un
        rangement dépasse cette limite.
      </p>

      {message && (
        <p className="mb-4 whitespace-pre-line rounded bg-but-gray-light px-3 py-2 text-sm">{message}</p>
      )}

      <div className="mb-10 grid gap-6 sm:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 font-bold text-but-dark">Ajouter une alvéole</h2>
          <div className="grid grid-cols-2 gap-2">
            <select
              required
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="col-span-2 rounded border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Zone...</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label || z.code}
                </option>
              ))}
            </select>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code (ex: F1-0-A)"
              className="rounded border border-gray-300 px-2 py-2 text-sm"
            />
            <input
              value={capaciteKg}
              onChange={(e) => setCapaciteKg(e.target.value)}
              placeholder="Capacité (kg)"
              type="number"
              className="rounded border border-gray-300 px-2 py-2 text-sm"
            />
            <select
              value={tailleMax}
              onChange={(e) => setTailleMax(e.target.value)}
              className="col-span-2 rounded border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Taille max de palette (non précisé)</option>
              {PALETTE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {PALETTE_TYPES[t].label} ({PALETTE_TYPES[t].dimensions})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="mt-3 w-full rounded bg-but-red px-4 py-2 font-semibold text-white">
            Créer
          </button>
        </form>

        <form onSubmit={handleBulk} className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 font-bold text-but-dark">Générer en série</h2>
          <p className="mb-2 text-xs text-but-gray">
            Ex: préfixe &quot;F&quot;, travées 1 à 6, niveaux 0 à 3, positions
            A,B,C → crée F1-0-A ... F6-3-C.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <select
              required
              value={bulkZoneId}
              onChange={(e) => setBulkZoneId(e.target.value)}
              className="col-span-2 rounded border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Zone...</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label || z.code}
                </option>
              ))}
            </select>
            <input
              required
              value={aisleCode}
              onChange={(e) => setAisleCode(e.target.value)}
              placeholder="Préfixe (ex: F)"
              className="col-span-2 rounded border border-gray-300 px-2 py-2 text-sm"
            />
            <label className="flex items-center gap-1 text-xs">
              Travées
              <input type="number" value={bayFrom} onChange={(e) => setBayFrom(Number(e.target.value))} className="w-14 rounded border border-gray-300 px-1 py-1" />
              à
              <input type="number" value={bayTo} onChange={(e) => setBayTo(Number(e.target.value))} className="w-14 rounded border border-gray-300 px-1 py-1" />
            </label>
            <label className="flex items-center gap-1 text-xs">
              Niveaux
              <input type="number" value={levelFrom} onChange={(e) => setLevelFrom(Number(e.target.value))} className="w-14 rounded border border-gray-300 px-1 py-1" />
              à
              <input type="number" value={levelTo} onChange={(e) => setLevelTo(Number(e.target.value))} className="w-14 rounded border border-gray-300 px-1 py-1" />
            </label>
            <input
              value={positions}
              onChange={(e) => setPositions(e.target.value)}
              placeholder="Positions (A,B,C)"
              className="col-span-2 rounded border border-gray-300 px-2 py-2 text-sm"
            />
            <input
              value={bulkCapacite}
              onChange={(e) => setBulkCapacite(e.target.value)}
              placeholder="Capacité (kg)"
              type="number"
              className="rounded border border-gray-300 px-2 py-2 text-sm"
            />
            <select
              value={bulkTailleMax}
              onChange={(e) => setBulkTailleMax(e.target.value)}
              className="rounded border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Taille max (non précisé)</option>
              {PALETTE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {PALETTE_TYPES[t].label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="mt-3 w-full rounded bg-but-dark px-4 py-2 font-semibold text-white">
            Générer
          </button>
        </form>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold text-but-dark">Toutes les alvéoles</h2>
        <select
          value={filtreZone}
          onChange={(e) => setFiltreZone(e.target.value)}
          className="ml-auto rounded border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">Toutes les zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label || z.code}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-but-gray-light text-left">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2">Poids actuel</th>
              <th className="px-3 py-2">Capacité (kg)</th>
              <th className="px-3 py-2">Taille max palette</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold">{a.code}</td>
                <td className="px-3 py-2">{zoneLabel(a.zone_id)}</td>
                <td className="px-3 py-2">
                  {a.poids_actuel_kg} kg
                  {a.capacite_kg != null && a.poids_actuel_kg > a.capacite_kg && (
                    <span className="ml-1 text-but-red">⚠</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    defaultValue={a.capacite_kg ?? ""}
                    onBlur={(e) => handleUpdate(a, { capacite_kg: e.target.value })}
                    className="w-20 rounded border border-gray-200 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={a.taille_palette_max ?? ""}
                    onChange={(e) => handleUpdate(a, { taille_palette_max: e.target.value || null })}
                    className="rounded border border-gray-200 px-2 py-1"
                  >
                    <option value="">Non précisé</option>
                    {PALETTE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {PALETTE_TYPES[t].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleDelete(a)}
                    className="rounded border border-but-red px-2 py-1 text-xs font-semibold text-but-red hover:bg-but-red hover:text-white"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
