"use client";

import { useEffect, useRef, useState } from "react";
import type { AlveoleContenuItem, AlveoleWithOccupancy, Zone } from "@/lib/types";
import { parseAlveoleCode, claveTravee } from "@/lib/alveoleCode";
import { IconClose } from "@/components/icons";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface Props {
  zone: Zone;
  alveoles: AlveoleWithOccupancy[]; // toutes les alvéoles (le composant filtre lui-même sur la zone)
  onClose: () => void;
}

function comparerEtages(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return nb - na;
  return b.localeCompare(a);
}

// Aperçu de toutes les travées d'une zone (clic sur le plan dans
// /recherche) : montre chaque alvéole avec ce qu'elle contient (produit +
// nombre de colis), sans devoir chercher un EAN précis d'abord — pratique
// pour "qu'est-ce qu'il y a dans ce rack ?".
export default function ZoneApercu({ zone, alveoles, onClose }: Props) {
  const [contenu, setContenu] = useState<AlveoleContenuItem[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [alveoleSelectionnee, setAlveoleSelectionnee] = useState<AlveoleWithOccupancy | null>(
    null
  );
  const [videEnCours, setVideEnCours] = useState<string | null>(null); // id de la ligne en cours de vidage
  const traveesRef = useRef<HTMLDivElement>(null);

  // Les travées défilent horizontalement (une à côté de l'autre, comme sur
  // le plan réel) plutôt que verticalement — la molette de souris (qui
  // scrolle naturellement de haut en bas) est donc redirigée vers un
  // défilement de gauche à droite ici. Attaché "à la main" (pas via
  // onWheel en JSX) car React écoute wheel en mode passif par défaut : un
  // preventDefault() dans un onWheel classique est silencieusement ignoré,
  // et la page derrière la fenêtre continue de défiler verticalement en
  // même temps que les travées — d'où l'écouteur natif { passive: false }.
  useEffect(() => {
    const el = traveesRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el || el.scrollWidth <= el.clientWidth) return; // rien à faire défiler
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function chargerContenu() {
    setContenu((c) => c); // ne vide pas l'affichage pendant le rechargement
    return fetch(`/api/alveoles/contenu?zoneId=${zone.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setErreur(json.error);
        else setContenu(json.contenu);
      })
      .catch(() => setErreur("Impossible de charger le contenu."));
  }

  useEffect(() => {
    let annule = false;
    fetch(`/api/alveoles/contenu?zoneId=${zone.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (annule) return;
        if (json.error) setErreur(json.error);
        else setContenu(json.contenu);
      })
      .catch(() => !annule && setErreur("Impossible de charger le contenu."));
    return () => {
      annule = true;
    };
  }, [zone.id]);

  async function vider(ligneId: string) {
    if (!confirm("Vider cet emplacement ? Cette action retire le produit de l'alvéole et ne peut pas être annulée.")) return;
    setVideEnCours(ligneId);
    try {
      const res = await fetch(`/api/emplacements/${ligneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vider" }),
      });
      const json = await res.json();
      if (json.error) {
        setErreur(json.error);
        return;
      }
      await chargerContenu();
    } catch {
      setErreur("Impossible de vider cet emplacement.");
    } finally {
      setVideEnCours(null);
    }
  }

  const alveolesZone = alveoles.filter((a) => a.zone_id === zone.id);

  // Regroupe par travée (même allée + même numéro de rack), comme RackPlan.
  const travees = new Map<string, AlveoleWithOccupancy[]>();
  const sansCode: AlveoleWithOccupancy[] = [];
  for (const a of alveolesZone) {
    const parts = parseAlveoleCode(a.code);
    if (!parts) {
      sansCode.push(a);
      continue;
    }
    const cle = claveTravee(parts);
    const liste = travees.get(cle) ?? [];
    liste.push(a);
    travees.set(cle, liste);
  }

  // Ordre des travées : par numéro croissant par défaut (1, 2, 3...), ou
  // décroissant si la zone a "ordre_inverse" (voir /admin/zones) — sur le
  // terrain le numéro de travée augmente en s'éloignant de l'accueil, dans
  // un sens qui dépend de l'orientation de l'allée sur le plan.
  const traveesTriees = [...travees.entries()].sort(([, listeA], [, listeB]) => {
    const numA = Number(parseAlveoleCode(listeA[0].code)?.travee ?? 0);
    const numB = Number(parseAlveoleCode(listeB[0].code)?.travee ?? 0);
    return zone.ordre_inverse ? numB - numA : numA - numB;
  });

  function contenuAlveole(alveoleId: string) {
    return (contenu ?? []).filter((c) => c.alveole_id === alveoleId && c.product);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-but-dark">
            Aperçu — {zone.label || zone.code}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-but-gray hover:bg-but-gray-light"
            aria-label="Fermer"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {erreur && <p className="mb-3 text-sm text-but-red-dark">{erreur}</p>}
        {contenu === null && !erreur && (
          <div className="flex items-center gap-2 text-sm text-but-gray">
            <Spinner className="h-4 w-4" />
            Chargement...
          </div>
        )}

        {alveolesZone.length === 0 ? (
          <p className="text-sm text-but-gray">Aucune alvéole dans cette zone pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {traveesTriees.length > 1 && (
              <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-but-gray">
                <span>{zone.ordre_inverse ? "Quai" : "Accueil"}</span>
                <span className="text-but-gray/70">
                  numéros de travée croissants {zone.ordre_inverse ? "←" : "→"}
                </span>
                <span>{zone.ordre_inverse ? "Accueil" : "Quai"}</span>
              </div>
            )}
            <div ref={traveesRef} className="flex flex-row gap-4 overflow-x-auto pb-2">
            {traveesTriees.map(([cle, liste]) => {
              const lignes = new Map<string, { position: string; alveole: AlveoleWithOccupancy }[]>();
              const positions = new Set<string>();
              for (const a of liste) {
                const parts = parseAlveoleCode(a.code)!;
                positions.add(parts.position);
                const ligne = lignes.get(parts.etage) ?? [];
                ligne.push({ position: parts.position, alveole: a });
                lignes.set(parts.etage, ligne);
              }
              const etages = [...lignes.keys()].sort(comparerEtages);
              const posTriees = [...positions].sort((a, b) => a.localeCompare(b));

              return (
                <div key={cle} className="w-80 shrink-0 rounded-xl border border-gray-200 p-3">
                  <p className="mb-2 text-xs font-semibold text-but-gray">Travée {cle}</p>
                  <div className="flex flex-col gap-1">
                    {etages.map((etage) => {
                      const cellules = new Map(
                        lignes.get(etage)!.map((c) => [c.position, c.alveole])
                      );
                      return (
                        <div key={etage} className="flex items-center gap-1">
                          <span className="w-14 shrink-0 text-right text-[11px] text-but-gray">
                            étage {etage}
                          </span>
                          <div className="flex flex-1 gap-1">
                            {posTriees.map((pos) => {
                              const a = cellules.get(pos);
                              if (!a) return <div key={pos} className="h-12 flex-1 rounded bg-gray-50" />;
                              const items = contenuAlveole(a.id);
                              const occupee = items.length > 0;
                              const couleur = a.bloquee
                                ? "border-but-red bg-but-red text-white"
                                : occupee
                                ? "border-blue-600 bg-blue-500 text-white"
                                : "border-green-600 bg-green-500 text-white";
                              return (
                                <button
                                  key={pos}
                                  type="button"
                                  disabled={!occupee}
                                  onClick={() => occupee && setAlveoleSelectionnee(a)}
                                  className={`flex h-12 flex-1 flex-col items-center justify-center overflow-hidden rounded border px-1 text-center text-[10px] font-semibold leading-tight ${couleur} ${
                                    occupee ? "cursor-pointer hover:opacity-80" : "cursor-default"
                                  }`}
                                  title={
                                    a.bloquee
                                      ? `${a.code} — bloquée${a.bloquee_motif ? ` (${a.bloquee_motif})` : ""}`
                                      : occupee
                                      ? `${a.code} — ${items.map((i) => `${i.product?.name} (${i.colis})`).join(", ")} — cliquer pour vider`
                                      : `${a.code} — libre`
                                  }
                                >
                                  <span className="text-[11px]">{pos}</span>
                                  {occupee && (
                                    <span className="truncate">
                                      {items[0].product?.name}
                                      {items.length > 1 ? ` +${items.length - 1}` : ""}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>

            {sansCode.length > 0 && (
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="mb-2 text-xs font-semibold text-but-gray">
                  Autres alvéoles (code non standard)
                </p>
                <div className="flex flex-wrap gap-2">
                  {sansCode.map((a) => {
                    const items = contenuAlveole(a.id);
                    const couleur = a.bloquee
                      ? "border-but-red bg-but-red text-white"
                      : items.length > 0
                      ? "border-blue-600 bg-blue-500 text-white"
                      : "border-green-600 bg-green-500 text-white";
                    return (
                      <div
                        key={a.id}
                        className={`rounded border px-2 py-1 text-xs font-semibold ${couleur}`}
                        title={
                          items.length > 0
                            ? items.map((i) => `${i.product?.name} (${i.colis})`).join(", ")
                            : "libre"
                        }
                      >
                        {a.code}
                        {items.length > 0 && ` — ${items[0].product?.name}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-[11px] text-but-gray">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-but-red" /> Bloquée
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" /> Occupée (cliquer
            pour vider)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-500" /> Libre
          </span>
        </div>
      </div>

      {alveoleSelectionnee && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAlveoleSelectionnee(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-but-dark">
                Alvéole {alveoleSelectionnee.code}
              </h3>
              <button
                onClick={() => setAlveoleSelectionnee(null)}
                className="rounded-lg p-1 text-but-gray hover:bg-but-gray-light"
                aria-label="Fermer"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-but-gray">
              Si un produit a été retiré (ex: dernier colis donné à un client et
              signalé seulement sur le PDA), vide ici la ligne correspondante
              pour que l&apos;alvéole redevienne libre sur ce site.
            </p>
            <div className="flex flex-col gap-2">
              {contenuAlveole(alveoleSelectionnee.id).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-but-dark">
                      {item.product?.name}
                    </p>
                    <p className="text-xs text-but-gray">
                      {item.colis} colis{item.product?.ean ? ` — EAN ${item.product.ean}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => vider(item.id)}
                    loading={videEnCours === item.id}
                    className="shrink-0"
                  >
                    Vider
                  </Button>
                </div>
              ))}
              {contenuAlveole(alveoleSelectionnee.id).length === 0 && (
                <p className="text-sm text-but-gray">Cette alvéole est déjà vide.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
