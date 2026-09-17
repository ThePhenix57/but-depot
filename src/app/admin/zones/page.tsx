"use client";

import { useEffect, useState } from "react";
import WarehouseMap, { type RectPct } from "@/components/WarehouseMap";
import type { Zone } from "@/lib/types";
import Button from "@/components/ui/Button";
import { IconClose } from "@/components/icons";

export default function ZonesAdminPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Zone en attente d'un dessin : soit une nouvelle zone (formulaire
  // code/libellé/couleur en attente de son premier rectangle), soit une
  // zone existante à laquelle on ajoute un rectangle supplémentaire (ex:
  // même zone coupée en deux endroits séparés sur le plan).
  const [nouvelleEnAttente, setNouvelleEnAttente] = useState<{
    code: string;
    label: string;
    couleur: string;
  } | null>(null);
  const [ajoutRectPour, setAjoutRectPour] = useState<Zone | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Formulaire "nouvelle zone" (juste les infos, la position se dessine ensuite)
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [couleur, setCouleur] = useState("#E2001A");

  // Le rôle "dev" peut créer des zones et toucher aux rectangles du plan,
  // mais ne peut pas supprimer une zone entière (ça efface aussi ses
  // alvéoles en cascade) — seul un vrai admin le peut.
  const [role, setRole] = useState<string | null>(null);
  const peutSupprimerZone = role === "admin";

  useEffect(() => {
    load();
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => json.role && setRole(json.role));
  }, []);

  async function load() {
    const res = await fetch("/api/zones");
    const json = await res.json();
    if (res.ok) setZones(json.zones);
  }

  function armerNouvelleZone(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setAjoutRectPour(null);
    setNouvelleEnAttente({ code: code.trim(), label: label.trim(), couleur });
    setMessage(
      `Dessine le rectangle de la zone "${code.trim()}" directement sur le plan ci-dessous (clic, glisser, relâcher).`
    );
  }

  function armerAjoutRect(zone: Zone) {
    setNouvelleEnAttente(null);
    setAjoutRectPour(zone);
    setMessage(
      `Dessine le rectangle supplémentaire de "${zone.code}" sur le plan (ex: la partie séparée du même rack) : clique, glisse, relâche.`
    );
  }

  async function handleRectDrawn(rect: RectPct) {
    if (ajoutRectPour) {
      const res = await fetch(`/api/zones/${ajoutRectPour.id}/rects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rect),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error);
      } else {
        setMessage(`Rectangle ajouté à la zone "${ajoutRectPour.code}".`);
      }
      setAjoutRectPour(null);
      load();
      return;
    }

    if (nouvelleEnAttente) {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: nouvelleEnAttente.code,
          label: nouvelleEnAttente.label || null,
          couleur: nouvelleEnAttente.couleur,
          ...rect,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error);
      } else {
        setMessage(`Zone "${json.zone.code}" créée.`);
        setCode("");
        setLabel("");
      }
      setNouvelleEnAttente(null);
      load();
      return;
    }

    setMessage(
      'Clique d\'abord sur "Créer" (nouvelle zone) ou "Ajouter un rectangle" avant de dessiner sur le plan.'
    );
  }

  async function handleDeleteRect(rectId: string, zoneCode: string) {
    if (!confirm(`Supprimer ce rectangle de la zone "${zoneCode}" ?`)) return;
    const res = await fetch(`/api/zones/rects/${rectId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    load();
  }

  async function handleRename(zone: Zone, newLabel: string) {
    const res = await fetch(`/api/zones/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel }),
    });
    const json = await res.json();
    if (!res.ok) setMessage(json.error);
    load();
  }

  async function handleToggleOrdre(zone: Zone) {
    const res = await fetch(`/api/zones/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordre_inverse: !zone.ordre_inverse }),
    });
    const json = await res.json();
    if (!res.ok) setMessage(json.error);
    load();
  }

  async function handleDelete(zone: Zone) {
    if (
      !confirm(
        `Supprimer toute la zone ${zone.code} (et ses ${
          zone.rects?.length ?? 0
        } rectangle(s)) ? Elle sera retirée de tous les produits qui y sont rangés.`
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

  const enAttenteDeDessin = !!nouvelleEnAttente || !!ajoutRectPour;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">
        Plan de l&apos;entrepôt — zones (allées)
      </h1>
      <p className="mb-6 text-sm text-but-gray">
        Les grandes zones affichées sur le plan (ex: allée &quot;F&quot;), positionnées
        directement sur la photo réelle de l&apos;entrepôt. Une même zone peut
        couvrir plusieurs rectangles (ex: un rack coupé en deux endroits
        séparés sur le plan). Les emplacements précis à l&apos;intérieur d&apos;une
        zone (ex: F1-0-A) se gèrent dans <strong>Alvéoles</strong>.
      </p>

      {message && (
        <p className="mb-4 rounded-xl bg-but-gray-light px-3 py-2 text-sm text-but-dark">{message}</p>
      )}

      <div className="mb-8">
        <WarehouseMap
          zones={zones}
          selectedZoneId={selected}
          onZoneClick={(z) => setSelected(z.id)}
          editable
          onRectDrawn={handleRectDrawn}
        />
        {enAttenteDeDessin && (
          <p className="mt-2 rounded-xl bg-but-red/10 px-3 py-2 text-sm font-medium text-but-red-dark">
            En attente de dessin sur le plan — clique, glisse, relâche pour placer{" "}
            {ajoutRectPour ? `un rectangle de "${ajoutRectPour.code}"` : `"${nouvelleEnAttente?.code}"`}.
          </p>
        )}
      </div>

      <h2 className="mb-3 text-lg font-bold text-but-dark">Nouvelle zone</h2>
      <form
        onSubmit={armerNouvelleZone}
        className="mb-10 grid grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:grid-cols-4"
      >
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code (ex: F)"
          className="rounded-lg border border-gray-300 px-3 py-2 focus:border-but-red focus:outline-none"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (facultatif)"
          className="rounded-lg border border-gray-300 px-3 py-2 focus:border-but-red focus:outline-none"
        />
        <input
          type="color"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300"
        />
        <Button type="submit">Créer, puis dessiner sur le plan</Button>
      </form>

      <h2 className="mb-3 text-lg font-bold text-but-dark">Toutes les zones</h2>
      <div className="flex flex-col gap-3">
        {zones.map((z) => (
          <div key={z.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{z.code}</span>
              <input
                defaultValue={z.label ?? ""}
                onBlur={(e) => handleRename(z, e.target.value)}
                placeholder="Libellé"
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-but-red focus:outline-none"
              />
              <span className="text-xs text-but-gray">
                {(z.rects?.length ?? 0) === 0
                  ? "Pas encore placée"
                  : `${z.rects!.length} rectangle(s)`}
              </span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => armerAjoutRect(z)}>
                  Ajouter un rectangle
                </Button>
                {peutSupprimerZone && (
                  <Button size="sm" variant="danger" onClick={() => handleDelete(z)}>
                    Supprimer la zone
                  </Button>
                )}
              </div>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-but-gray">
              <input
                type="checkbox"
                checked={!!z.ordre_inverse}
                onChange={() => handleToggleOrdre(z)}
              />
              Inverser l&apos;ordre des travées dans l&apos;aperçu (si sur le terrain le
              numéro de travée augmente vers la gauche plutôt que vers la droite)
            </label>
            {(z.rects?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {z.rects!.map((r, i) => (
                  <span
                    key={r.id}
                    className="flex items-center gap-1 rounded-full bg-but-gray-light px-2 py-1 text-xs"
                  >
                    Rectangle {i + 1}
                    <button
                      onClick={() => handleDeleteRect(r.id, z.code)}
                      className="text-but-red hover:text-but-red-dark"
                      title="Supprimer ce rectangle"
                    >
                      <IconClose className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
