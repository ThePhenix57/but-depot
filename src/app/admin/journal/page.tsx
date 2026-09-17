"use client";

import { useEffect, useState } from "react";
import type { JournalResetBackup, Mouvement, TypeMouvement } from "@/lib/types";
import { PALETTE_TYPES } from "@/lib/palettes";
import { TYPES_MOUVEMENT } from "@/lib/mouvementType";
import BarcodeSvg from "@/components/BarcodeSvg";
import QrCodeSvg from "@/components/QrCodeSvg";
import { contenuQrAlveole } from "@/lib/qr";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { IconAlertTriangle } from "@/components/icons";

// Journal — historique global (rangements, sorties/vidages, vérifications,
// signalements). Réservé aux admins (voir /admin/layout.tsx pour le
// contrôle d'accès, et la policy RLS "mouvements_select_admin" côté base
// pour la même règle côté serveur).
export default function JournalAdminPage() {
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [codesOuverts, setCodesOuverts] = useState<Set<string>>(new Set());
  const [prefixeQr, setPrefixeQr] = useState("");

  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [ean, setEan] = useState("");
  const [type, setType] = useState<TypeMouvement | "">("");

  // Zone sensible : code admin + réinitialisation + sauvegardes.
  const [codeDefini, setCodeDefini] = useState<boolean | null>(null);
  const [messageSensible, setMessageSensible] = useState<string | null>(null);

  const [afficherDefinirCode, setAfficherDefinirCode] = useState(false);
  const [afficherChangerCode, setAfficherChangerCode] = useState(false);
  const [codeActuelSaisi, setCodeActuelSaisi] = useState("");
  const [nouveauCodeSaisi, setNouveauCodeSaisi] = useState("");
  const [nouveauCodeConfirm, setNouveauCodeConfirm] = useState("");

  const [afficherReset, setAfficherReset] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetMotif, setResetMotif] = useState("");
  const [resetEnCours, setResetEnCours] = useState(false);

  const [afficherBackups, setAfficherBackups] = useState(false);
  const [backupsCode, setBackupsCode] = useState("");
  const [backups, setBackups] = useState<JournalResetBackup[] | null>(null);
  const [backupsOuverts, setBackupsOuverts] = useState<Set<string>>(new Set());

  useEffect(() => {
    charger();
    chargerStatutCode();
    fetch("/api/parametres")
      .then((res) => res.json())
      .then((json) => json.parametres && setPrefixeQr(json.parametres.qr_prefixe_alveole ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function charger() {
    setChargement(true);
    setErreur(null);
    const params = new URLSearchParams();
    if (du) params.set("from", du);
    if (au) params.set("to", au);
    if (ean.trim()) params.set("ean", ean.trim());
    if (type) params.set("type", type);
    const res = await fetch(`/api/mouvements?${params}`);
    const json = await res.json();
    setChargement(false);
    if (!res.ok) {
      setErreur(json.error || "Erreur lors du chargement.");
      return;
    }
    setMouvements(json.mouvements);
  }

  function reinitialiserFiltres() {
    setDu("");
    setAu("");
    setEan("");
    setType("");
    setTimeout(charger, 0);
  }

  function toggleCodes(id: string) {
    setCodesOuverts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function chargerStatutCode() {
    const res = await fetch("/api/admin/code-journal");
    const json = await res.json();
    if (res.ok) setCodeDefini(json.defini);
  }

  async function definirCode(e: React.FormEvent) {
    e.preventDefault();
    setMessageSensible(null);
    if (nouveauCodeSaisi !== nouveauCodeConfirm) {
      setMessageSensible("Les deux codes ne correspondent pas.");
      return;
    }
    const res = await fetch("/api/admin/code-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nouveauCode: nouveauCodeSaisi }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessageSensible(json.error);
      return;
    }
    setMessageSensible("Code défini.");
    setNouveauCodeSaisi("");
    setNouveauCodeConfirm("");
    setAfficherDefinirCode(false);
    setCodeDefini(true);
  }

  async function changerCode(e: React.FormEvent) {
    e.preventDefault();
    setMessageSensible(null);
    if (nouveauCodeSaisi !== nouveauCodeConfirm) {
      setMessageSensible("Les deux nouveaux codes ne correspondent pas.");
      return;
    }
    const res = await fetch("/api/admin/code-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codeActuel: codeActuelSaisi, nouveauCode: nouveauCodeSaisi }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessageSensible(json.error);
      return;
    }
    setMessageSensible("Code changé.");
    setCodeActuelSaisi("");
    setNouveauCodeSaisi("");
    setNouveauCodeConfirm("");
    setAfficherChangerCode(false);
  }

  async function confirmerReset(e: React.FormEvent) {
    e.preventDefault();
    setMessageSensible(null);
    setResetEnCours(true);
    const res = await fetch("/api/mouvements/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: resetCode, motif: resetMotif }),
    });
    const json = await res.json();
    setResetEnCours(false);
    if (!res.ok) {
      setMessageSensible(json.error);
      return;
    }
    setAfficherReset(false);
    setResetCode("");
    setResetMotif("");
    setMessageSensible(`Journal réinitialisé (${json.nbLignes} ligne(s) supprimée(s), sauvegardées).`);
    charger();
  }

  async function consulterBackups(e: React.FormEvent) {
    e.preventDefault();
    setMessageSensible(null);
    const res = await fetch("/api/mouvements/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: backupsCode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessageSensible(json.error);
      return;
    }
    setBackups(json.backups);
  }

  function toggleBackup(id: string) {
    setBackupsOuverts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fermerBackups() {
    setAfficherBackups(false);
    setBackupsCode("");
    setBackups(null);
    setBackupsOuverts(new Set());
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Journal des rangements</h1>
      <p className="mb-6 text-sm text-but-gray">
        Qui a rangé quel produit, où, et quand. Le plus récent en premier.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          charger();
        }}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-card"
      >
        <label className="flex flex-col text-xs font-semibold text-but-gray">
          Du
          <input
            type="date"
            value={du}
            onChange={(e) => setDu(e.target.value)}
            className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-but-gray">
          Au
          <input
            type="date"
            value={au}
            onChange={(e) => setAu(e.target.value)}
            className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
          />
        </label>
        <label className="flex flex-1 min-w-[12rem] flex-col text-xs font-semibold text-but-gray">
          Code EAN (5 derniers chiffres, ex. 42569)
          <input
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            placeholder="ex: 42569"
            className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-but-gray">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeMouvement | "")}
            className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-but-red focus:outline-none"
          >
            <option value="">Tous</option>
            {(Object.keys(TYPES_MOUVEMENT) as TypeMouvement[]).map((t) => (
              <option key={t} value={t}>
                {TYPES_MOUVEMENT[t].label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Filtrer</Button>
        <Button type="button" variant="outline" onClick={reinitialiserFiltres}>
          Réinitialiser les filtres
        </Button>
      </form>

      {erreur && (
        <p className="mb-4 rounded-xl border border-but-red/20 bg-but-red-light px-3 py-2 text-sm text-but-red-dark">
          {erreur}
        </p>
      )}
      {chargement && (
        <div className="flex items-center gap-2 text-sm text-but-gray">
          <Spinner className="h-4 w-4" />
          Chargement...
        </div>
      )}

      {!chargement && mouvements.length === 0 && !erreur && (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-but-gray">
          Aucun rangement trouvé pour ces filtres.
        </p>
      )}

      {mouvements.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[72rem] text-sm">
            <thead className="bg-but-gray-light text-left">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">Date</th>
                <th className="whitespace-nowrap px-3 py-2">Type</th>
                <th className="whitespace-nowrap px-3 py-2">EAN</th>
                <th className="min-w-[10rem] px-3 py-2">Produit</th>
                <th className="min-w-[9rem] px-3 py-2">Emplacement</th>
                <th className="whitespace-nowrap px-3 py-2">Colis</th>
                <th className="min-w-[11rem] px-3 py-2">Détail</th>
                <th className="min-w-[8rem] px-3 py-2">Par</th>
                <th className="whitespace-nowrap px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => (
                <>
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${TYPES_MOUVEMENT[m.type].classe}`}
                      >
                        {TYPES_MOUVEMENT[m.type].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{m.product?.ean ?? "—"}</td>
                    <td className="px-3 py-2">{m.product?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      {m.alveole?.code ?? "—"}
                      {m.alveole?.zone && (
                        <span className="text-but-gray"> ({m.alveole.zone.label || m.alveole.zone.code})</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{m.colis ?? "—"}</td>
                    <td className="px-3 py-2 text-but-gray">
                      {m.message ?? (m.type_palette ? PALETTE_TYPES[m.type_palette].label : "—")}
                    </td>
                    <td className="px-3 py-2">{m.auteur?.full_name || m.auteur?.email || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {m.product?.ean && m.alveole?.code && (
                        <button
                          onClick={() => toggleCodes(m.id)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-but-dark hover:border-but-red hover:text-but-red"
                        >
                          {codesOuverts.has(m.id) ? "Masquer les codes" : "Voir les codes"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {codesOuverts.has(m.id) && m.product?.ean && m.alveole?.code && (
                    <tr className="border-t border-gray-100 bg-but-gray-light/50">
                      <td colSpan={9} className="px-3 py-4">
                        <div className="flex flex-wrap gap-8">
                          <div>
                            <p className="mb-1 text-xs font-semibold text-but-gray">
                              Code-barres produit ({m.product.ean})
                            </p>
                            <BarcodeSvg value={m.product.ean} height={50} />
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold text-but-gray">
                              QR code alvéole ({m.alveole.code})
                            </p>
                            <QrCodeSvg value={contenuQrAlveole(m.alveole.code, prefixeQr)} size={110} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-but-red/30 bg-but-red-light p-4">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-but-red-dark">
          <IconAlertTriangle className="h-5 w-5" />
          Zone sensible
        </h2>
        <p className="mb-3 text-sm text-but-gray">
          Vider tout le journal (par exemple en fin de saison) et consulter
          les sauvegardes des réinitialisations précédentes — protégé par un
          code admin.
        </p>

        {messageSensible && (
          <p className="mb-3 rounded-lg bg-white px-3 py-2 text-sm text-but-dark">{messageSensible}</p>
        )}

        {codeDefini === null && (
          <div className="flex items-center gap-2 text-sm text-but-gray">
            <Spinner className="h-4 w-4" />
            Chargement...
          </div>
        )}

        {codeDefini === false && (
          <div>
            {!afficherDefinirCode ? (
              <Button variant="secondary" onClick={() => setAfficherDefinirCode(true)}>
                Définir le code admin
              </Button>
            ) : (
              <form onSubmit={definirCode} className="flex flex-col gap-2 sm:max-w-sm">
                <input
                  type="password"
                  required
                  minLength={4}
                  value={nouveauCodeSaisi}
                  onChange={(e) => setNouveauCodeSaisi(e.target.value)}
                  placeholder="Nouveau code (4 caractères min.)"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
                />
                <input
                  type="password"
                  required
                  value={nouveauCodeConfirm}
                  onChange={(e) => setNouveauCodeConfirm(e.target.value)}
                  placeholder="Confirme le code"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="secondary">
                    Enregistrer
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setAfficherDefinirCode(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {codeDefini === true && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAfficherReset(true)}>
              Réinitialiser le journal (tout supprimer)
            </Button>
            <Button variant="outline" onClick={() => setAfficherBackups(true)}>
              Voir les sauvegardes
            </Button>
            <Button variant="ghost" onClick={() => setAfficherChangerCode((v) => !v)}>
              Changer le code
            </Button>
          </div>
        )}

        {afficherChangerCode && (
          <form onSubmit={changerCode} className="mt-3 flex flex-col gap-2 sm:max-w-sm">
            <input
              type="password"
              required
              value={codeActuelSaisi}
              onChange={(e) => setCodeActuelSaisi(e.target.value)}
              placeholder="Code actuel"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={4}
              value={nouveauCodeSaisi}
              onChange={(e) => setNouveauCodeSaisi(e.target.value)}
              placeholder="Nouveau code (4 caractères min.)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <input
              type="password"
              required
              value={nouveauCodeConfirm}
              onChange={(e) => setNouveauCodeConfirm(e.target.value)}
              placeholder="Confirme le nouveau code"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                Changer
              </Button>
              <Button type="button" variant="outline" onClick={() => setAfficherChangerCode(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>

      {afficherReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAfficherReset(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-but-red-dark">
              <IconAlertTriangle className="h-5 w-5" />
              Vider tout le journal
            </h3>
            <p className="mb-4 text-sm text-but-gray">
              Ceci supprime définitivement TOUTES les lignes du journal des
              rangements ({mouvements.length} ligne(s) actuellement affichée(s),
              potentiellement plus au total). Une sauvegarde complète est
              gardée et consultable avec le code admin. Le journal se réinitialise
              aussi tout seul chaque semaine (lundi, heure de Paris) — inutile de
              le faire manuellement chaque semaine, ce bouton sert surtout pour
              une remise à zéro exceptionnelle.
            </p>
            <form onSubmit={confirmerReset} className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-but-gray">
                Raison de cette réinitialisation
                <textarea
                  required
                  value={resetMotif}
                  onChange={(e) => setResetMotif(e.target.value)}
                  placeholder="ex: fin de saison, remise à zéro annuelle..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
                  rows={2}
                />
              </label>
              <label className="text-xs font-semibold text-but-gray">
                Code admin
                <input
                  type="password"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
                />
              </label>
              <div className="mt-2 flex gap-2">
                <Button type="submit" loading={resetEnCours}>
                  Confirmer la suppression définitive
                </Button>
                <Button type="button" variant="outline" onClick={() => setAfficherReset(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {afficherBackups && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={fermerBackups}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-bold tracking-tight text-but-dark">Sauvegardes des réinitialisations</h3>

            {backups === null ? (
              <form onSubmit={consulterBackups} className="flex flex-col gap-2 sm:max-w-sm">
                <label className="text-xs font-semibold text-but-gray">
                  Code admin
                  <input
                    type="password"
                    required
                    value={backupsCode}
                    onChange={(e) => setBackupsCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
                  />
                </label>
                <div className="mt-2 flex gap-2">
                  <Button type="submit" variant="secondary">
                    Valider
                  </Button>
                  <Button type="button" variant="outline" onClick={fermerBackups}>
                    Annuler
                  </Button>
                </div>
              </form>
            ) : backups.length === 0 ? (
              <p className="text-sm text-but-gray">Aucune réinitialisation n&apos;a encore eu lieu.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {backups.map((b) => (
                  <div key={b.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-semibold">
                          {new Date(b.created_at).toLocaleString("fr-FR")}
                        </span>{" "}
                        — par {b.auteur?.full_name || b.auteur?.email || "—"} —{" "}
                        {b.nb_lignes} ligne(s)
                        <p className="text-but-gray">Raison : {b.motif || "—"}</p>
                      </div>
                      <button
                        onClick={() => toggleBackup(b.id)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold hover:border-but-red hover:text-but-red"
                      >
                        {backupsOuverts.has(b.id) ? "Masquer le détail" : "Voir le détail"}
                      </button>
                    </div>
                    {backupsOuverts.has(b.id) && (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-gray-100">
                        <table className="w-full text-xs">
                          <thead className="bg-but-gray-light text-left">
                            <tr>
                              <th className="px-2 py-1">Date</th>
                              <th className="px-2 py-1">EAN</th>
                              <th className="px-2 py-1">Produit</th>
                              <th className="px-2 py-1">Emplacement</th>
                              <th className="px-2 py-1">Colis</th>
                              <th className="px-2 py-1">Par</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.contenu.map((m) => (
                              <tr key={m.id} className="border-t border-gray-100">
                                <td className="px-2 py-1 whitespace-nowrap">
                                  {new Date(m.created_at).toLocaleString("fr-FR")}
                                </td>
                                <td className="px-2 py-1 font-mono">{m.product?.ean ?? "—"}</td>
                                <td className="px-2 py-1">{m.product?.name ?? "—"}</td>
                                <td className="px-2 py-1">{m.alveole?.code ?? "—"}</td>
                                <td className="px-2 py-1">{m.colis}</td>
                                <td className="px-2 py-1">
                                  {m.auteur?.full_name || m.auteur?.email || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={fermerBackups} className="self-start">
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
