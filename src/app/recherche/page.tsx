"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import WarehouseMap from "@/components/WarehouseMap";
import PrintableFiche from "@/components/PrintableFiche";
import type { Product, Zone } from "@/lib/types";

// NOTE: Header est un Server Component (async) ; comme cette page est un
// Client Component, on ne peut pas l'importer directement ici. Voir
// src/app/recherche/layout.tsx qui affiche le Header autour de cette page.

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; product: Product; locations: Zone[] }
  | { status: "not-found" }
  | { status: "error"; message: string };

export default function RecherchePage() {
  const [ean, setEan] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [allZones, setAllZones] = useState<Zone[]>([]);

  // Nouveau produit
  const [newName, setNewName] = useState("");
  const [newZone, setNewZone] = useState("");

  // Ajout d'un emplacement à un produit existant
  const [extraZone, setExtraZone] = useState("");

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshZones();
  }, []);

  async function refreshZones() {
    const res = await fetch("/api/zones");
    const json = await res.json();
    if (res.ok) setAllZones(json.zones);
  }

  async function search(eanToSearch: string) {
    const value = eanToSearch.trim();
    if (!value) return;
    setState({ status: "loading" });
    setMessage(null);
    setNewName("");
    setNewZone("");
    setExtraZone("");

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
    setState({ status: "found", product: json.product, locations: json.locations });
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/produits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ean, name: newName, zoneCode: newZone }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Erreur lors de la création.");
      return;
    }
    setMessage(`Produit ajouté : ${json.product.name} (${json.zone.code}).`);
    await refreshZones();
    await search(ean);
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (state.status !== "found") return;
    const res = await fetch("/api/emplacements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: state.product.id, zoneCode: extraZone }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Erreur lors de l'ajout.");
      return;
    }
    setMessage(`Emplacement ${json.zone.code} ajouté.`);
    setExtraZone("");
    await refreshZones();
    await search(ean);
  }

  const highlightedZoneIds =
    state.status === "found" ? state.locations.map((z) => z.id) : [];

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-8 print:hidden">
        <h1 className="mb-1 text-2xl font-bold text-but-dark">
          Recherche marchandise
        </h1>
        <p className="mb-6 text-sm text-but-gray">
          Entre le code EAN de la commande pour retrouver le produit et son
          emplacement.
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
          <p className="mb-4 rounded bg-but-gray-light px-3 py-2 text-sm text-but-dark">
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
            <form onSubmit={handleCreateProduct} className="grid gap-3 sm:grid-cols-3">
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du produit"
                className="rounded border border-gray-300 px-3 py-2 sm:col-span-2"
              />
              <input
                required
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                placeholder="Emplacement (ex: A12)"
                className="rounded border border-gray-300 px-3 py-2"
              />
              <button
                type="submit"
                className="rounded bg-but-dark px-4 py-2 font-semibold text-white sm:col-span-3"
              >
                Ajouter le produit
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
                  EMPLACEMENT
                </div>
                <div className="flex flex-col items-center justify-center gap-1 py-6 text-2xl font-bold">
                  {state.locations.length === 0 && <span>—</span>}
                  {state.locations.map((z) => (
                    <span key={z.id}>{z.code}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <form onSubmit={handleAddLocation} className="flex flex-1 gap-2">
                <input
                  value={extraZone}
                  onChange={(e) => setExtraZone(e.target.value)}
                  placeholder="Ajouter un autre emplacement (ex: B03)"
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded border border-but-dark px-3 py-2 text-sm font-semibold text-but-dark hover:bg-but-gray-light"
                >
                  Ajouter
                </button>
              </form>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded bg-but-red px-4 py-2 text-sm font-semibold text-white hover:bg-but-red-dark"
              >
                🖨️ Imprimer / PDF
              </button>
            </div>
          </div>
        )}

        <h2 className="mb-3 mt-8 text-lg font-bold text-but-dark">
          Plan de l&apos;entrepôt
        </h2>
        <WarehouseMap zones={allZones} highlightedZoneIds={highlightedZoneIds} />
      </div>

      {state.status === "found" && (
        <PrintableFiche product={state.product} locations={state.locations} />
      )}
    </>
  );
}
