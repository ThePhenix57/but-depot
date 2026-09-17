"use client";

import { useEffect, useMemo, useState } from "react";
import type { Objectif, Profile } from "@/lib/types";
import {
  ajouterJours,
  formatDateISO,
  joursDeLaSemaine,
  lundiDeSemaine,
  nomJourLong,
} from "@/lib/semaine";
import { IconChevronDown, IconClose } from "@/components/icons";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

// Objectifs/tâches de la semaine : des objectifs globaux visibles par toute
// l'équipe, et des tâches assignées à un employé précis (pour toute la
// semaine, ou un jour donné). Affichés sur la page d'accueil. Réservé aux
// admins pour la création/suppression (voir policies RLS "objectifs_...").
export default function ObjectifsAdminPage() {
  const [lundi, setLundi] = useState(() => lundiDeSemaine(new Date()));
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [employes, setEmployes] = useState<Profile[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [texteGlobal, setTexteGlobal] = useState("");
  const [ajoutGlobalEnCours, setAjoutGlobalEnCours] = useState(false);

  // Modal d'ajout d'une tâche pour un employé (toute la semaine si date est
  // null, sinon un jour précis).
  const [modal, setModal] = useState<{ employeId: string; employeNom: string; date: string | null } | null>(
    null
  );
  const [modalTexte, setModalTexte] = useState("");
  const [modalEnCours, setModalEnCours] = useState(false);

  const jours = joursDeLaSemaine(lundi);
  const semaineDebut = formatDateISO(lundi);

  useEffect(() => {
    fetch("/api/employes")
      .then((res) => res.json())
      .then((json) => json.employes && setEmployes(json.employes));
  }, []);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semaineDebut]);

  async function charger() {
    setChargement(true);
    setErreur(null);
    const res = await fetch(`/api/objectifs?semaine=${semaineDebut}`);
    const json = await res.json();
    setChargement(false);
    if (!res.ok) {
      setErreur(json.error || "Erreur lors du chargement.");
      return;
    }
    setObjectifs(json.objectifs);
  }

  const objectifsGlobaux = useMemo(() => objectifs.filter((o) => !o.employe_id), [objectifs]);

  function tachesDe(employeId: string, date: string | null) {
    return objectifs.filter((o) => o.employe_id === employeId && o.date === date);
  }

  async function ajouterGlobal(e: React.FormEvent) {
    e.preventDefault();
    if (!texteGlobal.trim()) return;
    setAjoutGlobalEnCours(true);
    try {
      const res = await fetch("/api/objectifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semaineDebut, texte: texteGlobal.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error);
        return;
      }
      setTexteGlobal("");
      charger();
    } finally {
      setAjoutGlobalEnCours(false);
    }
  }

  async function ajouterTache(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || !modalTexte.trim()) return;
    setModalEnCours(true);
    try {
      const res = await fetch("/api/objectifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semaineDebut,
          employeId: modal.employeId,
          date: modal.date,
          texte: modalTexte.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error);
        return;
      }
      setModal(null);
      setModalTexte("");
      charger();
    } finally {
      setModalEnCours(false);
    }
  }

  async function supprimer(id: string) {
    const res = await fetch(`/api/objectifs/${id}`, { method: "DELETE" });
    if (res.ok) charger();
  }

  function nomEmploye(id: string) {
    const e = employes.find((e) => e.id === id);
    return e?.full_name || e?.email || "";
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Objectifs de la semaine</h1>
      <p className="mb-6 text-sm text-but-gray">
        Pose un objectif global pour toute l&apos;équipe, ou une tâche pour un
        employé précis — pour toute la semaine, ou un jour donné. Visible par
        tout le monde sur la page d&apos;accueil.
      </p>

      {erreur && (
        <p className="mb-4 rounded-xl border border-but-red/20 bg-but-red-light px-3 py-2 text-sm text-but-red-dark">
          {erreur}
        </p>
      )}

      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => setLundi(ajouterJours(lundi, -7))}
          className="rounded-lg border border-gray-300 p-2 text-but-dark transition hover:border-but-red hover:text-but-red"
          aria-label="Semaine précédente"
        >
          <IconChevronDown className="h-4 w-4 rotate-90" />
        </button>
        <span className="text-sm font-semibold text-but-dark">
          Semaine du {jours[0].toLocaleDateString("fr-FR")} au {jours[6].toLocaleDateString("fr-FR")}
        </span>
        <button
          onClick={() => setLundi(ajouterJours(lundi, 7))}
          className="rounded-lg border border-gray-300 p-2 text-but-dark transition hover:border-but-red hover:text-but-red"
          aria-label="Semaine suivante"
        >
          <IconChevronDown className="h-4 w-4 -rotate-90" />
        </button>
        <button
          onClick={() => setLundi(lundiDeSemaine(new Date()))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-but-dark transition hover:border-but-red hover:text-but-red"
        >
          Aujourd&apos;hui
        </button>
      </div>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 font-bold text-but-dark">Objectifs de la semaine (équipe)</h2>
        <ul className="mb-3 space-y-1">
          {objectifsGlobaux.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-but-gray-light px-3 py-2 text-sm text-but-dark"
            >
              <span>{o.texte}</span>
              <button
                onClick={() => supprimer(o.id)}
                className="shrink-0 text-xs font-semibold text-but-red hover:underline"
              >
                Supprimer
              </button>
            </li>
          ))}
          {objectifsGlobaux.length === 0 && (
            <li className="text-sm text-but-gray">Aucun objectif d&apos;équipe pour cette semaine.</li>
          )}
        </ul>
        <form onSubmit={ajouterGlobal} className="flex gap-2">
          <input
            value={texteGlobal}
            onChange={(e) => setTexteGlobal(e.target.value)}
            placeholder="ex: Finir l'inventaire de la zone B avant vendredi"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
          />
          <Button type="submit" disabled={ajoutGlobalEnCours || !texteGlobal.trim()}>
            Ajouter
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-but-dark">Tâches par employé</h2>
        {chargement && (
          <div className="mb-3 flex items-center gap-2 text-sm text-but-gray">
            <Spinner className="h-4 w-4" />
            Chargement...
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[72rem] text-sm">
            <thead className="bg-but-gray-light text-left">
              <tr>
                <th className="min-w-[10rem] px-3 py-2">Employé</th>
                <th className="min-w-[9rem] px-2 py-2">Toute la semaine</th>
                {jours.map((j) => (
                  <th key={j.toISOString()} className="min-w-[8rem] px-2 py-2 text-center">
                    {nomJourLong(j)}
                    <br />
                    <span className="font-normal text-but-gray">
                      {j.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employes.map((emp) => (
                <tr key={emp.id} className="border-t border-gray-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">
                    {emp.full_name || emp.email}
                  </td>
                  <td className="px-2 py-2">
                    <CelluleTaches
                      taches={tachesDe(emp.id, null)}
                      onAjouter={() =>
                        setModal({ employeId: emp.id, employeNom: nomEmploye(emp.id), date: null })
                      }
                      onSupprimer={supprimer}
                    />
                  </td>
                  {jours.map((j) => {
                    const date = formatDateISO(j);
                    return (
                      <td key={date} className="px-2 py-2">
                        <CelluleTaches
                          taches={tachesDe(emp.id, date)}
                          onAjouter={() =>
                            setModal({ employeId: emp.id, employeNom: nomEmploye(emp.id), date })
                          }
                          onSupprimer={supprimer}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {employes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-but-gray">
                    Aucun employé. Ajoute des comptes depuis &laquo;&nbsp;Employés&nbsp;&raquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModal(null)}
        >
          <form
            onSubmit={ajouterTache}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card-hover"
          >
            <h3 className="mb-1 font-bold text-but-dark">Ajouter une tâche</h3>
            <p className="mb-3 text-xs text-but-gray">
              {modal.employeNom} —{" "}
              {modal.date
                ? new Date(`${modal.date}T12:00:00`).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "toute la semaine"}
            </p>
            <textarea
              autoFocus
              required
              value={modalTexte}
              onChange={(e) => setModalTexte(e.target.value)}
              placeholder="ex: Réceptionner la commande TVilum"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Annuler
              </Button>
              <Button type="submit" loading={modalEnCours}>
                Ajouter
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CelluleTaches({
  taches,
  onAjouter,
  onSupprimer,
}: {
  taches: Objectif[];
  onAjouter: () => void;
  onSupprimer: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {taches.map((t) => (
        <div
          key={t.id}
          className="group flex items-start justify-between gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-but-dark"
        >
          <span>{t.texte}</span>
          <button
            onClick={() => onSupprimer(t.id)}
            className="shrink-0 text-but-gray opacity-0 hover:text-but-red group-hover:opacity-100"
            aria-label="Supprimer cette tâche"
          >
            <IconClose className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onAjouter}
        className="rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-but-gray hover:border-but-red hover:text-but-red"
      >
        + Ajouter
      </button>
    </div>
  );
}
