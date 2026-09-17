// Météo de la semaine pour la page d'accueil — entrepôt BUT de Houdemont
// (54000, agglomération de Nancy). Utilise Open-Meteo (gratuit, sans clé
// d'API) : https://open-meteo.com/en/docs
//
// Coordonnées fixées ici (pas de géocodage à chaque appel) : si l'entrepôt
// change un jour de site, il suffit de changer ces deux valeurs.
const LATITUDE = 48.6404;
const LONGITUDE = 6.1614;

export interface JourMeteo {
  date: string; // "2026-08-27"
  tempMaxC: number;
  tempMinC: number;
  codeMeteo: number; // code WMO — voir descriptionMeteo()
  probaPrecipitation: number | null; // %
}

// Seuil officiel de vigilance canicule / prévention hydratation.
export const SEUIL_CANICULE_C = 35;

export async function recupererMeteoSemaine(): Promise<JourMeteo[]> {
  const params = new URLSearchParams({
    latitude: String(LATITUDE),
    longitude: String(LONGITUDE),
    daily: "temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max",
    timezone: "Europe/Paris",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    // Pas besoin d'une météo à la seconde près : on évite de re-appeler
    // l'API à chaque chargement de la page d'accueil.
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`Météo indisponible (${res.status})`);
  }
  const json = await res.json();
  const dates: string[] = json?.daily?.time ?? [];
  return dates.map((date, i) => ({
    date,
    tempMaxC: Math.round(json.daily.temperature_2m_max[i]),
    tempMinC: Math.round(json.daily.temperature_2m_min[i]),
    codeMeteo: json.daily.weathercode[i],
    probaPrecipitation: json.daily.precipitation_probability_max?.[i] ?? null,
  }));
}

// Regroupement simplifié des codes WMO (voir la doc Open-Meteo) en
// quelques familles suffisantes pour un pictogramme + un libellé.
export function descriptionMeteo(code: number): { label: string; famille: "soleil" | "nuage" | "eclaircies" | "pluie" | "neige" | "orage" } {
  if (code === 0) return { label: "Ciel dégagé", famille: "soleil" };
  if (code === 1 || code === 2) return { label: "Éclaircies", famille: "eclaircies" };
  if (code === 3) return { label: "Couvert", famille: "nuage" };
  if (code === 45 || code === 48) return { label: "Brouillard", famille: "nuage" };
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: "Pluie", famille: "pluie" };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { label: "Neige", famille: "neige" };
  }
  if (code >= 95) return { label: "Orage", famille: "orage" };
  return { label: "Variable", famille: "nuage" };
}

export function nomJour(dateIso: string, index: number) {
  if (index === 0) return "Aujourd'hui";
  const d = new Date(`${dateIso}T12:00:00`);
  const nom = d.toLocaleDateString("fr-FR", { weekday: "long" });
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}
