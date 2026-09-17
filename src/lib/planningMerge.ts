import type { Planning, PlanningRecurrent } from "./types";

// Calcule l'horaire "effectif" d'un jour précis : l'exception ponctuelle
// pour cette date si elle existe (table plannings), sinon l'horaire
// habituel de ce jour de semaine (table planning_recurrent, "pour
// toujours"). Utilisé par /planning, /admin/planning et la page d'accueil
// pour que tout le monde voie le même horaire réel, qu'il vienne de
// l'habituel ou d'une modification ponctuelle.
export interface HoraireEffectif {
  id: string; // id de l'exception (Planning), ou "recurrent:<id>" si c'est l'habituel
  heure_debut: string;
  heure_fin: string;
  pause_debut: string | null;
  pause_fin: string | null;
  recurrent: boolean; // true = vient de l'habituel, aucune exception cette semaine
  repos?: boolean; // true = jour de repos exceptionnel (ne compte jamais dans les heures)
}

// 1 = lundi ... 7 = dimanche (comme planning_recurrent.jour_semaine).
export function jourSemaineISO(date: Date): number {
  const jour = date.getDay();
  return jour === 0 ? 7 : jour;
}

export function horairesEffectifs(
  employeId: string,
  date: string,
  jourSemaineNum: number,
  overrides: Planning[],
  recurrents: PlanningRecurrent[]
): HoraireEffectif[] {
  const overridesJour = overrides.filter((o) => o.employe_id === employeId && o.date === date);
  if (overridesJour.length > 0) {
    // Une exception "jour de repos" prend le pas sur tout : ce jour-là,
    // l'employé ne travaille pas du tout, quel que soit l'horaire habituel
    // (voir migration_015 — sans ça un repos exceptionnel s'ajoutait aux
    // heures habituelles au lieu de les remplacer).
    if (overridesJour.some((o) => o.repos)) return [];
    return overridesJour.map((o) => ({
      id: o.id,
      heure_debut: o.heure_debut,
      heure_fin: o.heure_fin,
      pause_debut: o.pause_debut,
      pause_fin: o.pause_fin,
      recurrent: false,
    }));
  }
  return recurrents
    .filter((r) => r.employe_id === employeId && r.jour_semaine === jourSemaineNum)
    .map((r) => ({
      id: `recurrent:${r.id}`,
      heure_debut: r.heure_debut,
      heure_fin: r.heure_fin,
      pause_debut: r.pause_debut,
      pause_fin: r.pause_fin,
      recurrent: true,
    }));
}

// Un jour de repos exceptionnel est-il posé pour cet employé à cette date ?
// Sert à afficher "Repos" plutôt qu'une simple case vide (qui pourrait
// laisser croire qu'aucun horaire n'a été renseigné) — voir /planning et
// /admin/planning.
export function estRepos(employeId: string, date: string, overrides: Planning[]): boolean {
  return overrides.some((o) => o.employe_id === employeId && o.date === date && o.repos);
}

function versMinutes(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Durée en heures d'un horaire (pause déduite). Suppose que la fin est
// après le début le même jour (pas de service de nuit à cheval sur minuit).
export function dureeHeures(h: {
  heure_debut: string;
  heure_fin: string;
  pause_debut: string | null;
  pause_fin: string | null;
}): number {
  let minutes = versMinutes(h.heure_fin) - versMinutes(h.heure_debut);
  if (h.pause_debut && h.pause_fin) {
    minutes -= versMinutes(h.pause_fin) - versMinutes(h.pause_debut);
  }
  return Math.max(0, minutes) / 60;
}

export function formatDuree(heures: number): string {
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
