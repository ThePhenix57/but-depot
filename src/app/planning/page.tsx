"use client";

import { useEffect, useState } from "react";
import type { Planning, PlanningRecurrent } from "@/lib/types";
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

// Planning de la semaine — consultable par tout le monde (pas seulement le
// sien), et imprimable. Combine l'horaire habituel de chacun (pour
// toujours) avec les exceptions posées pour cette semaine précise. Les
// horaires de la personne connectée sont mis en évidence.
export default function PlanningPage() {
  const [lundi, setLundi] = useState(() => lundiDeSemaine(new Date()));
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [recurrents, setRecurrents] = useState<PlanningRecurrent[]>([]);
  const [monId, setMonId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const jours = joursDeLaSemaine(lundi);
  const du = formatDateISO(jours[0]);
  const au = formatDateISO(jours[6]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => json.id && setMonId(json.id));
    fetch("/api/planning/recurrent")
      .then((res) => res.json())
      .then((json) => json.recurrents && setRecurrents(json.recurrents));
  }, []);

  useEffect(() => {
    setChargement(true);
    setErreur(null);
    fetch(`/api/planning?from=${du}&to=${au}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setErreur(json.error);
        else setPlannings(json.plannings);
      })
      .catch(() => setErreur("Impossible de charger le planning."))
      .finally(() => setChargement(false));
  }, [du, au]);

  // Un employé par ligne : tous ceux qui ont un horaire habituel, plus ceux
  // qui n'ont qu'une exception posée cette semaine (sans horaire habituel).
  const employesParId = new Map<string, { nom: string }>();
  for (const r of recurrents) {
    if (!employesParId.has(r.employe_id)) {
      employesParId.set(r.employe_id, { nom: r.employe?.full_name || r.employe?.email || "—" });
    }
  }
  for (const p of plannings) {
    if (!employesParId.has(p.employe_id)) {
      employesParId.set(p.employe_id, { nom: p.employe?.full_name || p.employe?.email || "—" });
    }
  }
  const employes = [...employesParId.entries()].sort((a, b) => a[1].nom.localeCompare(b[1].nom));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-but-dark">Planning</h1>
          <p className="mt-1 text-sm text-but-gray">Horaires de toute l&apos;équipe.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <IconPrinter className="h-4 w-4" />
          Imprimer
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-3 print:hidden">
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
      </div>

      {erreur && (
        <p className="mb-4 rounded-xl border border-but-red/20 bg-but-red-light px-3 py-2 text-sm text-but-red-dark">
          {erreur}
        </p>
      )}
      {chargement && (
        <div className="flex items-center gap-2 text-sm text-but-gray print:hidden">
          <Spinner className="h-4 w-4" />
          Chargement...
        </div>
      )}

      {!chargement && employes.length === 0 && !erreur && (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-but-gray">
          Aucun horaire renseigné pour cette semaine.
        </p>
      )}

      {employes.length > 0 && (
        <div id="fiche-impression">
          <p className="mb-3 hidden text-center text-sm font-semibold text-but-dark print:block">
            Planning — semaine du {jours[0].toLocaleDateString("fr-FR")} au{" "}
            {jours[6].toLocaleDateString("fr-FR")}
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200 print:overflow-visible print:border-0">
            <table className="w-full min-w-[64rem] text-sm print:min-w-0 print:table-fixed print:text-[10px]">
              <thead className="bg-but-gray-light text-left">
                <tr>
                  <th className="min-w-[10rem] px-3 py-2 print:min-w-0">Employé</th>
                  {jours.map((j) => (
                    <th key={j.toISOString()} className="min-w-[7rem] px-2 py-2 text-center print:min-w-0">
                      {nomJourLong(j)}
                      <br />
                      <span className="font-normal text-but-gray">
                        {j.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-2 py-2 text-center print:whitespace-normal">Total</th>
                  <th className="hidden min-w-[8rem] whitespace-nowrap px-2 py-2 text-center print:table-cell print:min-w-0 print:whitespace-normal">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody>
                {employes.map(([id, info]) => {
                  let totalSemaine = 0;
                  return (
                    <tr
                      key={id}
                      className={`border-t border-gray-100 align-top ${id === monId ? "bg-but-red/5" : ""}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-semibold print:whitespace-normal">
                        {info.nom}
                        {id === monId && <span className="ml-1 text-xs font-normal text-but-red">(toi)</span>}
                      </td>
                      {jours.map((j) => {
                        const date = formatDateISO(j);
                        const horaires = horairesEffectifs(id, date, jourSemaineISO(j), plannings, recurrents);
                        for (const h of horaires) totalSemaine += dureeHeures(h);
                        return (
                          <td key={date} className="px-2 py-2 text-center">
                            {horaires.length === 0 && estRepos(id, date, plannings) && (
                              <span className="text-xs font-semibold text-but-gray">Repos</span>
                            )}
                            {horaires.length === 0 && !estRepos(id, date, plannings) && (
                              <span className="text-but-gray">—</span>
                            )}
                            {horaires.map((h) => (
                              <div key={h.id} className="text-xs font-semibold text-but-dark">
                                {formatHeure(h.heure_debut)}–{formatHeure(h.heure_fin)}
                                {h.pause_debut && h.pause_fin && (
                                  <div className="font-normal text-but-gray">
                                    pause {formatHeure(h.pause_debut)}–{formatHeure(h.pause_fin)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-2 py-2 text-center text-xs font-semibold text-but-dark print:whitespace-normal">
                        {formatDuree(totalSemaine)}
                      </td>
                      <td className="hidden px-2 py-2 text-center print:table-cell">
                        <div className="mx-auto h-10 w-full max-w-[9rem] rounded border border-but-dark/40" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
