// Petits utilitaires de dates pour le planning (/admin/planning,
// /planning, et le résumé du jour sur la page d'accueil). Semaine du lundi
// au dimanche, comme c'est l'usage en France.

// "Maintenant", mais avec les composants (jour, mois, année, heure...)
// exprimés en heure de Paris plutôt que dans le fuseau du serveur. Les
// pages "use client" (planning, admin/planning...) tournent dans le
// navigateur de l'employé, donc `new Date()` y est déjà en heure locale
// (Paris) sans rien faire de spécial. Mais les pages/routes serveur (page
// d'accueil, API) tournent sur les machines Vercel en UTC : sans cette
// fonction, "aujourd'hui" pouvait afficher la veille entre minuit et 2h du
// matin heure de Paris (ex: 1h03 un lundi = encore dimanche en UTC).
//
// Astuce : on lit l'heure de Paris via Intl, puis on reconstruit un Date
// avec le constructeur "local" à partir de ces chiffres — comme le fuseau
// du serveur ne sert alors plus qu'à ré-interpréter les mêmes chiffres,
// tous les getters usuels (getFullYear, getMonth, getDate, getDay,
// getHours...) et toLocaleDateString/toLocaleString SANS option "timeZone"
// renvoient directement les valeurs de Paris.
export function maintenantParis(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const valeur = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    valeur("year"),
    valeur("month") - 1,
    valeur("day"),
    // "24" au lieu de "00" à minuit pile avec hour12:false — on ramène à 0.
    valeur("hour") % 24,
    valeur("minute"),
    valeur("second")
  );
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Lundi de la semaine contenant `date` (à minuit, heure locale).
export function lundiDeSemaine(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const jour = d.getDay(); // 0 = dimanche, 1 = lundi, ...
  const decalage = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + decalage);
  return d;
}

export function ajouterJours(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Les 7 jours (lundi -> dimanche) de la semaine du lundi donné.
export function joursDeLaSemaine(lundi: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}

export function nomJourCourt(date: Date): string {
  const nom = date.toLocaleDateString("fr-FR", { weekday: "short" });
  return nom.charAt(0).toUpperCase() + nom.slice(1).replace(".", "");
}

export function nomJourLong(date: Date): string {
  const nom = date.toLocaleDateString("fr-FR", { weekday: "long" });
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

// "HH:MM:SS" (format Postgres "time") ou "HH:MM" -> "HH:MM". Chaîne vide ou
// null -> "".
export function formatHeure(heure: string | null | undefined): string {
  if (!heure) return "";
  return heure.slice(0, 5);
}
