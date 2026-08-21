"use client";

import { useEffect, useState } from "react";
import type { Category, Product } from "@/lib/types";

export default function ProduitsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [prodRes, catRes] = await Promise.all([fetch("/api/produits"), fetch("/api/categories")]);
    const prodJson = await prodRes.json();
    const catJson = await catRes.json();
    if (prodRes.ok) setProducts(prodJson.products);
    if (catRes.ok) setCategories(catJson.categories);
  }

  async function handleUpdate(p: Product, updates: Record<string, unknown>) {
    const res = await fetch(`/api/produits/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) load();
  }

  const filtered = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ean.includes(search)
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-but-dark">Produits</h1>
      <p className="mb-6 text-sm text-but-gray">
        Renseigne la catégorie et le poids de chaque produit pour que le site
        puisse suggérer les bonnes zones et calculer le poids des palettes.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou EAN..."
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-but-gray-light text-left">
            <tr>
              <th className="px-3 py-2">EAN</th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Poids/colis (kg)</th>
              <th className="px-3 py-2">Colis/palette EUR</th>
              <th className="px-3 py-2">Colis/palette centrale</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-mono text-xs">{p.ean}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={p.category_id ?? ""}
                    onChange={(e) => handleUpdate(p, { category_id: e.target.value || null })}
                    className="rounded border border-gray-200 px-2 py-1"
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
