"use client";

import { useEffect, useState } from "react";
import type { AlveoleWithOccupancy, Category, Zone } from "@/lib/types";
import { contenuQrAlveole } from "@/lib/qr";
import { PALETTE_TYPE_OPTIONS, PALETTE_TYPES } from "@/lib/palettes";
import EtiquettesAlveoles from "@/components/EtiquettesAlveoles";
import { IconLock, IconPrinter, IconUnlock } from "@/components/icons";
import Button from "@/components/ui/Button";

export default function AlveolesAdminPage() {
  const [alveoles, setAlveoles] = useState<AlveoleWithOccupancy[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [prefixeQr, setPrefixeQr] = useState("");
  const [prefixeQrInput, setPrefixeQrInput] = useState("");
  const [prefixeQrMessage, setPrefixeQrMessage] = useState<string | null>(null);
  // Le rôle "dev" peut créer des alvéoles mais pas les supprimer.
  const [role, setRole] = useState<string | null>(null);
  // Le rôle "dev" peut créer des alvéoles mais ne peut ni les modifier
  // (capacité, blocage) ni les supprimer — seul un vrai admin le peut.
  const estAdminStrict = role === "admin";
  const peutSupprimer = estAdminStrict;
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

  // Étiquettes QR code à imprimer (une seule alvéole, ou plusieurs d'un coup).
  const [printAlveoles, setPrintAlveoles] = useState<AlveoleWithOccupancy[] | null>(null);

  // Sélection multiple pour la suppression en masse.
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => {
    load();
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => json.role && setRole(json.role));
  }, []);

  useEffect(() => {
    if (printAlveoles) {
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [printAlveoles]);

  async function load() {
    const [alvRes, zoneRes, catRes, paramRes] = await Promise.all([
      fetch("/api/alveoles"),
      fetch("/api/zones"),
      fetch("/api/categories"),
      fetch("/api/parametres"),
    ]);
    const alvJson = await alvRes.json();
    const zoneJson = await zoneRes.json();
    const catJson = await catRes.json();
    const paramJson = await paramRes.json();
    if (alvRes.ok) setAlveoles(alvJson.alveoles);
    if (zoneRes.ok) setZones(zoneJson.zones);
    if (catRes.ok) setCategories(catJson.categories);
    if (paramRes.ok) {
      setPrefixeQr(paramJson.parametres.qr_prefixe_alveole ?? "");
      setPrefixeQrInput(paramJson.parametres.qr_prefixe_alveole ?? "");
    }
  }

  async function handleEnregistrerPrefixeQr(e: React.FormEvent) {
    e.preventDefault();
    setPrefixeQrMessage(null);
    const res = await fetch("/api/parametres", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrPrefixeAlveole: prefixeQrInput }),
    });
    const json = await res.json();
    if (!res.ok) {
      setPrefixeQrMessage(json.error);
      return;
    }
    setPrefixeQr(json.parametres.qr_prefixe_alveole ?? "");
    setPrefixeQrMessage("Enregistré. Les prochaines étiquettes imprimées utiliseront ce format.");
  }

  function zoneLabel(id: string) {
    const z = zones.find((z) => z.id === id);
    return z ? z.label || z.code : "?";
  }

  // Nom de la catégorie couvrant cette zone (ex: zones B et C → "TVilum"),
  // affiché sur les étiquettes imprimées à la place du code de zone brut —
  // c'est ce nom-là qui parle aux employés, pas "B" ou "C" (voir
  // /admin/categories).
  function categorieLabel(zoneId: string) {
    return categories.find((c) => c.zone_ids?.includes(zoneId))?.name ?? null;
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

  async function handleBloquer(a: AlveoleWithOccupancy) {
    const motif = prompt(`Pourquoi bloquer l'alvéole ${a.code} ? (ex: lisse cassée)`);
    if (motif === null) return;
    await handleUpdate(a, { bloquee: true, bloquee_motif: motif });
  }

  async function handleDebloquer(a: AlveoleWithOccupancy) {
    if (!confirm(`Débloquer l'alvéole ${a.code} ?`)) return;
    await handleUpdate(a, { bloquee: false, bloquee_motif: null });
  }

  function toggleSelection(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectionTout(ids: string[]) {
    setSelection((prev) => {
      const tousSelectionnes = ids.length > 0 && ids.every((id) => prev.has(id));
      return tousSelectionnes ? new Set() : new Set(ids);
    });
  }

  async function handleSupprimerSelection() {
    if (selection.size === 0) return;
    if (
      !confirm(
        `Supprimer les ${selection.size} alvéole(s) sélectionnée(s) ? Elles seront retirées de tous les produits qui y sont rangés.`
      )
    )
      return;
    setSuppressionEnCours(true);
    try {
      const res = await fetch("/api/alveoles/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selection] }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error);
        return;
      }
      setMessage(`${json.supprimees} alvéole(s) supprimée(s).`);
      setSelection(new Set());
      load();
    } finally {
      setSuppressionEnCours(false);
    }
  }

  const filtered = filtreZone ? alveoles.filter((a) => a.zone_id === filtreZone) : alveoles;
  const idsFiltres = filtered.map((a) => a.id);
  const toutSelectionne = idsFiltres.length > 0 && idsFiltres.every((id) => selection.has(id));

  return (
    <>
    <div className="print:hidden">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Alvéoles</h1>
      <p className="mb-6 text-sm text-but-gray">
        Les emplacements précis à l&apos;intérieur de chaque zone (ex:
        F1-0-A). La capacité (kg) sécurise les lisses : le site alerte si un
        rangement dépasse cette limite.
      </p>

      {message && (
        <p className="mb-4 whitespace-pre-line rounded-xl bg-but-gray-light px-3 py-2 text-sm text-but-dark">{message}</p>
      )}

      <div className="mb-10 grid gap-6 sm:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 font-bold text-but-dark">Ajouter une alvéole</h2>
          <div className="grid grid-cols-2 gap-2">
            <select
              required
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="col-span-2 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
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
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <input
              value={capaciteKg}
              onChange={(e) => setCapaciteKg(e.target.value)}
              placeholder="Capacité (kg)"
              type="number"
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <select
              value={tailleMax}
              onChange={(e) => setTailleMax(e.target.value)}
              className="col-span-2 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
            >
              <option value="">Taille max de palette (non précisé)</option>
              {PALETTE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {PALETTE_TYPES[t].label} ({PALETTE_TYPES[t].dimensions})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="mt-3 w-full">
            Créer
          </Button>
        </form>

        <form onSubmit={handleBulk} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
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
              className="col-span-2 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
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
              className="col-span-2 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <label className="flex items-center gap-1 text-xs">
              Travées
              <input type="number" value={bayFrom} onChange={(e) => setBayFrom(Number(e.target.value))} className="w-14 rounded-lg border border-gray-300 px-1 py-1" />
              à
              <input type="number" value={bayTo} onChange={(e) => setBayTo(Number(e.target.value))} className="w-14 rounded-lg border border-gray-300 px-1 py-1" />
            </label>
            <label className="flex items-center gap-1 text-xs">
              Niveaux
              <input type="number" value={levelFrom} onChange={(e) => setLevelFrom(Number(e.target.value))} className="w-14 rounded-lg border border-gray-300 px-1 py-1" />
              à
              <input type="number" value={levelTo} onChange={(e) => setLevelTo(Number(e.target.value))} className="w-14 rounded-lg border border-gray-300 px-1 py-1" />
            </label>
            <input
              value={positions}
              onChange={(e) => setPositions(e.target.value)}
              placeholder="Positions (A,B,C)"
              className="col-span-2 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <input
              value={bulkCapacite}
              onChange={(e) => setBulkCapacite(e.target.value)}
              placeholder="Capacité (kg)"
              type="number"
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <select
              value={bulkTailleMax}
              onChange={(e) => setBulkTailleMax(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none"
            >
              <option value="">Taille max (non précisé)</option>
              {PALETTE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {PALETTE_TYPES[t].label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" className="mt-3 w-full">
            Générer
          </Button>
        </form>
      </div>

      <form
        onSubmit={handleEnregistrerPrefixeQr}
        className="mb-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-card"
      >
        <h2 className="mb-1 font-bold text-but-dark">Format du QR code des alvéoles</h2>
        <p className="mb-3 text-xs text-but-gray">
          Ce texte est collé devant le code de l&apos;alvéole dans le QR (pas sur
          l&apos;étiquette imprimée, qui reste lisible avec le code seul) — utile si
          ton lecteur/PDA attend un format précis, ex.{" "}
          <span className="font-mono">999000000000Nosica@</span> +{" "}
          <span className="font-mono">B1-5-A</span>. Laisse vide pour encoder juste
          le code de l&apos;alvéole (comportement par défaut).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={prefixeQrInput}
            onChange={(e) => setPrefixeQrInput(e.target.value)}
            placeholder="Préfixe (ex: 999000000000Nosica@)"
            className="min-w-[16rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-but-red focus:outline-none"
          />
          <Button type="submit">Enregistrer</Button>
        </div>
        <p className="mt-2 text-xs text-but-gray">
          Aperçu :{" "}
          <span className="font-mono font-semibold text-but-dark">
            {contenuQrAlveole("B1-5-A", prefixeQrInput)}
          </span>
        </p>
        {prefixeQrMessage && (
          <p className="mt-2 rounded-lg bg-but-gray-light px-2 py-1.5 text-xs text-but-gray">
            {prefixeQrMessage}
          </p>
        )}
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-but-dark">Toutes les alvéoles</h2>
        <select
          value={filtreZone}
          onChange={(e) => setFiltreZone(e.target.value)}
          className="ml-auto rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-but-red focus:outline-none"
        >
          <option value="">Toutes les zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label || z.code}
            </option>
          ))}
        </select>
        {peutSupprimer && selection.size > 0 && (
          <Button size="sm" variant="danger" onClick={handleSupprimerSelection} loading={suppressionEnCours}>
            Supprimer la sélection ({selection.size})
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPrintAlveoles(filtered)}
          disabled={filtered.length === 0}
        >
          <IconPrinter className="h-4 w-4" />
          Imprimer les étiquettes QR ({filtered.length})
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-but-gray-light text-left">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={toutSelectionne}
                  onChange={() => toggleSelectionTout(idsFiltres)}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th className="whitespace-nowrap px-3 py-2">Code</th>
              <th className="min-w-[8rem] px-3 py-2">Zone</th>
              <th className="whitespace-nowrap px-3 py-2">Poids actuel</th>
              <th className="whitespace-nowrap px-3 py-2">Capacité (kg)</th>
              <th className="min-w-[11rem] px-3 py-2">Taille max palette</th>
              <th className="whitespace-nowrap px-3 py-2">Bloquée</th>
              <th className="whitespace-nowrap px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className={`border-t border-gray-100 ${a.bloquee ? "bg-red-50" : selection.has(a.id) ? "bg-but-red/5" : ""}`}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selection.has(a.id)}
                    onChange={() => toggleSelection(a.id)}
                    aria-label={`Sélectionner ${a.code}`}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold">{a.code}</td>
                <td className="px-3 py-2">{zoneLabel(a.zone_id)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {a.poids_actuel_kg} kg
                  {a.capacite_kg != null && a.poids_actuel_kg > a.capacite_kg && (
                    <span className="ml-1 text-but-red">⚠</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {estAdminStrict ? (
                    <input
                      type="number"
                      defaultValue={a.capacite_kg ?? ""}
                      onBlur={(e) => handleUpdate(a, { capacite_kg: e.target.value })}
                      className="w-20 rounded border border-gray-200 px-2 py-1"
                    />
                  ) : (
                    <span className="text-but-gray">{a.capacite_kg ?? "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {estAdminStrict ? (
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
                  ) : (
                    <span className="text-but-gray">
                      {a.taille_palette_max ? PALETTE_TYPES[a.taille_palette_max].label : "Non précisé"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {!estAdminStrict ? (
                    <span className="text-but-gray">{a.bloquee ? "Bloquée" : "—"}</span>
                  ) : a.bloquee ? (
                    <div>
                      <button
                        onClick={() => handleDebloquer(a)}
                        className="flex items-center gap-1 rounded-lg bg-but-dark px-2 py-1 text-xs font-semibold text-white hover:bg-but-gray"
                      >
                        <IconUnlock className="h-3.5 w-3.5" />
                        Débloquer
                      </button>
                      {a.bloquee_motif && (
                        <p className="mt-1 max-w-[12rem] text-xs text-but-gray">{a.bloquee_motif}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBloquer(a)}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-but-dark hover:border-but-red hover:text-but-red"
                    >
                      <IconLock className="h-3.5 w-3.5" />
                      Bloquer
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setPrintAlveoles([a])}
                    className="mr-2 inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-but-dark hover:border-but-red hover:text-but-red"
                  >
                    <IconPrinter className="h-3.5 w-3.5" />
                    QR
                  </button>
                  {peutSupprimer && (
                    <button
                      onClick={() => handleDelete(a)}
                      className="rounded-lg border border-but-red/30 px-2 py-1 text-xs font-semibold text-but-red hover:bg-but-red hover:text-white"
                    >
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {printAlveoles && (
      <EtiquettesAlveoles
        alveoles={printAlveoles.map((a) => ({
          code: a.code,
          zoneLabel: categorieLabel(a.zone_id) ?? zoneLabel(a.zone_id),
        }))}
        prefixeQr={prefixeQr}
      />
    )}
    </>
  );
}
