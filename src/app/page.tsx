import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { recupererMeteoSemaine, SEUIL_CANICULE_C } from "@/lib/meteo";
import { formatDateISO, formatHeure, lundiDeSemaine, maintenantParis } from "@/lib/semaine";
import { horairesEffectifs, jourSemaineISO } from "@/lib/planningMerge";
import MeteoSemaine from "@/components/MeteoSemaine";
import Confetti from "@/components/Confetti";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  IconAlertTriangle,
  IconThermometer,
  IconClock,
  IconCake,
  IconTarget,
  IconSearch,
  IconMap,
  IconBox,
  IconArrowRight,
  IconMessage,
} from "@/components/icons";
import type { Objectif } from "@/lib/types";

// Page d'accueil : météo de la semaine (avec message de prévention en cas
// de forte chaleur), rappel des bons gestes/postures, et accès rapides aux
// outils du quotidien. Remplace l'ancienne redirection automatique vers
// /recherche — /recherche reste accessible directement depuis le menu.
export default async function AccueilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let prenom: string | null = null;
  let accesSav = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, acces_sav")
      .eq("id", user.id)
      .single();
    prenom = profile?.full_name?.split(" ")[0] ?? null;
    accesSav = profile?.role === "admin" || profile?.role === "dev" || profile?.acces_sav === true;
  }
  let horairesAujourdHui: ReturnType<typeof horairesEffectifs> = [];
  if (user) {
    const aujourdHuiDate = maintenantParis();
    const dateISO = formatDateISO(aujourdHuiDate);
    const [{ data: exceptions }, { data: recurrents }] = await Promise.all([
      supabase
        .from("plannings")
        .select("id, employe_id, date, heure_debut, heure_fin, pause_debut, pause_fin, repos")
        .eq("employe_id", user.id)
        .eq("date", dateISO),
      supabase
        .from("planning_recurrent")
        .select("id, employe_id, jour_semaine, heure_debut, heure_fin, pause_debut, pause_fin")
        .eq("employe_id", user.id)
        .eq("jour_semaine", jourSemaineISO(aujourdHuiDate)),
    ]);
    horairesAujourdHui = horairesEffectifs(
      user.id,
      dateISO,
      jourSemaineISO(aujourdHuiDate),
      exceptions ?? [],
      recurrents ?? []
    );
  }

  // Anniversaires du jour : on récupère tous les profils avec une date de
  // naissance renseignée puis on filtre en JS sur jour+mois (comparer un
  // "date" Postgres au jour+mois courant n'est pas direct via le query
  // builder Supabase). Visible par tout le monde ; les confettis ne se
  // déclenchent que pour la personne concernée (voir plus bas).
  const aujourdHuiJourMois = formatDateISO(maintenantParis()).slice(5, 10); // "MM-DD"
  const { data: profilsAvecNaissance } = await supabase
    .from("profiles")
    .select("id, full_name, date_naissance")
    .not("date_naissance", "is", null);
  const anniversairesAujourdHui = (profilsAvecNaissance ?? []).filter(
    (p) => p.date_naissance && p.date_naissance.slice(5, 10) === aujourdHuiJourMois
  );
  const monAnniversaireAujourdHui =
    !!user && anniversairesAujourdHui.some((p) => p.id === user.id);

  // Objectifs/tâches de la semaine en cours (voir /admin/objectifs) :
  // objectifs globaux visibles par tous, et tâches assignées à la personne
  // connectée (toute la semaine, ou pour un jour précis — aujourd'hui mis
  // en avant).
  const semaineDebut = formatDateISO(lundiDeSemaine(maintenantParis()));
  const { data: objectifsSemaine } = await supabase
    .from("objectifs")
    .select("id, semaine_debut, employe_id, date, texte, created_at")
    .eq("semaine_debut", semaineDebut);
  const objectifsGlobaux = (objectifsSemaine ?? []).filter((o) => !o.employe_id) as Objectif[];
  const mesTaches = (
    user ? (objectifsSemaine ?? []).filter((o) => o.employe_id === user.id) : []
  ) as Objectif[];
  const aujourdHuiISO = formatDateISO(maintenantParis());
  const mesTachesAujourdHui = mesTaches.filter((t) => t.date === aujourdHuiISO);
  const mesTachesSemaine = mesTaches.filter((t) => t.date === null);
  const mesTachesAutresJours = mesTaches.filter((t) => t.date && t.date !== aujourdHuiISO);

  let jours: Awaited<ReturnType<typeof recupererMeteoSemaine>> = [];
  let erreurMeteo: string | null = null;
  try {
    jours = await recupererMeteoSemaine();
  } catch {
    erreurMeteo = "Météo momentanément indisponible.";
  }

  const aujourdHui = jours[0];
  const canicule = !!aujourdHui && aujourdHui.tempMaxC >= SEUIL_CANICULE_C;

  const quickLinks = [
    {
      href: "/recherche",
      icon: IconSearch,
      titre: "Rechercher / ranger",
      sousTitre: "Chercher un produit, ranger une réception",
    },
    {
      href: "/planning",
      icon: IconClock,
      titre: "Planning",
      sousTitre: "Horaires de toute l'équipe, imprimable",
    },
    {
      href: "/verifications",
      icon: IconMap,
      titre: "Vérifications",
      sousTitre: "Emplacements à recontrôler (+1 mois sans confirmation)",
    },
    {
      href: "/codebarre",
      icon: IconBox,
      titre: "Codes-barres",
      sousTitre: "Réimprimer une étiquette",
    },
    ...(accesSav
      ? [
          {
            href: "/sav",
            icon: IconMessage,
            titre: "SAV",
            sousTitre: "Tickets clients, suivi façon tableau",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {monAnniversaireAujourdHui && <Confetti />}

      {anniversairesAujourdHui.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-but-red/20 bg-but-red-light p-4">
          <IconCake className="h-6 w-6 shrink-0 text-but-red" />
          <p className="text-sm font-semibold text-but-dark">
            {monAnniversaireAujourdHui
              ? "Joyeux anniversaire ! 🎉 Toute l'équipe te souhaite une excellente journée."
              : `Aujourd'hui c'est l'anniversaire de ${anniversairesAujourdHui
                  .map((p) => p.full_name ?? "un(e) collègue")
                  .join(", ")} !`}
          </p>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-but-dark sm:text-3xl">
          {prenom ? `Bonjour ${prenom}` : "Bonjour"}
        </h1>
        <p className="text-sm capitalize text-but-gray">
          {maintenantParis().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {(user || objectifsGlobaux.length > 0 || mesTaches.length > 0) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {user && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <IconClock className="h-5 w-5 text-but-red" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-but-gray">
                  Ton planning aujourd&apos;hui
                </h2>
              </div>
              {horairesAujourdHui.length === 0 ? (
                <p className="text-sm text-but-gray">Pas d&apos;horaire renseigné pour aujourd&apos;hui.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-but-dark">
                  {horairesAujourdHui.map((h, i) => (
                    <li key={i}>
                      Tu commences à <strong>{formatHeure(h.heure_debut)}</strong> et finis à{" "}
                      <strong>{formatHeure(h.heure_fin)}</strong>
                      {h.pause_debut && h.pause_fin && (
                        <>
                          , avec une pause de <strong>{formatHeure(h.pause_debut)}</strong> à{" "}
                          <strong>{formatHeure(h.pause_fin)}</strong>
                        </>
                      )}
                      .
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/planning"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-but-red hover:underline"
              >
                Voir le planning de la semaine
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}

          {(objectifsGlobaux.length > 0 || mesTaches.length > 0) && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <IconTarget className="h-5 w-5 text-but-red" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-but-gray">
                  Objectifs de la semaine
                </h2>
              </div>

              {objectifsGlobaux.length > 0 && (
                <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-but-dark">
                  {objectifsGlobaux.map((o) => (
                    <li key={o.id}>{o.texte}</li>
                  ))}
                </ul>
              )}

              {user && mesTaches.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-but-gray">
                    Tes tâches
                  </p>
                  {mesTachesAujourdHui.length > 0 && (
                    <ul className="mb-2 space-y-1.5 text-sm text-but-dark">
                      {mesTachesAujourdHui.map((t) => (
                        <li key={t.id} className="flex items-start gap-2">
                          <Badge tone="red" className="mt-0.5 shrink-0">
                            Aujourd&apos;hui
                          </Badge>
                          {t.texte}
                        </li>
                      ))}
                    </ul>
                  )}
                  {mesTachesSemaine.length > 0 && (
                    <ul className="mb-2 space-y-1.5 text-sm text-but-dark">
                      {mesTachesSemaine.map((t) => (
                        <li key={t.id} className="flex items-start gap-2">
                          <Badge tone="gray" className="mt-0.5 shrink-0">
                            Cette semaine
                          </Badge>
                          {t.texte}
                        </li>
                      ))}
                    </ul>
                  )}
                  {mesTachesAutresJours.length > 0 && (
                    <ul className="space-y-1.5 text-sm text-but-gray">
                      {mesTachesAutresJours.map((t) => (
                        <li key={t.id} className="flex items-start gap-2">
                          <Badge tone="gray" className="mt-0.5 shrink-0">
                            {t.date &&
                              new Date(`${t.date}T12:00:00`).toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "numeric",
                              })}
                          </Badge>
                          <span className="text-but-dark">{t.texte}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {canicule && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-but-red/30 bg-but-red-light p-4">
          <IconThermometer className="h-6 w-6 shrink-0 text-but-red" />
          <div>
            <p className="font-bold text-but-red">
              Forte chaleur annoncée aujourd&apos;hui ({aujourdHui.tempMaxC}°C)
            </p>
            <p className="mt-1 text-sm text-but-dark">
              Bois de l&apos;eau régulièrement, même sans avoir soif. Évite les
              efforts intenses aux heures les plus chaudes, fais des pauses à
              l&apos;ombre ou dans un endroit frais, et porte une tenue légère.
              Préviens un collègue ou un responsable au moindre signe de
              malaise (maux de tête, vertiges, nausées, crampes).
            </p>
          </div>
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-but-gray">
          Météo de la semaine — Houdemont
        </h2>
        {erreurMeteo ? (
          <p className="text-sm text-but-gray">{erreurMeteo}</p>
        ) : (
          <MeteoSemaine jours={jours} />
        )}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ href, icon: Icon, titre, sousTitre }) => (
          <Link key={href} href={href}>
            <Card hover className="group h-full">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-but-red-light text-but-red transition group-hover:bg-but-red group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-but-dark">{titre}</p>
              <p className="mt-0.5 text-xs text-but-gray">{sousTitre}</p>
            </Card>
          </Link>
        ))}
      </section>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5 text-but-red" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-but-gray">
            Gestes et postures
          </h2>
        </div>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-but-dark">
          <li>Plie les genoux, garde le dos droit : soulève avec les jambes, pas avec le dos.</li>
          <li>Garde la charge proche du corps et évite de te pencher en torsion.</li>
          <li>Pour une charge lourde ou encombrante, demande de l&apos;aide ou utilise un transpalette.</li>
          <li>Porte les équipements de protection prévus (chaussures de sécurité, gants).</li>
          <li>Vérifie la stabilité d&apos;une palette avant de grimper ou de la déplacer.</li>
          <li>Signale toute alvéole ou rack endommagé plutôt que de l&apos;utiliser quand même.</li>
        </ul>
      </Card>
    </div>
  );
}
