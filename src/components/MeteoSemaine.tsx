import type { JourMeteo } from "@/lib/meteo";
import { descriptionMeteo, nomJour, SEUIL_CANICULE_C } from "@/lib/meteo";
import {
  IconSun,
  IconCloud,
  IconCloudSun,
  IconCloudRain,
  IconCloudSnow,
  IconCloudLightning,
  IconDroplet,
} from "@/components/icons";

const ICONES_FAMILLE = {
  soleil: IconSun,
  eclaircies: IconCloudSun,
  nuage: IconCloud,
  pluie: IconCloudRain,
  neige: IconCloudSnow,
  orage: IconCloudLightning,
};

// Bande de 7 cartes météo (une par jour) pour la page d'accueil. Le jour
// dont la température max dépasse le seuil canicule est mis en évidence en
// rouge — sert aussi de base au message de prévention affiché au-dessus.
export default function MeteoSemaine({ jours }: { jours: JourMeteo[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
      {jours.map((j, i) => {
        const { label, famille } = descriptionMeteo(j.codeMeteo);
        const Icone = ICONES_FAMILLE[famille];
        const canicule = j.tempMaxC >= SEUIL_CANICULE_C;
        return (
          <div
            key={j.date}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center ${
              canicule ? "border-but-red bg-but-red/5" : "border-gray-200 bg-white"
            }`}
          >
            <p className="text-xs font-semibold text-but-dark">{nomJour(j.date, i)}</p>
            <Icone className={`h-7 w-7 ${canicule ? "text-but-red" : "text-but-gray"}`} />
            <p className="text-[11px] text-but-gray">{label}</p>
            <p className="text-sm font-bold text-but-dark">
              {j.tempMaxC}°{" "}
              <span className="font-normal text-but-gray">{j.tempMinC}°</span>
            </p>
            {j.probaPrecipitation != null && j.probaPrecipitation >= 30 && (
              <p className="flex items-center gap-0.5 text-[11px] text-blue-600">
                <IconDroplet className="h-3 w-3" />
                {j.probaPrecipitation}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
