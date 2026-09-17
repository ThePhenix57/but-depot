"use client";

import { useEffect, useState } from "react";
import type { EmplacementAVerifier } from "@/lib/types";
import { IconCheck } from "@/components/icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

function ilYA(dateIso: string) {
  const jours = Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 3600 * 24));
  if (jours < 31) return `il y a ${jours} j`;
  const mois = Math.floor(jours / 30);
  return `il y a ${mois} mois`;
}

// Liste les emplacements (produit + alvéole) en place depuis plus d'un mois
// sans confirmation — le site n'étant pas connecté en direct au stock réel
// (PDA/gun), un produit peut avoir disparu sans que ça se voie ici. Tout
// employé peut aller vérifier physiquement puis cocher "toujours là", ce
// qui remet le compteur à zéro et le journalise (voir /admin/journal).
export default function VerificationsPage() {
  const [liste, setListe] = useState<EmplacementAVerifier[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [confirmes, setConfirmes] = useState<Set<string>>(new Set());

  useEffect(() => {
    charger();
  }, []);

  function charger() {
    setErreur(null);
    fetch("/api/verifications")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setErreur(json.error);
        else setListe(json.emplacements);
      })
      .catch(() => setErreur("Impossible de charger la liste."));
  }

  async function confirmer(id: string) {
    setEnCours(id);
    try {
      const res = await fetch(`/api/verifications/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.error) {
        setErreur(json.error);
        return;
      }
      setConfirmes((prev) => new Set(prev).add(id));
    } catch {
      setErreur("Impossible d'enregistrer la vérification.");
    } finally {
      setEnCours(null);
    }
  }

  const aTraiter = (liste ?? []).filter((e) => !confirmes.has(e.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Vérifications</h1>
      <p className="mb-5 text-sm text-but-gray">
        Ce site n&apos;est pas connecté en direct au stock réel (PDA/gun) : un
        client a pu prendre le dernier colis sans que ça se voie ici. Les
        emplacements ci-dessous n&apos;ont pas été confirmés depuis plus d&apos;un
        mois — va vérifier physiquement, puis coche &laquo;&nbsp;toujours
        là&nbsp;&raquo; (ou vide l&apos;alvéole depuis le plan si le produit n&apos;y
        est plus).
      </p>

      {erreur && (
        <p className="mb-4 rounded-xl border border-but-red/20 bg-but-red-light p-3 text-sm text-but-red-dark">
          {erreur}
        </p>
      )}

      {liste === null && !erreur && (
        <div className="flex items-center gap-2 text-sm text-but-gray">
          <Spinner className="h-4 w-4" />
          Chargement...
        </div>
      )}

      {liste !== null && aTraiter.length === 0 && (
        <Card className="border-green-200 bg-green-50 text-sm text-green-800">
          Rien à vérifier pour le moment : tous les emplacements ont été
          confirmés il y a moins d&apos;un mois.
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {aTraiter.map((e) => (
          <Card key={e.id} noPadding className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-but-dark">{e.product?.name ?? "—"}</p>
              <p className="text-xs text-but-gray">
                {e.colis} colis — alvéole {e.alveole?.code ?? "—"}
                {e.alveole?.zone && ` (${e.alveole.zone.label || e.alveole.zone.code})`}
                {e.product?.ean ? ` — EAN ${e.product.ean}` : ""}
              </p>
              <p className="text-xs text-but-gray">
                Dernière vérification {ilYA(e.verifie_at)}
              </p>
            </div>
            <Button size="sm" onClick={() => confirmer(e.id)} loading={enCours === e.id} className="shrink-0">
              <IconCheck className="h-4 w-4" />
              Toujours là
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
