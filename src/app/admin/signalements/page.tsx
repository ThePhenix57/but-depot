"use client";

import { useEffect, useState } from "react";
import type { Signalement } from "@/lib/types";
import Button from "@/components/ui/Button";
import { IconAlertTriangle } from "@/components/icons";

export default function SignalementsAdminPage() {
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/signalements");
    const json = await res.json();
    if (res.ok) setSignalements(json.signalements);
  }

  async function handleBloquer(s: Signalement) {
    const motif = s.message;
    const res = await fetch(`/api/alveoles/${s.alveole_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bloquee: true, bloquee_motif: motif }),
    });
    if (!res.ok) {
      const json = await res.json();
      setMessage(json.error);
      return;
    }
    // Marque aussi le signalement comme traité puisqu'il vient de mener à un blocage.
    await fetch(`/api/signalements/${s.id}`, { method: "PATCH" });
    setMessage(`Alvéole ${s.alveole?.code} bloquée.`);
    load();
  }

  async function handleTraiter(s: Signalement) {
    const res = await fetch(`/api/signalements/${s.id}`, { method: "PATCH" });
    if (res.ok) {
      setMessage("Signalement marqué comme traité.");
      load();
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Signalements</h1>
      <p className="mb-6 text-sm text-but-gray">
        Problèmes signalés par les employés sur des alvéoles (ex: lisse
        cassée). Bloquer une alvéole la retire immédiatement des choix
        proposés lors d&apos;un rangement, jusqu&apos;à déblocage manuel — voir
        aussi <a href="/admin/alveoles" className="text-but-red underline">Alvéoles</a>.
      </p>

      {message && (
        <p className="mb-4 rounded-xl bg-but-gray-light px-3 py-2 text-sm text-but-dark">{message}</p>
      )}

      {signalements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-but-gray">
          Aucun signalement actif pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {signalements.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-but-red/30 bg-but-red-light p-4"
            >
              <div>
                <p className="flex items-center gap-1.5 font-bold text-but-dark">
                  <IconAlertTriangle className="h-4 w-4 text-but-red" />
                  {s.alveole?.code}{" "}
                  <span className="font-normal text-but-gray">
                    ({s.alveole?.zone?.label || s.alveole?.zone?.code})
                  </span>
                </p>
                <p className="text-sm text-but-dark">{s.message}</p>
                <p className="text-xs text-but-gray">
                  {new Date(s.created_at).toLocaleString("fr-FR")}
                  {s.expires_at &&
                    ` — disparaît le ${new Date(s.expires_at).toLocaleString("fr-FR")}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleBloquer(s)}>
                  Bloquer l&apos;alvéole
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleTraiter(s)}>
                  Ignorer / traité
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
