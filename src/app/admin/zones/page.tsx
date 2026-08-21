"use client";

import { useEffect, useState } from "react";
import WarehouseMap from "@/components/WarehouseMap";
import type { Zone } from "@/lib/types";

export default function ZonesAdminPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Formulaire de création
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [largeur, setLargeur] = useState(1);
  const [hauteur, setHauteur] = useState(1);
  const [couleur, setCouleur] = useState("#E2001A");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/zones");
    const json = await res.json();
    if (res.ok) setZones(json.zones);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        label,
        pos_x: posX,
        pos_y: posY,
        largeur,
        hauteur,
        couleur,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    setMessage(`Zone ${json.zone.code} créée.`);
    setCode("");
    setLabel("");
    load();
  }

  async function handleUpdate(zone: Zone, updates: Partial<Zone>) {
    const res = await fetch(`/api/zones/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    load();
  }

  async function handleDelete(zone: Zone) {
    if (
      !confirm(
        `Supprimer la zone ${zone.code} ? Elle sera retirée de tous les produits qui y sont rangés.`
      )
    )
      return;
    const res = await fetch(`/api/zones/${zone.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    setMessage(`Zone ${zone.code} supprimée.`);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-but-dark">
        Plan de l&apos;entrepôt — zones (allées)
      </h1>
      <p className="mb-6 text-sm text-but-gray">
        Les grandes zones affichées sur le plan (ex: allée &quot;F&quot;).
        Position/taille en nombre de cases de grille (colonne, ligne,
        largeur, hauteur). Les emplacements précis à l&apos;intérieur d&apos;une
        zone (ex: F1-0-A) se gèrent dans <strong>Alvéoles</strong>.
      </p>

      {message && (
        <p className="mb-4 rounded bg-but-gray-light px-3 py-2 text-sm">{message}</p>
      )}

      <div className="mb-8">
        <WarehouseMap
          zones={zones}
          selectedZoneId={selected}
          onZoneClick={(z) => setSelected(z.id)}
        />
      </div>

      <h2 className="mb-3 text-lg font-bold text-but-dark">Nouvelle zone</h2>
      <form
        onSubmit={handleCreate}
        className="mb-10 grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-4"
      >
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code (ex: F)"
          className="rounded border border-gray-300 px-3 py-2"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (facultatif)"
          className="rounded border border-gray-300 px-3 py-2"
        />
        <input
          type="color"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          className="h-10 w-full rounded border border-gray-300"
        />
        <div className="grid grid-cols-4 gap-1 text-xs">
          <label className="flex flex-col">
            Col.
            <input
              type="number"
              value={posX}
              onChange={(e) => setPosX(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col">
            Ligne
            <input
              type="number"
              value={posY}
              onChange={(e) => setPosY(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col">
            Larg.
            <input
              type="number"
              min={1}
              value={largeur}
              onChange={(e) => setLargeur(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col">
            Haut.
            <input
              type="number"
              min={1}
              value={hauteur}
              onChange={(e) => setHauteur(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
        </div>
        <button
          type="submit"
          className="col-span-2 rounded bg-but-red px-4 py-2 font-semibold text-white sm:col-span-4"
        >
          Créer la zone
        </button>
      </form>

      <h2 className="mb-3 text-lg font-bold text-but-dark">Toutes les zones</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-but-gray-light text-left">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Libellé</th>
              <th className="px-3 py-2">Col.</th>
              <th className="px-3 py-2">Ligne</th>
              <th className="px-3 py-2">Larg.</th>
              <th className="px-3 py-2">Haut.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold">{z.code}</td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={z.label ?? ""}
                    onBlur={(e) => handleUpdate(z, { label: e.target.value })}
                    className="w-full rounded border border-gray-200 px-2 py-1"
                  />
                </td>
                {(["pos_x", "pos_y", "largeur", "hauteur"] as const).map((field) => (
                  <td key={field} className="px-3 py-2">
                    <input
                      type="number"
                      defaultValue={z[field]}
                      onBlur={(e) =>
                        handleUpdate(z, { [field]: Number(e.target.value) })
                      }
                      className="w-16 rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleDelete(z)}
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
