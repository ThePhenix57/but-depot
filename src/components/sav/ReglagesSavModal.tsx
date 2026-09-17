"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { IconClose, IconPlus, IconTrash } from "@/components/icons";
import type { SavChampPerso, SavColonne } from "@/lib/types";

interface Props {
  colonnes: SavColonne[];
  champs: SavChampPerso[];
  onClose: () => void;
  onChange: () => void;
}

// Réglages du tableau SAV (admin/dev uniquement) : colonnes du tableau et
// champs personnalisés du formulaire de ticket, ajoutés/renommés/
// supprimés ici. Les tickets existants ne sont jamais touchés
// automatiquement (une colonne avec des tickets dedans ne peut pas être
// supprimée — voir l'API).
export default function ReglagesSavModal({ colonnes, champs, onClose, onChange }: Props) {
  const [nouvelleColonne, setNouvelleColonne] = useState("");
  const [nouveauChampLabel, setNouveauChampLabel] = useState("");
  const [nouveauChampType, setNouveauChampType] = useState<"checkbox" | "texte">("checkbox");
  const [nouveauChampCategorie, setNouveauChampCategorie] = useState<"" | "meuble" | "electromenager">("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouterColonne(e: React.FormEvent) {
    e.preventDefault();
    if (!nouvelleColonne.trim()) return;
    const res = await fetch("/api/sav/colonnes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nouvelleColonne.trim() }),
    });
    if (res.ok) {
      setNouvelleColonne("");
      onChange();
    }
  }

  async function renommerColonne(id: string, nom: string) {
    if (!nom.trim()) return;
    await fetch(`/api/sav/colonnes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nom.trim() }),
    });
    onChange();
  }

  async function deplacerColonne(index: number, sens: -1 | 1) {
    const cible = colonnes[index + sens];
    if (!cible) return;
    const courante = colonnes[index];
    await Promise.all([
      fetch(`/api/sav/colonnes/${courante.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordre: cible.ordre }),
      }),
      fetch(`/api/sav/colonnes/${cible.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordre: courante.ordre }),
      }),
    ]);
    onChange();
  }

  async function supprimerColonne(id: string) {
    if (!confirm("Supprimer cette colonne ? (impossible si elle contient encore des tickets)")) return;
    setErreur(null);
    const res = await fetch(`/api/sav/colonnes/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setErreur(json.error || "Erreur lors de la suppression.");
      return;
    }
    onChange();
  }

  async function ajouterChamp(e: React.FormEvent) {
    e.preventDefault();
    if (!nouveauChampLabel.trim()) return;
    const res = await fetch("/api/sav/champs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: nouveauChampLabel.trim(),
        type: nouveauChampType,
        categorie: nouveauChampCategorie || null,
      }),
    });
    if (res.ok) {
      setNouveauChampLabel("");
      setNouveauChampType("checkbox");
      setNouveauChampCategorie("");
      onChange();
    }
  }

  async function supprimerChamp(id: string) {
    if (!confirm("Supprimer ce champ ? Il disparaîtra aussi des tickets existants.")) return;
    await fetch(`/api/sav/champs/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-but-dark">Réglages du tableau SAV</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-but-gray hover:bg-but-gray-light">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-4">
          {erreur && <p className="rounded-lg bg-but-red-light px-3 py-2 text-sm text-but-red-dark">{erreur}</p>}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-but-gray">
              Colonnes du tableau
            </p>
            <div className="space-y-1.5">
              {colonnes.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  <input
                    defaultValue={c.nom}
                    onBlur={(e) => e.target.value !== c.nom && renommerColonne(c.id, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-but-dark"
                  />
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => deplacerColonne(i, -1)}
                    className="rounded border border-gray-200 px-2 py-1 text-xs text-but-dark disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === colonnes.length - 1}
                    onClick={() => deplacerColonne(i, 1)}
                    className="rounded border border-gray-200 px-2 py-1 text-xs text-but-dark disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimerColonne(c.id)}
                    className="rounded p-1.5 text-but-red hover:bg-but-red-light"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={ajouterColonne} className="mt-2 flex gap-2">
              <input
                value={nouvelleColonne}
                onChange={(e) => setNouvelleColonne(e.target.value)}
                placeholder="Nom de la nouvelle colonne"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-but-dark"
              />
              <Button type="submit" size="sm" variant="outline">
                <IconPlus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </form>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-but-gray">
              Champs personnalisés du formulaire de ticket
            </p>
            <div className="space-y-1.5">
              {champs.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-but-gray-light px-3 py-1.5 text-sm">
                  <span className="text-but-dark">
                    {c.label}{" "}
                    <span className="text-xs text-but-gray">
                      ({c.type === "checkbox" ? "case à cocher" : "texte"} —{" "}
                      {c.categorie === "meuble" ? "meuble" : c.categorie === "electromenager" ? "électroménager" : "tous types"})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => supprimerChamp(c.id)}
                    className="rounded p-1 text-but-red hover:bg-but-red-light"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={ajouterChamp} className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={nouveauChampLabel}
                onChange={(e) => setNouveauChampLabel(e.target.value)}
                placeholder="Libellé du champ"
                className="col-span-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-but-dark"
              />
              <select
                value={nouveauChampType}
                onChange={(e) => setNouveauChampType(e.target.value as "checkbox" | "texte")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-but-dark"
              >
                <option value="checkbox">Case à cocher</option>
                <option value="texte">Texte libre</option>
              </select>
              <select
                value={nouveauChampCategorie}
                onChange={(e) => setNouveauChampCategorie(e.target.value as "" | "meuble" | "electromenager")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-but-dark"
              >
                <option value="">Tous types de produit</option>
                <option value="meuble">Meuble seulement</option>
                <option value="electromenager">Électroménager seulement</option>
              </select>
              <Button type="submit" size="sm" variant="outline" className="col-span-2">
                <IconPlus className="h-3.5 w-3.5" />
                Ajouter le champ
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
