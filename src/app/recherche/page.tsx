"use client";

import { useEffect, useState } from "react";
import WarehouseMap from "@/components/WarehouseMap";
import PrintableFiches from "@/components/PrintableFiches";
import FicheNonTrouve from "@/components/FicheNonTrouve";
import AlveoleSelector, { type AlveoleChoix } from "@/components/AlveoleSelector";
import SignalerAlveole from "@/components/SignalerAlveole";
import RackPlan from "@/components/RackPlan";
import ZoneApercu from "@/components/ZoneApercu";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { IconPrinter, IconSearch, IconAlertTriangle, IconMap } from "@/components/icons";
import { PALETTE_TYPE_OPTIONS, PALETTE_TYPES, type TypePalette } from "@/lib/palettes";
import { parseAlveoleCode, claveTravee } from "@/lib/alveoleCode";
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
  | {
      status: "found";
      product: Product;
      locations: ProductLocation[];
      suggestedZoneIds: string[];
      numeroColisScanne: string | null;
    }
  | { status: "multiple"; options: Product[] }
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
  const [newColisMultiples, setNewColisMultiples] = useState(false);
  const [newNbColisParMeuble, setNewNbColisParMeuble] = useState("");

  // Rangement (palettes à placer)
  const [palettes, setPalettes] = useState<PaletteRow[]>([nouvellePalette()]);
  const [rangementEnCours, setRangementEnCours] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [apercuZone, setApercuZone] = useState<Zone | null>(null);
  const [printData, setPrintData] = useState<{ product: Product; resultats: RangementResultat[] } | null>(null);
  const [printEanNonTrouve, setPrintEanNonTrouve] = useState<string | null>(null);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (printData || printEanNonTrouve) {
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [printData, printEanNonTrouve]);

  function handleImprimerNonTrouve() {
    if (!ean.trim()) return;
    setPrintData(null);
    setPrintEanNonTrouve(ean.trim());
  }

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
    setPrintEanNonTrouve(null);
    setNewName("");
    setNewCategoryId("");
    setNewPoidsColis("");
    setNewColisEur("");
    setNewColisCentrale("");
    setNewColisMultiples(false);
    setNewNbColisParMeuble("");
    setPalettes([nouvellePalette()]);

    const res = await fetch(`/api/produits/recherche?ean=${encodeURIComponent(value)}`);
    const json = await res.json();

    if (!res.ok) {
      setState({ status: "error", message: json.error || "Erreur inconnue" });
      return;
    }
    if (json.found === "multiple") {
      setState({ status: "multiple", options: json.options });
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
      numeroColisScanne: json.numeroColisScanne ?? null,
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
        colisMultiples: newColisMultiples,
        nbColisParMeuble: newColisMultiples ? newNbColisParMeuble || null : null,
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
    setRangementEnCours(false);

    let json: { error?: string; resultats?: RangementResultat[] };
    try {
      json = await res.json();
    } catch {
      setMessage(
        `Erreur inattendue du serveur (code ${res.status}) — réessaie, et si ça continue, note ce code pour le signaler.`
      );
      return;
    }

    if (!res.ok) {
      setMessage(json.error || "Erreur lors du rangement.");
      return;
    }

    const resultats = json.resultats ?? [];
    const depassements = resultats.filter((r) => r.depassement);
    await refreshAll();
    await search(ean);
    setPrintData({ product: state.product, resultats });
    setMessage(
      `${resultats.length} palette(s) rangée(s).` +
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

  // Regroupe les emplacements du produit par travée (même allée + même
  // numéro de rack) pour afficher un petit schéma de chaque rack concerné,
  // avec la ou les bonnes cases mises en évidence — le "chemin" une fois
  // arrivé dans la bonne allée.
  const travees: { titre: string; alveoles: AlveoleWithOccupancy[]; cibles: string[] }[] = [];
  if (state.status === "found") {
    const parCle = new Map<string, { zoneLabel: string; cibles: Set<string> }>();
    for (const l of state.locations) {
      const parts = parseAlveoleCode(l.alveole.code);
      if (!parts) continue;
      const cle = claveTravee(parts);
      const entry = parCle.get(cle) ?? {
        zoneLabel: l.alveole.zone.label || l.alveole.zone.code,
        cibles: new Set<string>(),
      };
      entry.cibles.add(l.alveole.code);
      parCle.set(cle, entry);
    }
    for (const [cle, { zoneLabel, cibles }] of parCle) {
      const alveolesTravee = allAlveoles.filter((a) => {
        const parts = parseAlveoleCode(a.code);
        return parts && claveTravee(parts) === cle;
      });
      travees.push({
        titre: `${zoneLabel} — travée ${cle}`,
        alveoles: alveolesTravee,
        cibles: [...cibles],
      });
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 print:hidden">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">
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
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-but-gray" />
            <input
              autoFocus
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              placeholder="Code EAN reçu..."
              className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 text-lg shadow-sm focus:border-but-red focus:outline-none"
            />
          </div>
          <Button type="submit" size="lg">
            Rechercher
          </Button>
        </form>

        {message && (
          <p className="mb-4 whitespace-pre-line rounded-xl bg-but-gray-light px-4 py-3 text-sm text-but-dark">
            {message}
          </p>
        )}

        {state.status === "loading" && (
          <div className="mb-4 flex items-center gap-2 text-sm text-but-gray">
            <Spinner className="h-4 w-4" />
            Recherche en cours...
          </div>
        )}

        {state.status === "error" && (
          <p className="mb-4 text-sm font-semibold text-but-red-dark">Erreur : {state.message}</p>
        )}

        {state.status === "multiple" && (
          <Card className="mb-6 animate-fade-in">
            <p className="mb-3 text-sm font-semibold text-but-dark">
              Plusieurs produits se terminent par ces chiffres — clique celui que tu cherches :
            </p>
            <div className="flex flex-col gap-2">
              {state.options.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setEan(p.ean);
                    search(p.ean);
                  }}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm transition hover:border-but-red hover:bg-but-red-light"
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="font-mono text-but-gray">{p.ean}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {state.status === "not-found" && (
          <Card className="mb-6 animate-fade-in border-but-red/30 bg-but-red-light">
            <p className="mb-4 flex items-center gap-2 text-lg font-bold text-but-red-dark">
              <IconAlertTriangle className="h-5 w-5 shrink-0" />
              Produit non trouvé dans la base — ajoute-le ci-dessous
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleImprimerNonTrouve}>
                <IconPrinter className="h-4 w-4" />
                Imprimer une fiche en attendant (EAN {ean.trim().slice(-5)}, emplacement à écrire à la main)
              </Button>
              <a
                href={`https://www.but.fr/search?text=${encodeURIComponent(ean.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-but-dark hover:border-but-red hover:text-but-red"
              >
                <IconSearch className="h-4 w-4" />
                Rechercher ce code sur but.fr
              </a>
            </div>
            <form onSubmit={handleCreateProduct} className="grid gap-3 sm:grid-cols-2">
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du produit"
                className="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2"
              />
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2"
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
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <div />
              <input
                value={newColisEur}
                onChange={(e) => setNewColisEur(e.target.value)}
                placeholder="Colis / palette EUR"
                type="number"
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                value={newColisCentrale}
                onChange={(e) => setNewColisCentrale(e.target.value)}
                placeholder="Colis / palette centrale"
                type="number"
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <p className="text-xs text-but-gray sm:col-span-2">
                Le poids et le nombre de colis par palette sont facultatifs mais
                permettent au site de calculer le poids des palettes et
                d&apos;alerter en cas de dépassement de capacité d&apos;une alvéole.
              </p>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={newColisMultiples}
                  onChange={(e) => setNewColisMultiples(e.target.checked)}
                  className="h-4 w-4"
                />
                Ce meuble est livré en plusieurs colis sous le même EAN-13
              </label>
              {newColisMultiples && (
                <input
                  value={newNbColisParMeuble}
                  onChange={(e) => setNewNbColisParMeuble(e.target.value)}
                  placeholder="Combien de colis par meuble ?"
                  type="number"
                  min="1"
                  className="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2"
                />
              )}
              <Button type="submit" variant="secondary" className="sm:col-span-2">
                Créer la fiche produit
              </Button>
            </form>
          </Card>
        )}

        {state.status === "found" && (
          <div className="mb-8 animate-fade-in overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="break-words bg-but-gray-light px-6 py-6 text-center text-xl font-bold text-but-dark sm:text-2xl lg:text-3xl">
              {state.product.name}
            </div>
            {(state.product.colis_multiples || state.numeroColisScanne) && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-200 bg-but-red-light px-4 py-2 text-center text-xs font-semibold text-but-red-dark">
                <span>
                  Meuble livré en plusieurs colis
                  {state.product.nb_colis_par_meuble ? ` (${state.product.nb_colis_par_meuble} colis)` : ""}
                </span>
                {state.numeroColisScanne && <span>— colis n°{state.numeroColisScanne} scanné</span>}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr]">
              <div className="flex items-center justify-center py-6 text-5xl font-bold text-but-dark sm:py-10 sm:text-6xl lg:text-8xl">
                {state.product.ean.slice(-5)}
              </div>
              <div className="border-t-4 border-but-dark sm:border-l-4 sm:border-t-0">
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

            {travees.length > 0 && (
              <div className="grid gap-3 border-t border-gray-200 bg-white px-6 py-4 sm:grid-cols-2">
                {travees.map((t) => (
                  <RackPlan key={t.titre} titre={t.titre} alveoles={t.alveoles} cibles={t.cibles} />
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <h3 className="mb-3 font-bold text-but-dark">
                Ranger une réception
              </h3>
              {state.product.palette_conseillee && (
                <p className="mb-3 rounded bg-but-gray-light px-3 py-2 text-sm text-but-dark">
                  Conseil : {PALETTE_TYPES[state.product.palette_conseillee].label} pour ce
                  produit.
                </p>
              )}
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
                  <div key={i} className="rounded-xl border border-gray-200 p-3">
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
                  <Button type="submit" loading={rangementEnCours}>
                    {rangementEnCours ? "Enregistrement..." : "Ranger et imprimer la ou les fiches"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mb-3 mt-8 flex items-center gap-2">
          <IconMap className="h-5 w-5 text-but-red" />
          <h2 className="text-lg font-bold text-but-dark">Plan de l&apos;entrepôt</h2>
        </div>
        <p className="mb-3 text-xs text-but-gray">
          En rouge plein : le produit y est déjà stocké. En rouge clair :
          zone suggérée pour sa catégorie. Clique une zone pour voir ce
          qu'il y a dedans.
        </p>
        <WarehouseMap
          zones={allZones}
          highlightedZoneIds={highlightedZoneIds}
          suggestedZoneIds={suggestedZoneIds}
          onZoneClick={(z) => setApercuZone(z)}
        />

        {apercuZone && (
          <ZoneApercu
            zone={apercuZone}
            alveoles={allAlveoles}
            onClose={() => setApercuZone(null)}
          />
        )}

        <div className="mt-6">
          <SignalerAlveole alveoles={allAlveoles} zones={allZones} onSignale={refreshAll} />
        </div>
      </div>

      {printData && <PrintableFiches product={printData.product} resultats={printData.resultats} />}
      {printEanNonTrouve && <FicheNonTrouve ean={printEanNonTrouve} />}
    </>
  );
}
