"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { IconClose, IconSearch, IconAlertTriangle, IconTrash } from "@/components/icons";
import type { SavChampPerso, SavColonne, SavCommentaire, SavTicket, SavCategorieProduit } from "@/lib/types";

interface Props {
  colonnes: SavColonne[];
  champs: SavChampPerso[];
  /** null = création d'un nouveau ticket ; sinon édition de ce ticket. */
  ticket: SavTicket | null;
  commentaires: SavCommentaire[];
  peutSupprimer: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

interface ValeurChamp {
  valeurBool?: boolean;
  valeurTexte?: string;
}

const LABEL_CATEGORIE: Record<SavCategorieProduit, string> = {
  meuble: "Meuble",
  electromenager: "Électroménager",
  autre: "Autre",
};

// Formulaire de création OU fiche d'édition d'un ticket SAV (même
// composant pour les deux, la seule différence est si `ticket` est fourni)
// — champs client/produit, cases à cocher personnalisées selon la
// catégorie de produit, rappel Ylios, et pour l'édition le fil de
// commentaires + le déplacement de colonne.
export default function TicketModal({
  colonnes,
  champs,
  ticket,
  commentaires,
  peutSupprimer,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const edition = !!ticket;

  const [clientNom, setClientNom] = useState(ticket?.client_nom ?? "");
  const [clientPrenom, setClientPrenom] = useState(ticket?.client_prenom ?? "");
  const [numeroFacture, setNumeroFacture] = useState(ticket?.numero_facture ?? "");
  const [produitNom, setProduitNom] = useState(ticket?.produit_nom ?? "");
  const [produitRef, setProduitRef] = useState(ticket?.produit_ref ?? "");
  const [produitEan, setProduitEan] = useState(ticket?.produit_ean ?? "");
  const [produitId, setProduitId] = useState<string | null>(ticket?.produit_id ?? null);
  const [categorie, setCategorie] = useState<SavCategorieProduit>(ticket?.categorie ?? "autre");
  const [commentaire, setCommentaire] = useState(ticket?.commentaire ?? "");
  const [colonneId, setColonneId] = useState(ticket?.colonne_id ?? colonnes[0]?.id ?? "");
  const [ylioFait, setYlioFait] = useState(ticket?.ylios_fait ?? false);

  const [recherche, setRecherche] = useState(false);
  const [messageRecherche, setMessageRecherche] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const valeursInitiales: Record<string, ValeurChamp> = {};
  for (const c of ticket?.champs ?? []) {
    valeursInitiales[c.champ_id] = { valeurBool: c.valeur_bool ?? undefined, valeurTexte: c.valeur_texte ?? undefined };
  }
  const [valeursChamps, setValeursChamps] = useState<Record<string, ValeurChamp>>(valeursInitiales);

  const [nouveauCommentaire, setNouveauCommentaire] = useState("");
  const [commentaires_, setCommentaires] = useState(commentaires);
  const [envoiCommentaire, setEnvoiCommentaire] = useState(false);

  const champsVisibles = champs.filter((c) => c.categorie === null || c.categorie === categorie);

  async function chercherParEan() {
    if (!produitEan.trim()) return;
    setRecherche(true);
    setMessageRecherche(null);
    try {
      const res = await fetch(`/api/produits/recherche?ean=${encodeURIComponent(produitEan.trim())}`);
      const json = await res.json();
      if (!res.ok || !json.found || json.found === "multiple") {
        setMessageRecherche(
          json.found === "multiple"
            ? "Plusieurs produits correspondent — tape l'EAN complet."
            : "Aucun produit trouvé dans la base — renseigne le nom à la main."
        );
        return;
      }
      setProduitNom(json.product.name);
      setProduitId(json.product.id);
      setMessageRecherche(`Produit trouvé : ${json.product.name}.`);
    } finally {
      setRecherche(false);
    }
  }

  function updateValeurChamp(champId: string, patch: ValeurChamp) {
    setValeursChamps((prev) => ({ ...prev, [champId]: { ...prev[champId], ...patch } }));
  }

  function champsPourEnvoi() {
    return champsVisibles.map((c) => ({
      champId: c.id,
      valeurBool: c.type === "checkbox" ? !!valeursChamps[c.id]?.valeurBool : undefined,
      valeurTexte: c.type === "texte" ? valeursChamps[c.id]?.valeurTexte ?? "" : undefined,
    }));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!clientNom.trim() || !clientPrenom.trim() || !produitNom.trim()) {
      setErreur("Nom client, prénom client et produit sont obligatoires.");
      return;
    }
    setEnregistrement(true);
    try {
      const payload = {
        clientNom,
        clientPrenom,
        numeroFacture: numeroFacture || null,
        produitId,
        produitNom,
        produitRef: produitRef || null,
        produitEan: produitEan || null,
        categorie,
        commentaire: commentaire || null,
        colonneId,
        ylios_fait: ylioFait,
        champs: champsPourEnvoi(),
      };
      const res = await fetch(edition ? `/api/sav/tickets/${ticket!.id}` : "/api/sav/tickets", {
        method: edition ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error || "Erreur lors de l'enregistrement.");
        return;
      }
      onSaved();
    } finally {
      setEnregistrement(false);
    }
  }

  async function envoyerCommentaire() {
    if (!ticket || !nouveauCommentaire.trim()) return;
    setEnvoiCommentaire(true);
    try {
      const res = await fetch(`/api/sav/tickets/${ticket.id}/commentaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: nouveauCommentaire.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setCommentaires((prev) => [...prev, json.commentaire]);
        setNouveauCommentaire("");
      }
    } finally {
      setEnvoiCommentaire(false);
    }
  }

  async function supprimer() {
    if (!ticket) return;
    if (!confirm(`Supprimer définitivement le ticket SAV #${ticket.numero} ?`)) return;
    const res = await fetch(`/api/sav/tickets/${ticket.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-but-dark">
            {edition ? `Ticket SAV #${ticket!.numero}` : "Nouveau ticket SAV"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-but-gray hover:bg-but-gray-light">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-start gap-2 border-b border-gray-100 bg-but-red-light px-5 py-3">
          <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-but-red" />
          <p className="text-xs text-but-dark">
            N&apos;oublie pas de faire la demande sur <strong>Ylios</strong> (site SAV interne BUT) en plus de ce
            ticket — ce site ne s&apos;y substitue pas.
          </p>
          <label className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold text-but-dark">
            <input
              type="checkbox"
              checked={ylioFait}
              onChange={(e) => setYlioFait(e.target.checked)}
              className="h-4 w-4 accent-but-red"
            />
            Fait sur Ylios
          </label>
        </div>

        <form onSubmit={enregistrer} className="space-y-4 px-5 py-4">
          {erreur && <p className="rounded-lg bg-but-red-light px-3 py-2 text-sm text-but-red-dark">{erreur}</p>}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col text-xs font-semibold text-but-gray">
              Nom client
              <input
                required
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
              />
            </label>
            <label className="flex flex-col text-xs font-semibold text-but-gray">
              Prénom client
              <input
                required
                value={clientPrenom}
                onChange={(e) => setClientPrenom(e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
              />
            </label>
          </div>

          <label className="flex flex-col text-xs font-semibold text-but-gray">
            N° facture ou ticket
            <input
              value={numeroFacture}
              onChange={(e) => setNumeroFacture(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
            />
          </label>

          <div className="rounded-xl border border-gray-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-but-gray">Produit</p>
            <div className="mb-2 flex gap-2">
              <input
                value={produitEan}
                onChange={(e) => setProduitEan(e.target.value)}
                placeholder="Code EAN (facultatif)"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
              />
              <Button type="button" variant="outline" size="sm" loading={recherche} onClick={chercherParEan}>
                <IconSearch className="h-3.5 w-3.5" />
                Chercher
              </Button>
            </div>
            {messageRecherche && <p className="mb-2 text-xs text-but-gray">{messageRecherche}</p>}
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 flex flex-col text-xs font-semibold text-but-gray">
                Nom du produit
                <input
                  required
                  value={produitNom}
                  onChange={(e) => setProduitNom(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
                />
              </label>
              <label className="flex flex-col text-xs font-semibold text-but-gray">
                Référence produit
                <input
                  value={produitRef}
                  onChange={(e) => setProduitRef(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
                />
              </label>
              <label className="flex flex-col text-xs font-semibold text-but-gray">
                Type de produit
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as SavCategorieProduit)}
                  className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
                >
                  <option value="autre">Autre</option>
                  <option value="meuble">Meuble</option>
                  <option value="electromenager">Électroménager</option>
                </select>
              </label>
            </div>
          </div>

          {champsVisibles.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-but-gray">
                Présence à la réception ({LABEL_CATEGORIE[categorie]})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {champsVisibles.map((c) =>
                  c.type === "checkbox" ? (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-but-dark">
                      <input
                        type="checkbox"
                        checked={!!valeursChamps[c.id]?.valeurBool}
                        onChange={(e) => updateValeurChamp(c.id, { valeurBool: e.target.checked })}
                        className="h-4 w-4 accent-but-red"
                      />
                      {c.label}
                    </label>
                  ) : (
                    <label key={c.id} className="col-span-2 flex flex-col text-xs font-semibold text-but-gray">
                      {c.label}
                      <input
                        value={valeursChamps[c.id]?.valeurTexte ?? ""}
                        onChange={(e) => updateValeurChamp(c.id, { valeurTexte: e.target.value })}
                        className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
                      />
                    </label>
                  )
                )}
              </div>
            </div>
          )}

          <label className="flex flex-col text-xs font-semibold text-but-gray">
            Commentaire de l&apos;agent SAV
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
            />
          </label>

          <label className="flex flex-col text-xs font-semibold text-but-gray">
            Statut
            <select
              value={colonneId}
              onChange={(e) => setColonneId(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
            >
              {colonnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            {edition && peutSupprimer ? (
              <Button type="button" variant="danger" size="sm" onClick={supprimer}>
                <IconTrash className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={enregistrement}>
              {edition ? "Enregistrer" : "Créer le ticket"}
            </Button>
          </div>
        </form>

        {edition && (
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-but-gray">
              Commentaires ({commentaires_.length})
            </p>
            <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
              {commentaires_.length === 0 && <p className="text-xs text-but-gray">Aucun commentaire pour l&apos;instant.</p>}
              {commentaires_.map((c) => (
                <div key={c.id} className="rounded-lg bg-but-gray-light px-3 py-2 text-sm">
                  <p className="text-but-dark">{c.texte}</p>
                  <p className="mt-1 text-[11px] text-but-gray">
                    {c.auteur?.full_name ?? c.auteur?.email ?? "?"} —{" "}
                    {new Date(c.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={nouveauCommentaire}
                onChange={(e) => setNouveauCommentaire(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    envoyerCommentaire();
                  }
                }}
                placeholder="Ajouter un commentaire..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-but-dark"
              />
              <Button type="button" size="sm" loading={envoiCommentaire} onClick={envoyerCommentaire}>
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
