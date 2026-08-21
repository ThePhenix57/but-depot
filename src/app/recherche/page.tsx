"use client";

import { useEffect, useState } from "react";
import WarehouseMap from "@/components/WarehouseMap";
import PrintableFiches from "@/components/PrintableFiches";
import AlveoleSelector, { type AlveoleChoix } from "@/components/AlveoleSelector";
import { PALETTE_TYPE_OPTIONS, PALETTE_TYPES, type TypePalette } from "@/lib/palettes";
import type {
  AlveoleWithOccupancy,
  Category,
  Product,
  ProductLocation,
  RangementResultat,
  Zone,
} from "@/lib/types";

// NOTE: le Header est affiché par le layout racine (src/app/layout.tsx),
// pas par cette page.

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; product: Product; locations: ProductLocation[]; suggestedZoneIds: string[] }
  | { status: "not-found" }
  | { status: "error"; message: string };

interface PaletteRow {
  typePalette: TypePalette;
  choix: AlveoleChoix | null;
  colisOverride: string;
}

function nouvellePalette(): PaletteRow {
  return { typePalette: "eur", choix: null, colisOverride: "" };
}

export default function RecherchePage() {
  const [ean, setEan] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [allAlveoles, setAllAlveoles] = useState<AlveoleWithOccupancy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Nouveau produit
  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newPoidsColis, setNewPoidsColis] = useState("");
  const [newColisEur, setNewColisEur] = useState("");
  const [newColisCentrale, setNewColisCentrale] = useState("");

  // Rangement (palettes à placer)
  const [palettes, setPalettes] = useState<PaletteRow[]>([nouvellePalette()]);
  const [rangementEnCours, setRangementEnCours] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [printData, setPrintData] = useState<{ product: Product; resultats: RangementResultat[] } | null>(null);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (printData) {
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [printData]);

  async function refreshAll() {
    const [zonesRes, alveolesRes, categoriesRes] = await Promise.all([
      fetch("/api/zones"),
      fetch("/api/alveoles"),
      fetch("/api/categories"),
    ]);
    const zonesJson = await zonesRes.json();
    const alveolesJson = await alveolesRes.json();
    const categoriesJson = await categoriesRes.json();
    if (zonesRes.ok) setAllZones(zonesJson.zones);
    if (alveolesRes.ok) setAllAlveoles(alveolesJson.alveoles);
    if (categoriesRes.ok) setCategories(categoriesJson.categories);
  }

  async function search(eanToSearch: string) {
    const value = eanToSearch.trim();
    if (!value) return;
    setState({ status: "loading" });
    setMessage(null);
    setPrintData(null);
    setNewName("");
    setNewCategoryId("");
    setNewPoidsColis("");
    setNewColisEur("");
    setNewColisCentrale("");
    setPalettes([nouvellePalette()]);

    const res = await fetch(`/api/produits/recherche?ean=${encodeURIComponent(value)}`);
    const json = await res.json();

    if (!res.ok) {
      setState({ status: "error", message: json.error || "Erreur inconnue" });
      return;
    }
    if (!json.found) {
      setState({ status: "not-found" });
      return;
    }
    setState({
      status: "found",
      product: json.product,
      locations: json.locations,
      suggestedZoneIds: json.suggestedZoneIds,
    });
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/produits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ean,
        name: newName,
        categoryId: newCategoryId || null,
        poidsColisKg: newPoidsColis || null,
        colisParPaletteEur: newColisEur || null,
        colisParPaletteCentrale: newColisCentrale || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Erreur lors de la création.");
      return;
    }
    await search(ean);
    setMessage(`Produit "${json.product.name}" créé. Choisis maintenant où le ranger ci-dessous.`);
  }

  function updatePalette(index: number, patch: Partial<PaletteRow>) {
    setPalettes((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function setNombrePalettes(n: number) {
    const clamped = Math.max(1, Math.min(50, n));
    setPalettes((prev) => {
      if (clamped > prev.length) {
        return [...prev, ...Array.from({ length: clamped - prev.length }, nouvellePalette)];
      }
      return prev.slice(0, clamped);
    });
  }

  async function handleRangement(e: React.FormEvent) {
    e.preventDefault();
    if (state.status !== "found") return;
    setMessage(null);

    const payloadPalettes = [];
    for (const p of palettes) {
      if (!p.choix) {
        setMessage("Choisis une alvéole pour chaque palette avant de valider.");
        return;
      }
      const base: Record<string, unknown> = {
        typePalette: p.typePalette,
        colisOverride: p.colisOverride ? Number(p.colisOverride) : undefined,
      };
      if (p.choix.mode === "existante") {
        base.alveoleId = p.choix.alveoleId;
      } else {
        if (!p.choix.zoneId || !p.choix.code) {
          setMessage("Renseigne la zone et le code pour chaque nouvelle alvéole.");
          return;
        }
        base.newAlveole = { zoneId: p.choix.zoneId, code: p.choix.code };
      }
      payloadPalettes.push(base);
    }

    setRangementEnCours(true);
    const res = await fetch("/api/rangement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: state.product.id, palettes: payloadPalettes }),
    });
    const json = await res.json();
    setRangementEnCours(false);

    if (!res.ok) {
      setMessage(json.error || "Erreur lors du rangement.");
      return;
    }

    const depassements = (json.resultats as RangementResultat[]).filter((r) => r.depassement);
    await refreshAll();
    await search(ean);
    setPrintData({ product: state.product, resultats: json.resultats });
    setMessage(
      `${json.resultats.length} palette(s) rangée(s).` +
        (depassements.length > 0
          ? ` ⚠ Poids max dépassé pour : ${depassements.map((r) => r.alveole_code).join(", ")}.`
          : "")
    );
  }

  const highlightedZoneIds =
    state.status === "found" ? state.locations.map((l) => l.alveole.zone.id) : [];
  const suggestedZoneIds = state.status === "found" ? state.suggestedZoneIds : [];
  const currentAlveoleIds =
    state.status === "found" ? state.locations.map((l) => l.alveole_id) : [];

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-8 print:hidden">
        <h1 className="mb-1 text-2xl font-bold text-but-dark">
          Recherche marchandise
        </h1>
        <p className="mb-6 text-sm text-but-gray">
          Entre le code EAN de la commande pour retrouver le produit et son
          emplacement, ou en enregistrer un nouveau.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(ean);
          }}
          className="mb-6 flex gap-2"
        >
          <input
            autoFocus
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            placeholder="Code EAN reçu..."
            className="flex-1 rounded border border-gray-300 px-4 py-3 text-lg focus:border-but-red focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-but-red px-6 py-3 font-semibold text-white hover:bg-but-red-dark"
          >
            Rechercher
          </button>
        </form>

        {message && (
          <p className="mb-4 whitespace-pre-line rounded bg-but-gray-light px-3 py-2 text-sm text-but-dark">
            {message}
          </p>
        )}

        {state.status === "loading" && <p>Recherche en cours...</p>}

        {state.status === "error" && (
          <p className="text-but-red-dark">Erreur : {state.message}</p>
        )}

        {state.status === "not-found" && (
          <div className="rounded-lg border-2 border-but-red bg-red-50 p-6">
            <p className="mb-4 text-lg font-bold text-but-red-dark">
              ⚠ Produit non trouvé dans la base — ajoute-le ci-dessous
            </p>
            <form onSubmit={handleCreateProduct} className="grid gap-3 sm:grid-cols-2">
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du produit"
                className="rounded border border-gray-300 px-3 py-2 sm:col-span-2"
              />
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="rounded border border-gray-300 px-3 py-2 sm:col-span-2"
              >
                <option value="">Catégorie (facultatif)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                value={newPoidsColis}
                onChange={(e) => setNewPoidsColis(e.target.value)}
                placeholder="Poids d'un colis (kg)"
                type="number"
                step="0.1"
                className="rounded border border-gray-300 px-3 py-2"
              />
              <div />
              <input
                value={newColisEur}
                onChange={(e) => setNewColisEur(e.target.value)}
                placeholder="Colis / palette EUR"
                type="number"
                className="rounded border border-gray-300 px-3 py-2"
              />
              <input
                value={newColisCentrale}
                onChange={(e) => setNewColisCentrale(e.target.value)}
                placeholder="Colis / palette centrale"
                type="number"
                className="rounded border border-gray-300 px-3 py-2"
              />
              <p className="text-xs text-but-gray sm:col-span-2">
                Le poids et le nombre de colis par palette sont facultatifs mais
                permettent au site de calculer le poids des palettes et
                d&apos;alerter en cas de dépassement de capacité d&apos;une alvéole.
              </p>
              <button
                type="submit"
                className="rounded bg-but-dark px-4 py-2 font-semibold text-white sm:col-span-2"
              >
                Créer la fiche produit
              </button>
            </form>
          </div>
        )}

        {state.status === "found" && (
          <div className="mb-8 overflow-hidden rounded-lg border-4 border-but-dark">
            <div className="bg-but-gray-light px-6 py-6 text-center text-3xl font-bold text-but-dark">
              {state.product.name}
            </div>
            <div className="grid grid-cols-[2fr_1fr]">
              <div className="flex items-center justify-center py-10 text-8xl font-bold text-but-dark">
                {state.product.ean.slice(-5)}
              </div>
              <div className="border-l-4 border-but-dark">
                <div className="bg-but-dark px-4 py-3 text-center font-bold text-white">
                  EMPLACEMENT(S)
                </div>
                <div className="flex flex-col items-center justify-center gap-1 py-6 text-xl font-bold">
                  {state.locations.length === 0 && <span>—</span>}
                  {state.locations.map((l) => (
                    <span key={l.id}>
                      {l.alveole.code} ({l.colis} colis)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <h3 className="mb-3 font-bold text-but-dark">
                Ranger une réception
              </h3>
              <form onSubmit={handleRangement} className="flex flex-col gap-4">
                <label className="flex items-center gap-2 text-sm">
                  Nombre de palettes à ranger
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={palettes.length}
                    onChange={(e) => setNombrePalettes(Number(e.target.value) || 1)}
                    className="w-20 rounded border border-gray-300 px-2 py-1"
                  />
                </label>

                {palettes.map((p, i) => (
                  <div key={i} className="rounded border border-gray-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-but-dark">
                        Palette {i + 1}
                      </span>
                      <select
                        value={p.typePalette}
                        onChange={(e) =>
                          updatePalette(i, { typePalette: e.target.value as TypePalette, choix: null })
                        }
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      >
                        {PALETTE_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {PALETTE_TYPES[t].label} ({PALETTE_TYPES[t].dimensions})
                          </option>
                        ))}
                      </select>
                    </div>

                    <AlveoleSelector
                      alveoles={allAlveoles}
                      zones={allZones}
                      typePalette={p.typePalette}
                      poidsPaletteKg={
                        state.product.poids_colis_kg != null
                          ? (p.typePalette === "centrale"
                              ? state.product.colis_par_palette_centrale
                              : state.product.colis_par_palette_eur) != null
                            ? state.product.poids_colis_kg *
                              (p.typePalette === "centrale"
                                ? state.product.colis_par_palette_centrale!
                                : state.product.colis_par_palette_eur!)
                            : null
                          : null
                      }
                      suggestedZoneIds={suggestedZoneIds}
                      currentAlveoleIds={currentAlveoleIds}
                      value={p.choix}
                      onChange={(choix) => updatePalette(i, { choix })}
                    />

                    {((p.typePalette === "centrale" && state.product.colis_par_palette_centrale == null) ||
                      (p.typePalette === "eur" && state.product.colis_par_palette_eur == null)) && (
                      <input
                        type="number"
                        value={p.colisOverride}
                        onChange={(e) => updatePalette(i, { colisOverride: e.target.value })}
                        placeholder="Nombre de colis sur cette palette (non configuré sur la fiche produit)"
                        className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    )}
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={rangementEnCours}
                    className="rounded bg-but-red px-4 py-2 text-sm font-semibold text-white hover:bg-but-red-dark disabled:opacity-50"
                  >
                    {rangementEnCours ? "Enregistrement..." : "Ranger et imprimer la ou les fiches"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <h2 className="mb-3 mt-8 text-lg font-bold text-but-dark">
          Plan de l&apos;entrepôt
        </h2>
        <p className="mb-3 text-xs text-but-gray">
          En rouge plein : le produit y est déjà stocké. En rouge clair :
          zone suggérée pour sa catégorie.
        </p>
        <WarehouseMap
          zones={allZones}
          highlightedZoneIds={highlightedZoneIds}
          suggestedZoneIds={suggestedZoneIds}
        />
      </div>

      {printData && <PrintableFiches product={printData.product} resultats={printData.resultats} />}
    </>
  );
}
