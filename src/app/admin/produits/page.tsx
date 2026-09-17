"use client";

import { useEffect, useState } from "react";
import type { Category, Product, ProductLocation } from "@/lib/types";
import { PALETTE_TYPES, PALETTE_TYPE_OPTIONS } from "@/lib/palettes";
import BarcodeSvg from "@/components/BarcodeSvg";
import QrCodeSvg from "@/components/QrCodeSvg";
import { contenuQrAlveole } from "@/lib/qr";
import Button from "@/components/ui/Button";
import { IconSearch } from "@/components/icons";

export default function ProduitsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [prefixeQr, setPrefixeQr] = useState("");

  // Ajout rapide d'un produit (EAN, nom, poids, palette conseillée).
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nouvelEan, setNouvelEan] = useState("");
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauPoids, setNouveauPoids] = useState("");
  const [nouvellePalette, setNouvellePalette] = useState("");
  const [ajoutErreur, setAjoutErreur] = useState<string | null>(null);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  // Codes-barres/QR par produit (repliés par défaut, chargés à la demande).
  const [codesOuverts, setCodesOuverts] = useState<Set<string>>(new Set());
  const [locationsParProduit, setLocationsParProduit] = useState<
    Record<string, ProductLocation[]>
  >({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [prodRes, catRes, paramRes] = await Promise.all([
      fetch("/api/produits"),
      fetch("/api/categories"),
      fetch("/api/parametres"),
    ]);
    const prodJson = await prodRes.json();
    const catJson = await catRes.json();
    const paramJson = await paramRes.json();
    if (prodRes.ok) setProducts(prodJson.products);
    if (catRes.ok) setCategories(catJson.categories);
    if (paramRes.ok) setPrefixeQr(paramJson.parametres.qr_prefixe_alveole ?? "");
  }

  async function handleUpdate(p: Product, updates: Record<string, unknown>) {
    const res = await fetch(`/api/produits/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) load();
  }

  async function ajouterProduit(e: React.FormEvent) {
    e.preventDefault();
    setAjoutErreur(null);
    if (!nouvelEan.trim() || !nouveauNom.trim()) {
      setAjoutErreur("Code EAN et nom sont obligatoires.");
      return;
    }
    setAjoutEnCours(true);
    try {
      const res = await fetch("/api/produits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ean: nouvelEan.trim(),
          name: nouveauNom.trim(),
          poidsColisKg: nouveauPoids,
          paletteConseillee: nouvellePalette || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAjoutErreur(json.error || "Erreur lors de l'ajout.");
        return;
      }
      setNouvelEan("");
      setNouveauNom("");
      setNouveauPoids("");
      setNouvellePalette("");
      setAjoutOuvert(false);
      load();
    } finally {
      setAjoutEnCours(false);
    }
  }

  async function toggleCodes(p: Product) {
    setCodesOuverts((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    if (!locationsParProduit[p.id]) {
      const res = await fetch(`/api/produits/recherche?ean=${encodeURIComponent(p.ean)}`);
      const json = await res.json();
      if (res.ok && json.found === true) {
        setLocationsParProduit((prev) => ({ ...prev, [p.id]: json.locations ?? [] }));
      }
    }
  }

  // "%42569" (comme sur /recherche et le journal) cherche par la fin du
  // code EAN ; un texte normal cherche dans le nom OU l'EAN, n'importe où.
  const motif = search.trim().startsWith("%") ? search.trim().slice(1) : search.trim();
  const filtered = products.filter(
    (p) =>
      !motif ||
      p.name.toLowerCase().includes(motif.toLowerCase()) ||
      p.ean.includes(motif)
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Produits</h1>
      <p className="mb-6 text-sm text-but-gray">
        Renseigne la catégorie et le poids de chaque produit pour que le site
        puisse suggérer les bonnes zones et calculer le poids des palettes.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-but-gray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou EAN... (ex: %42569 pour les 5 derniers chiffres)"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-but-red focus:outline-none"
          />
        </div>
        <Button type="button" onClick={() => setAjoutOuvert((v) => !v)}>
          {ajoutOuvert ? "Annuler" : "+ Ajouter un produit"}
        </Button>
      </div>

      {ajoutOuvert && (
        <form
          onSubmit={ajouterProduit}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-card animate-fade-in"
        >
          <label className="flex flex-col text-xs font-semibold text-but-gray">
            Code EAN
            <input
              value={nouvelEan}
              onChange={(e) => setNouvelEan(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
              required
            />
          </label>
          <label className="flex flex-1 min-w-[12rem] flex-col text-xs font-semibold text-but-gray">
            Nom
            <input
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
              required
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-but-gray">
            Poids/colis (kg)
            <input
              type="number"
              step="0.1"
              value={nouveauPoids}
              onChange={(e) => setNouveauPoids(e.target.value)}
              className="mt-1 w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-but-gray">
            Palette conseillée
            <select
              value={nouvellePalette}
              onChange={(e) => setNouvellePalette(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
            >
              <option value="">—</option>
              {PALETTE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {PALETTE_TYPES[t].label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" loading={ajoutEnCours}>
            Créer
          </Button>
          {ajoutErreur && <p className="w-full text-sm text-but-red-dark">{ajoutErreur}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="bg-but-gray-light text-left">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">EAN</th>
              <th className="min-w-[14rem] px-3 py-2">Nom</th>
              <th className="min-w-[9rem] px-3 py-2">Catégorie</th>
              <th className="whitespace-nowrap px-3 py-2">Poids/colis (kg)</th>
              <th className="whitespace-nowrap px-3 py-2">Colis/palette EUR</th>
              <th className="whitespace-nowrap px-3 py-2">Colis/palette centrale</th>
              <th className="min-w-[11rem] px-3 py-2">Palette conseillée</th>
              <th className="whitespace-nowrap px-3 py-2">Plusieurs colis</th>
              <th className="whitespace-nowrap px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <>
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{p.ean}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">
                    <select
                      defaultValue={p.category_id ?? ""}
                      onChange={(e) => handleUpdate(p, { category_id: e.target.value || null })}
                      className="w-full rounded border border-gray-200 px-2 py-1"
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={p.poids_colis_kg ?? ""}
                      onBlur={(e) => handleUpdate(p, { poids_colis_kg: e.target.value })}
                      className="w-20 rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      defaultValue={p.colis_par_palette_eur ?? ""}
                      onBlur={(e) => handleUpdate(p, { colis_par_palette_eur: e.target.value })}
                      className="w-20 rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      defaultValue={p.colis_par_palette_centrale ?? ""}
                      onBlur={(e) => handleUpdate(p, { colis_par_palette_centrale: e.target.value })}
                      className="w-20 rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      defaultValue={p.palette_conseillee ?? ""}
                      onChange={(e) => handleUpdate(p, { palette_conseillee: e.target.value || null })}
                      className="w-full rounded border border-gray-200 px-2 py-1"
                    >
                      <option value="">—</option>
                      {PALETTE_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {PALETTE_TYPES[t].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={p.colis_multiples}
                        onChange={(e) => handleUpdate(p, { colis_multiples: e.target.checked })}
                        className="h-4 w-4"
                        title="Ce meuble est livré en plusieurs colis sous le même EAN-13"
                      />
                      {p.colis_multiples && (
                        <input
                          type="number"
                          min="1"
                          placeholder="nb"
                          defaultValue={p.nb_colis_par_meuble ?? ""}
                          onBlur={(e) => handleUpdate(p, { nb_colis_par_meuble: e.target.value })}
                          className="w-14 rounded border border-gray-200 px-1.5 py-1"
                        />
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      onClick={() => toggleCodes(p)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-but-dark hover:border-but-red hover:text-but-red"
                    >
                      {codesOuverts.has(p.id) ? "Masquer les codes" : "Voir les codes"}
                    </button>
                  </td>
                </tr>
                {codesOuverts.has(p.id) && (
                  <tr className="border-t border-gray-100 bg-but-gray-light/50">
                    <td colSpan={9} className="px-3 py-4">
                      <div className="flex flex-wrap gap-8">
                        <div>
                          <p className="mb-1 text-xs font-semibold text-but-gray">
                            Code-barres produit ({p.ean})
                          </p>
                          <BarcodeSvg value={p.ean} height={50} />
                        </div>
                        {(locationsParProduit[p.id] ?? [])
                          .filter((l) => l.colis > 0)
                          .map((l) => (
                            <div key={l.id}>
                              <p className="mb-1 text-xs font-semibold text-but-gray">
                                QR code alvéole ({l.alveole.code}) — {l.colis} colis
                              </p>
                              <QrCodeSvg value={contenuQrAlveole(l.alveole.code, prefixeQr)} size={110} />
                            </div>
                          ))}
                        {locationsParProduit[p.id] && locationsParProduit[p.id].filter((l) => l.colis > 0).length === 0 && (
                          <p className="self-center text-xs text-but-gray">
                            Pas encore rangé — aucune alvéole à afficher.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
