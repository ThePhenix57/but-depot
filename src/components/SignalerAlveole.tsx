"use client";

import { useState } from "react";
import type { Alveole, Zone } from "@/lib/types";
import Button from "@/components/ui/Button";
import { IconAlertTriangle } from "@/components/icons";

interface Props {
  alveoles: Alveole[];
  zones: Zone[];
  onSignale?: () => void;
}

const DUREES = [
  { label: "24 heures", hours: 24 },
  { label: "3 jours", hours: 72 },
  { label: "7 jours", hours: 168 },
  { label: "Ne disparaît jamais seule", hours: null },
];

// Formulaire pour signaler un problème sur une alvéole (ex: lisse cassée).
// Visible à tout employé. La note disparaît automatiquement après le délai
// choisi ; le blocage réel de l'alvéole reste une action séparée réservée à
// l'admin (voir /admin/signalements).
export default function SignalerAlveole({ alveoles, zones, onSignale }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [alveoleId, setAlveoleId] = useState("");
  const [message, setMessage] = useState("");
  const [duree, setDuree] = useState<number | null>(72);
  const [statut, setStatut] = useState<string | null>(null);

  function zoneLabel(zoneId: string) {
    const z = zones.find((z) => z.id === zoneId);
    return z ? z.label || z.code : "?";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!alveoleId || !message.trim()) return;
    const res = await fetch("/api/signalements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alveoleId, message: message.trim(), expiresInHours: duree }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatut(json.error || "Erreur lors de l'envoi.");
      return;
    }
    setStatut("Signalement envoyé — un admin peut désormais bloquer l'alvéole si besoin.");
    setMessage("");
    setAlveoleId("");
    onSignale?.();
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="flex items-center gap-1.5 text-sm font-semibold text-but-red hover:underline"
      >
        <IconAlertTriangle className="h-4 w-4" />
        Signaler un problème sur une alvéole
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-but-red/30 bg-but-red-light p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-bold text-but-red-dark">
          <IconAlertTriangle className="h-4 w-4" />
          Signaler un problème
        </h3>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-but-gray hover:underline"
        >
          Fermer
        </button>
      </div>

      {statut && <p className="mb-2 rounded-lg bg-white px-3 py-2 text-sm text-but-dark">{statut}</p>}

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          required
          value={alveoleId}
          onChange={(e) => setAlveoleId(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none sm:col-span-1"
        >
          <option value="">Alvéole concernée...</option>
          {alveoles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} ({zoneLabel(a.zone_id)})
            </option>
          ))}
        </select>
        <input
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex: lisse cassée"
          className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none sm:col-span-1"
        />
        <select
          value={duree ?? ""}
          onChange={(e) => setDuree(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-but-red focus:outline-none sm:col-span-1"
        >
          {DUREES.map((d) => (
            <option key={d.label} value={d.hours ?? ""}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="mt-3">
        Envoyer le signalement
      </Button>
    </form>
  );
}
