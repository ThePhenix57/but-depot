"use client";

import { useEffect, useState } from "react";
import type { Category, Zone } from "@/lib/types";
import Button from "@/components/ui/Button";

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  // Le rôle "dev" peut créer une catégorie mais pas la supprimer.
  const [role, setRole] = useState<string | null>(null);
  const peutSupprimer = role === "admin";

  useEffect(() => {
    load();
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => json.role && setRole(json.role));
  }, []);

  async function load() {
    const [catRes, zoneRes] = await Promise.all([fetch("/api/categories"), fetch("/api/zones")]);
    const catJson = await catRes.json();
    const zoneJson = await zoneRes.json();
    if (catRes.ok) setCategories(catJson.categories);
    if (zoneRes.ok) setZones(zoneJson.zones);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, zone_ids: zoneIds }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    setMessage(`Catégorie "${json.category.name}" créée.`);
    setName("");
    setZoneIds([]);
    load();
  }

  async function toggleZone(category: Category, zoneId: string) {
    const current = category.zone_ids ?? [];
    const next = current.includes(zoneId)
      ? current.filter((z) => z !== zoneId)
      : [...current, zoneId];
    const res = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zone_ids: next }),
    });
    if (res.ok) load();
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return;
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Catégories</h1>
      <p className="mb-6 text-sm text-but-gray">
        Associe chaque catégorie de produit aux zones où elle doit être
        rangée (ex: &quot;Literie&quot; → zones F, G, H). Le site suggère
        automatiquement ces zones à l&apos;employé qui range un produit de
        cette catégorie.
      </p>

      {message && (
        <p className="mb-4 rounded-xl bg-but-gray-light px-3 py-2 text-sm text-but-dark">{message}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-card"
      >
        <div className="mb-3 flex gap-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la catégorie (ex: Literie)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-but-red focus:outline-none"
          />
          <Button type="submit">Créer</Button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {zones.map((z) => (
            <label key={z.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={zoneIds.includes(z.id)}
                onChange={(e) =>
                  setZoneIds((prev) =>
                    e.target.checked ? [...prev, z.id] : prev.filter((id) => id !== z.id)
                  )
                }
              />
              {z.label || z.code}
            </label>
          ))}
        </div>
      </form>

      <div className="flex flex-col gap-4">
        {categories.map((c) => (
          <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-but-dark">{c.name}</span>
              {peutSupprimer && (
                <Button size="sm" variant="danger" onClick={() => handleDelete(c)}>
                  Supprimer
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {zones.map((z) => (
                <label key={z.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={(c.zone_ids ?? []).includes(z.id)}
                    disabled={!peutSupprimer}
                    onChange={() => toggleZone(c, z.id)}
                  />
                  {z.label || z.code}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
