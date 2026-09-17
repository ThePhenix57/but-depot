"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import TicketModal from "@/components/sav/TicketModal";
import ReglagesSavModal from "@/components/sav/ReglagesSavModal";
import { IconPlus, IconSettings, IconMessage, IconCheck } from "@/components/icons";
import type { SavChampPerso, SavColonne, SavCommentaire, SavTicket } from "@/lib/types";

export default function SavPage() {
  const [colonnes, setColonnes] = useState<SavColonne[]>([]);
  const [champs, setChamps] = useState<SavChampPerso[]>([]);
  const [tickets, setTickets] = useState<SavTicket[]>([]);
  const [chargement, setChargement] = useState(true);
  const [peutConfigurer, setPeutConfigurer] = useState(false);

  const [ticketOuvert, setTicketOuvert] = useState<SavTicket | "nouveau" | null>(null);
  const [commentairesOuvert, setCommentairesOuvert] = useState<SavCommentaire[]>([]);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);

  const [carteEnGlisse, setCarteEnGlisse] = useState<string | null>(null);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    const [colRes, champsRes, ticketsRes, meRes] = await Promise.all([
      fetch("/api/sav/colonnes"),
      fetch("/api/sav/champs"),
      fetch("/api/sav/tickets"),
      fetch("/api/me"),
    ]);
    const [colJson, champsJson, ticketsJson, meJson] = await Promise.all([
      colRes.json(),
      champsRes.json(),
      ticketsRes.json(),
      meRes.json(),
    ]);
    if (colRes.ok) setColonnes(colJson.colonnes);
    if (champsRes.ok) setChamps(champsJson.champs);
    if (ticketsRes.ok) setTickets(ticketsJson.tickets);
    if (meRes.ok) setPeutConfigurer(meJson.role === "admin" || meJson.role === "dev");
    setChargement(false);
  }

  async function ouvrirTicket(ticket: SavTicket) {
    setTicketOuvert(ticket);
    setCommentairesOuvert([]);
    const res = await fetch(`/api/sav/tickets/${ticket.id}`);
    const json = await res.json();
    if (res.ok) {
      setTicketOuvert(json.ticket);
      setCommentairesOuvert(json.commentaires ?? []);
    }
  }

  function fermerModale() {
    setTicketOuvert(null);
    setCommentairesOuvert([]);
  }

  function ticketsDeColonne(colonneId: string) {
    return tickets.filter((t) => t.colonne_id === colonneId).sort((a, b) => a.ordre - b.ordre);
  }

  async function deposerSur(colonneDestId: string, indexDest: number | null) {
    if (!carteEnGlisse) return;
    const ticket = tickets.find((t) => t.id === carteEnGlisse);
    if (!ticket) return;
    setCarteEnGlisse(null);

    const colonneSourceId = ticket.colonne_id;

    // Nouvelle liste ordonnée de la colonne de destination, avec le ticket
    // glissé inséré à la position visée (à la fin si aucune carte cible).
    const destActuelle = ticketsDeColonne(colonneDestId).filter((t) => t.id !== ticket.id);
    const position = indexDest === null ? destActuelle.length : indexDest;
    const nouvelleDest = [...destActuelle.slice(0, position), ticket, ...destActuelle.slice(position)];

    const updates: { id: string; colonneId: string; ordre: number }[] = nouvelleDest.map((t, i) => ({
      id: t.id,
      colonneId: colonneDestId,
      ordre: i,
    }));

    // Si on change de colonne, il faut aussi réindexer l'ancienne colonne
    // pour ne pas laisser de trou dans l'ordre.
    if (colonneSourceId !== colonneDestId) {
      const sourceRestante = ticketsDeColonne(colonneSourceId).filter((t) => t.id !== ticket.id);
      updates.push(...sourceRestante.map((t, i) => ({ id: t.id, colonneId: colonneSourceId, ordre: i })));
    }

    // Mise à jour optimiste de l'affichage, puis on envoie au serveur.
    setTickets((prev) =>
      prev.map((t) => {
        const maj = updates.find((u) => u.id === t.id);
        return maj ? { ...t, colonne_id: maj.colonneId, ordre: maj.ordre } : t;
      })
    );

    await fetch("/api/sav/tickets/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-but-dark">SAV</h1>
          <p className="mt-1 text-sm text-but-gray">
            Tickets clients — glisse une carte pour changer son statut. Un ticket ici ne remplace jamais la
            demande à faire sur Ylios.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {peutConfigurer && (
            <Button variant="outline" onClick={() => setReglagesOuverts(true)}>
              <IconSettings className="h-4 w-4" />
              Réglages
            </Button>
          )}
          <Button onClick={() => setTicketOuvert("nouveau")}>
            <IconPlus className="h-4 w-4" />
            Nouveau ticket
          </Button>
        </div>
      </div>

      {chargement ? (
        <div className="flex items-center gap-2 text-sm text-but-gray">
          <Spinner className="h-4 w-4" />
          Chargement...
        </div>
      ) : colonnes.length === 0 ? (
        <Card>
          <p className="text-sm text-but-gray">
            Aucune colonne configurée.{" "}
            {peutConfigurer ? "Ouvre les réglages pour en créer." : "Demande à un admin de configurer le tableau."}
          </p>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {colonnes.map((colonne) => {
            const ticketsColonne = ticketsDeColonne(colonne.id);
            return (
              <div
                key={colonne.id}
                className="flex w-72 shrink-0 flex-col rounded-2xl bg-but-gray-light/60 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  deposerSur(colonne.id, null);
                }}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-but-dark">{colonne.nom}</h2>
                  <Badge tone="gray">{ticketsColonne.length}</Badge>
                </div>

                <div className="flex flex-col gap-2">
                  {ticketsColonne.map((ticket) => (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={() => setCarteEnGlisse(ticket.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deposerSur(colonne.id, ticketsColonne.indexOf(ticket));
                      }}
                      onClick={() => ouvrirTicket(ticket)}
                    >
                      <Card hover className="cursor-grab p-3 active:cursor-grabbing">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-but-gray">#{ticket.numero}</span>
                          {ticket.ylios_fait && (
                            <span title="Fait sur Ylios">
                              <IconCheck className="h-3.5 w-3.5 text-green-600" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-but-dark">
                          {ticket.client_prenom} {ticket.client_nom}
                        </p>
                        <p className="text-xs text-but-gray">{ticket.produit_nom}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge tone={ticket.categorie === "autre" ? "gray" : "red"}>
                            {ticket.categorie === "meuble"
                              ? "Meuble"
                              : ticket.categorie === "electromenager"
                                ? "Électroménager"
                                : "Autre"}
                          </Badge>
                          {(ticket.nb_commentaires ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs text-but-gray">
                              <IconMessage className="h-3.5 w-3.5" />
                              {ticket.nb_commentaires}
                            </span>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))}
                  {ticketsColonne.length === 0 && (
                    <p className="px-1 py-2 text-center text-xs text-but-gray">Aucun ticket</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ticketOuvert && (
        <TicketModal
          key={ticketOuvert === "nouveau" ? "nouveau" : `${ticketOuvert.id}-${commentairesOuvert.length}`}
          colonnes={colonnes}
          champs={champs}
          ticket={ticketOuvert === "nouveau" ? null : ticketOuvert}
          commentaires={commentairesOuvert}
          peutSupprimer={peutConfigurer}
          onClose={fermerModale}
          onSaved={() => {
            fermerModale();
            charger();
          }}
          onDeleted={() => {
            fermerModale();
            charger();
          }}
        />
      )}
      {reglagesOuverts && (
        <ReglagesSavModal
          colonnes={colonnes}
          champs={champs}
          onClose={() => setReglagesOuverts(false)}
          onChange={charger}
        />
      )}
    </div>
  );
}
