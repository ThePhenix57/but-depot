"use client";

import { useEffect, useMemo, useState } from "react";
import type { Planning, PlanningRecurrent, Profile } from "@/lib/types";
import {
  ajouterJours,
  formatDateISO,
  joursDeLaSemaine,
  lundiDeSemaine,
  nomJourLong,
  formatHeure,
} from "@/lib/semaine";
import { horairesEffectifs, jourSemaineISO, dureeHeures, formatDuree, estRepos } from "@/lib/planningMerge";
import { IconChevronDown, IconPrinter } from "@/components/icons";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

const JOURS_SEMAINE = [
  { num: 1, nom: "Lundi" },
  { num: 2, nom: "Mardi" },
  { num: 3, nom: "Mercredi" },
  { num: 4, nom: "Jeudi" },
  { num: 5, nom: "Vendredi" },
  { num: 6, nom: "Samedi" },
  { num: 7, nom: "Dimanche" },
];

interface FormeEdition {
  mode: "semaine" | "habituel";
  id: string | null; // null = nouveau (ou pas encore d'exception cette semaine)
  employeId: string;
  employeNom: string;
  date?: string; // mode "semaine"
  jourSemaine?: number; // mode "habituel"
  heureDebut: string;
  heureFin: string;
  pauseDebut: string;
  pauseFin: string;
  repos: boolean; // mode "semaine" uniquement : jour de repos exceptionnel
}

// Gestion du planning, en deux vues :
// - "Semaine" : le planning réel d'une semaine précise. Chaque case affiche
//   l'horaire habituel de ce jour par défaut ("pour toujours"), qu'on peut
//   remplacer ponctuellement pour CETTE semaine seulement (une exception).
// - "Horaires habituels" : l'horaire par défaut de chaque employé, par jour
//   de semaine, appliqué pour toujours tant qu'il n'est pas changé ici (ou
//   exceptionné pour une semaine précise dans la vue "Semaine").
export default function PlanningAdminPage() {
  const [mode, setMode] = useState<"semaine" | "habituel">("semaine");
  const [lundi, setLundi] = useState(() => lundiDeSemaine(new Date()));
  const [employes, setEmployes] = useState<Profile[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [recurrents, setRecurrents] = useState<PlanningRecurrent[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [edition, setEdition] = useState<FormeEdition | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const jours = joursDeLaSemaine(lundi);
  const du = formatDateISO(jours[0]);
  const au = formatDateISO(jours[6]);

  useEffect(() => {
    fetch("/api/employes")
      .then((res) => res.json())
      .then((json) => {
        if (json.employes) setEmployes(json.employes);
      });
    chargerRecurrents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chargerSemaine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [du, au]);

  async function chargerSemaine() {
    setChargement(true);
    setErreur(null);
    const res = await fetch(`/api/planning?from=${du}&to=${au}`);
    const json = await res.json();
    setChargement(false);
    if (!res.ok) {
      setErreur(json.error || "Erreur lors du chargement.");
      return;
    }
    setPlannings(json.plannings);
  }

  async function chargerRecurrents() {
    const res = await fetch("/api/planning/recurrent");
    const json = await res.json();
    if (res.ok) setRecurrents(json.recurrents);
  }

  function nomEmploye(id: string) {
    return employes.find((e) => e.id === id)?.full_name || "";
  }

  // --- Vue "Semaine" -------------------------------------------------------

  function ouvrirCelluleSemaine(employeId: string, date: string, jourSemaineNum: number) {
    const effectifs = horairesEffectifs(employeId, date, jourSemaineNum, plannings, recurrents);
    const base = effectifs[0];
    const exceptionRepos = plannings.find(
      (p) => p.employe_id === employeId && p.date === date && p.repos
    );
    setEdition({
      mode: "semaine",
      id: exceptionRepos ? exceptionRepos.id : base && !base.recurrent ? base.id : null,
      employeId,
      employeNom: nomEmploye(employeId),
      date,
      heureDebut: base ? formatHeure(base.heure_debut) : "09:00",
      heureFin: base ? formatHeure(base.heure_fin) : "17:00",
      pauseDebut: base ? formatHeure(base.pause_debut) : "",
      pauseFin: base ? formatHeure(base.pause_fin) : "",
      repos: estRepos(employeId, date, plannings),
    });
  }

  async function enregistrerSemaine(edition: FormeEdition) {
    const body = {
      employeId: edition.employeId,
      date: edition.date,
      heureDebut: edition.heureDebut,
      heureFin: edition.heureFin,
      pauseDebut: edition.pauseDebut || null,
      pauseFin: edition.pauseFin || null,
      repos: edition.repos,
    };
    const res = edition.id
      ? await fetch(`/api/planning/${edition.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    return res;
  }

  async function supprimerException() {
    if (!edition?.id) return;
    setEnregistrement(true);
    try {
      const res = await fetch(`/api/planning/${edition.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error || "Erreur lors de la suppression.");
        return;
      }
      setEdition(null);
      chargerSemaine();
    } finally {
      setEnregistrement(false);
    }
  }

  // --- Vue "Horaires habituels" --------------------------------------------

  function ouvrirCelluleHabituel(employeId: string, jourSemaineNum: number) {
    const existant = recurrents.find(
      (r) => r.employe_id === employeId && r.jour_semaine === jourSemaineNum
    );
    setEdition({
      mode: "habituel",
      id: existant?.id ?? null,
      employeId,
      employeNom: nomEmploye(employeId),
      jourSemaine: jourSemaineNum,
      heureDebut: existant ? formatHeure(existant.heure_debut) : "09:00",
      heureFin: existant ? formatHeure(existant.heure_fin) : "17:00",
      pauseDebut: existant ? formatHeure(existant.pause_debut) : "",
      pauseFin: existant ? formatHeure(existant.pause_fin) : "",
      repos: false,
    });
  }

  async function enregistrerHabituel(edition: FormeEdition) {
    return fetch("/api/planning/recurrent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeId: edition.employeId,
        jourSemaine: edition.jourSemaine,
        heureDebut: edition.heureDebut,
        heureFin: edition.heureFin,
        pauseDebut: edition.pauseDebut || null,
        pauseFin: edition.pauseFin || null,
      }),
    });
  }

  async function supprimerHabituel() {
    if (!edition?.id) return;
    setEnregistrement(true);
    try {
      const res = await fetch(`/api/planning/recurrent/${edition.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error || "Erreur lors de la suppression.");
        return;
      }
      setEdition(null);
      chargerRecurrents();
    } finally {
      setEnregistrement(false);
    }
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!edition) return;
    setEnregistrement(true);
    setErreur(null);
    try {
      const res =
        edition.mode === "semaine" ? await enregistrerSemaine(edition) : await enregistrerHabituel(edition);
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error || "Erreur lors de l'enregistrement.");
        return;
      }
      setEdition(null);
      if (edition.mode === "semaine") chargerSemaine();
      else chargerRecurrents();
    } finally {
      setEnregistrement(false);
    }
  }

  // Total d'heures effectives sur la semaine affichée, pour un employé.
  const totalSemaine = useMemo(() => {
    const totaux = new Map<string, number>();
    for (const emp of employes) {
      let total = 0;
      for (const j of jours) {
        const date = formatDateISO(j);
        const effectifs = horairesEffectifs(emp.id, date, jourSemaineISO(j), plannings, recurrents);
        for (const h of effectifs) total += dureeHeures(h);
      }
      totaux.set(emp.id, total);
    }
    return totaux;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employes, plannings, recurrents, du, au]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Planning</h1>
      <p className="mb-4 text-sm text-but-gray">
        Définis l&apos;horaire <strong>habituel</strong> de chaque employé (appliqué pour
        toujours, semaine après semaine), et exceptionne une semaine précise
        depuis la vue &laquo;&nbsp;Semaine&nbsp;&raquo; si besoin (congé,
        changement ponctuel...). Visible par tout le monde sur
        &laquo;&nbsp;Planning&nbsp;&raquo; (imprimable), et rappelé à chacun sur
        la page d&apos;accueil le jour même.
      </p>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setMode("semaine")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            mode === "semaine" ? "bg-but-red text-white" : "border border-gray-300 text-but-dark hover:border-but-red hover:text-but-red"
          }`}
        >
          Semaine
        </button>
        <button
          onClick={() => setMode("habituel")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            mode === "habituel" ? "bg-but-red text-white" : "border border-gray-300 text-but-dark hover:border-but-red hover:text-but-red"
          }`}
        >
          Horaires habituels
        </button>
      </div>

      {erreur && (
        <p className="mb-4 rounded-xl border border-but-red/20 bg-but-red-light px-3 py-2 text-sm text-but-red-dark">
          {erreur}
        </p>
      )}

      {mode === "semaine" && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setLundi(ajouterJours(lundi, -7))}
              className="rounded-lg border border-gray-300 p-2 text-but-dark transition hover:border-but-red hover:text-but-red"
              aria-label="Semaine précédente"
            >
              <IconChevronDown className="h-4 w-4 rotate-90" />
            </button>
            <p className="text-sm font-semibold text-but-dark">
              Semaine du {jours[0].toLocaleDateString("fr-FR")} au{" "}
              {jours[6].toLocaleDateString("fr-FR")}
            </p>
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
            <Button variant="outline" onClick={() => window.print()} className="ml-auto">
              <IconPrinter className="h-4 w-4" />
              Imprimer
            </Button>
          </div>

          {chargement && (
            <div className="mb-3 flex items-center gap-2 text-sm text-but-gray">
              <Spinner className="h-4 w-4" />
              Chargement...
            </div>
          )}

          <div id="fiche-impression">
          <p className="mb-3 hidden text-center text-sm font-semibold text-but-dark print:block">
            Planning — semaine du {jours[0].toLocaleDateString("fr-FR")} au{" "}
            {jours[6].toLocaleDateString("fr-FR")}
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200 print:overflow-visible print:border-0">
            <table className="w-full min-w-[72rem] text-sm print:min-w-0 print:table-fixed print:text-[10px]">
              <thead className="bg-but-gray-light text-left">
                <tr>
                  <th className="min-w-[10rem] px-3 py-2 print:min-w-0">Employé</th>
                  {jours.map((j) => (
                    <th key={j.toISOString()} className="min-w-[8rem] px-2 py-2 text-center print:min-w-0">
                      {nomJourLong(j)}
                      <br />
                      <span className="font-normal text-but-gray">
                        {j.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-2 text-center print:whitespace-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {employes.map((emp) => (
                  <tr key={emp.id} className="border-t border-gray-100 align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold print:whitespace-normal">
                      {emp.full_name || emp.email}
                    </td>
                    {jours.map((j) => {
                      const date = formatDateISO(j);
                      const jourNum = jourSemaineISO(j);
                      const effectifs = horairesEffectifs(emp.id, date, jourNum, plannings, recurrents);
                      return (
                        <td key={date} className="px-2 py-2 align-top">
                          <div className="flex flex-col gap-1">
                            {effectifs.map((h) => (
                              <button
                                key={h.id}
                                onClick={() => ouvrirCelluleSemaine(emp.id, date, jourNum)}
                                className={`rounded px-2 py-1 text-left text-xs font-semibold ${
                                  h.recurrent
                                    ? "border border-dashed border-gray-300 text-but-gray hover:border-but-red"
                                    : "bg-but-red/10 text-but-red-dark hover:bg-but-red/20"
                                }`}
                              >
                                {formatHeure(h.heure_debut)}–{formatHeure(h.heure_fin)}
                                {h.pause_debut && h.pause_fin && (
                                  <span className="block font-normal text-but-gray">
                                    pause {formatHeure(h.pause_debut)}–{formatHeure(h.pause_fin)}
                                  </span>
                                )}
                                {h.recurrent && <span className="block font-normal">(habituel)</span>}
                              </button>
                            ))}
                            {effectifs.length === 0 && estRepos(emp.id, date, plannings) && (
                              <button
                                onClick={() => ouvrirCelluleSemaine(emp.id, date, jourNum)}
                                className="rounded border border-gray-300 bg-but-gray-light px-2 py-1 text-left text-xs font-semibold text-but-gray hover:border-but-red"
                              >
                                Repos
                              </button>
                            )}
                            {effectifs.length === 0 && !estRepos(emp.id, date, plannings) && (
                              <button
                                onClick={() => ouvrirCelluleSemaine(emp.id, date, jourNum)}
                                className="rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-but-gray hover:border-but-red hover:text-but-red"
                              >
                                + Ajouter
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-3 py-2 text-center font-semibold text-but-dark print:whitespace-normal">
                      {formatDuree(totalSemaine.get(emp.id) ?? 0)}
                    </td>
                  </tr>
                ))}
                {employes.length === 0 && !chargement && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-sm text-but-gray">
                      Aucun employé. Ajoute des comptes depuis &laquo;&nbsp;Employés&nbsp;&raquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
          <p className="mt-2 text-xs text-but-gray print:hidden">
            En pointillés : horaire habituel (pas d&apos;exception cette semaine). En
            plein : exception posée pour cette semaine précise uniquement.
          </p>
        </>
      )}

      {mode === "habituel" && (
        <>
          <p className="mb-4 text-sm text-but-gray">
            Ces horaires s&apos;appliquent <strong>pour toujours</strong>, à toutes
            les semaines à venir — pas besoin de les ressaisir chaque
            semaine. Pour une semaine précise différente (congé, changement
            ponctuel...), utilise la vue &laquo;&nbsp;Semaine&nbsp;&raquo;
            à la place : ça ne touche pas l&apos;habituel.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="bg-but-gray-light text-left">
                <tr>
                  <th className="min-w-[10rem] px-3 py-2">Employé</th>
                  {JOURS_SEMAINE.map((j) => (
                    <th key={j.num} className="min-w-[8rem] px-2 py-2 text-center">
                      {j.nom}
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
                    {JOURS_SEMAINE.map((j) => {
                      const r = recurrents.find(
                        (x) => x.employe_id === emp.id && x.jour_semaine === j.num
                      );
                      return (
                        <td key={j.num} className="px-2 py-2 align-top">
                          {r ? (
                            <button
                              onClick={() => ouvrirCelluleHabituel(emp.id, j.num)}
                              className="w-full rounded-lg bg-but-red/10 px-2 py-1 text-left text-xs font-semibold text-but-red-dark hover:bg-but-red/20"
                            >
                              {formatHeure(r.heure_debut)}–{formatHeure(r.heure_fin)}
                              {r.pause_debut && r.pause_fin && (
                                <span className="block font-normal text-but-gray">
                                  pause {formatHeure(r.pause_debut)}–{formatHeure(r.pause_fin)}
                                </span>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => ouvrirCelluleHabituel(emp.id, j.num)}
                              className="w-full rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-but-gray hover:border-but-red hover:text-but-red"
                            >
                              + Définir
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {employes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-but-gray">
                      Aucun employé. Ajoute des comptes depuis &laquo;&nbsp;Employés&nbsp;&raquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {edition && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEdition(null)}
        >
          <form
            onSubmit={enregistrer}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card-hover"
          >
            <h3 className="mb-3 font-bold text-but-dark">
              {edition.mode === "habituel"
                ? "Horaire habituel"
                : edition.id
                ? "Exception pour cette semaine"
                : "Ajouter une exception pour cette semaine"}
            </h3>
            <p className="mb-3 text-xs text-but-gray">
              {edition.employeNom} —{" "}
              {edition.mode === "habituel"
                ? JOURS_SEMAINE.find((j) => j.num === edition.jourSemaine)?.nom
                : new Date(`${edition.date}T12:00:00`).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
            </p>
            {edition.mode === "semaine" && (
              <>
                <p className="mb-3 rounded-lg bg-but-gray-light px-2 py-1.5 text-xs text-but-gray">
                  Ça ne change que cette semaine précise. Pour changer l&apos;horaire de
                  toutes les semaines, utilise plutôt &laquo;&nbsp;Horaires
                  habituels&nbsp;&raquo;.
                </p>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-but-dark">
                  <input
                    type="checkbox"
                    checked={edition.repos}
                    onChange={(e) => setEdition({ ...edition, repos: e.target.checked })}
                  />
                  Jour de repos (ne travaille pas ce jour-là)
                </label>
              </>
            )}
            {!edition.repos && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-xs font-semibold text-but-gray">
                  Début
                  <input
                    type="time"
                    required
                    value={edition.heureDebut}
                    onChange={(e) => setEdition({ ...edition, heureDebut: e.target.value })}
                    className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-xs font-semibold text-but-gray">
                  Fin
                  <input
                    type="time"
                    required
                    value={edition.heureFin}
                    onChange={(e) => setEdition({ ...edition, heureFin: e.target.value })}
                    className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-xs font-semibold text-but-gray">
                  Pause de
                  <input
                    type="time"
                    value={edition.pauseDebut}
                    onChange={(e) => setEdition({ ...edition, pauseDebut: e.target.value })}
                    className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-xs font-semibold text-but-gray">
                  Pause à
                  <input
                    type="time"
                    value={edition.pauseFin}
                    onChange={(e) => setEdition({ ...edition, pauseFin: e.target.value })}
                    className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
                  />
                </label>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              {edition.id ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={edition.mode === "semaine" ? supprimerException : supprimerHabituel}
                  disabled={enregistrement}
                >
                  {edition.mode === "semaine" ? "Revenir à l'habituel" : "Supprimer"}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEdition(null)}>
                  Annuler
                </Button>
                <Button type="submit" loading={enregistrement}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
