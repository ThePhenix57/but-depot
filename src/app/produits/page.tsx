"use client";

import { useEffect, useState } from "react";
import type { Product, ProductLocation } from "@/lib/types";
import BarcodeSvg from "@/components/BarcodeSvg";
import QrCodeSvg from "@/components/QrCodeSvg";
import { contenuQrAlveole } from "@/lib/qr";
import Card from "@/components/ui/Card";
import { IconSearch, IconChevronDown } from "@/components/icons";

// Version "consultation" de /admin/produits, accessible à tout le monde
// (employé, dev, admin) : recherche un produit et affiche son code-barres
// EAN ainsi que le(s) QR code(s) des alvéoles où il est rangé. Pas d'ajout
// ni de modification de produit ici — ça reste réservé à l'admin via
// /admin/produits.
export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [prefixeQr, setPrefixeQr] = useState("");

  const [codesOuverts, setCodesOuverts] = useState<Set<string>>(new Set());
  const [locationsParProduit, setLocationsParProduit] = useState<
    Record<string, ProductLocation[]>
  >({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [prodRes, paramRes] = await Promise.all([
      fetch("/api/produits"),
      fetch("/api/parametres"),
    ]);
    const prodJson = await prodRes.json();
    const paramJson = await paramRes.json();
    if (prodRes.ok) setProducts(prodJson.products);
    if (paramRes.ok) setPrefixeQr(paramJson.parametres.qr_prefixe_alveole ?? "");
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Produits</h1>
      <p className="mb-6 text-sm text-but-gray">
        Cherche un produit pour retrouver son code-barres et le(s) QR code(s)
        des alvéoles où il est rangé.
      </p>

      <div className="relative mb-4">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-but-gray" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou EAN... (ex: %42569 pour les 5 derniers chiffres)"
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-but-red focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <Card key={p.id} noPadding>
            <button
              type="button"
              onClick={() => toggleCodes(p)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-but-dark">{p.name}</span>
                <span className="block font-mono text-xs text-but-gray">{p.ean}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-but-gray">
                {codesOuverts.has(p.id) ? "Masquer les codes" : "Voir les codes"}
                <IconChevronDown
                  className={`h-3.5 w-3.5 transition ${codesOuverts.has(p.id) ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {codesOuverts.has(p.id) && (
              <div className="animate-fade-in border-t border-gray-100 bg-but-gray-light/50 px-4 py-4">
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
                  {locationsParProduit[p.id] &&
                    locationsParProduit[p.id].filter((l) => l.colis > 0).length === 0 && (
                      <p className="self-center text-xs text-but-gray">
                        Pas encore rangé — aucune alvéole à afficher.
                      </p>
                    )}
                </div>
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-but-gray">Aucun produit ne correspond à la recherche.</p>
        )}
      </div>
    </div>
  );
}
