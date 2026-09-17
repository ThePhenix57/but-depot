"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QrCodeSvg from "@/components/QrCodeSvg";
import EtiquettesZonesSpeciales from "@/components/EtiquettesZonesSpeciales";
import { contenuQrAlveole } from "@/lib/qr";
import { IconPlus, IconTrash, IconPrinter, IconBox } from "@/components/icons";
import type { TypeZoneSpeciale, ZoneSpeciale } from "@/lib/types";

const TYPES: { value: TypeZoneSpeciale; label: string }[] = [
  { value: "tampon", label: "Zone tampon" },
  { value: "drive", label: "Drive" },
  { value: "cam", label: "CAM" },
  { value: "chariot", label: "Chariot" },
  { value: "autre", label: "Autre" },
];

function labelType(type: TypeZoneSpeciale) {
  return TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function ZonesSpecialesAdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneSpeciale[]>([]);
  const [prefixeQr, setPrefixeQr] = useState("");
  const [chargement, setChargement] = useState(true);

  const [type, setType] = useState<TypeZoneSpeciale>("autre");
  const [nom, setNom] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [printZones, setPrintZones] = useState<ZoneSpeciale[] | null>(null);

  useEffect(() => {
    load();
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => json.role && setRole(json.role));
  }, []);

  useEffect(() => {
    if (printZones) {
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [printZones]);

  async function load() {
    setChargement(true);
    const [zonesRes, paramRes] = await Promise.all([
      fetch("/api/zones-speciales"),
      fetch("/api/parametres"),
    ]);
    const zonesJson = await zonesRes.json();
    const paramJson = await paramRes.json();
    if (zonesRes.ok) setZones(zonesJson.zonesSpeciales);
    if (paramRes.ok) setPrefixeQr(paramJson.parametres.qr_prefixe_alveole ?? "");
    setChargement(false);
  }

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!nom.trim() || !identifiant.trim()) {
      setErreur("Le nom et l'identifiant sont obligatoires.");
      return;
    }
    setEnCours(true);
    try {
      const res = await fetch("/api/zones-speciales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, nom: nom.trim(), identifiant: identifiant.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error || "Erreur lors de la création.");
        return;
      }
      setNom("");
      setIdentifiant("");
      setType("autre");
      load();
    } finally {
      setEnCours(false);
    }
  }

  async function handleUpdate(z: ZoneSpeciale, updates: Record<string, unknown>) {
    const res = await fetch(`/api/zones-speciales/${z.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) load();
  }

  async function handleDelete(z: ZoneSpeciale) {
    if (!confirm(`Supprimer la zone spéciale "${z.nom}" ?`)) return;
    const res = await fetch(`/api/zones-speciales/${z.id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const json = await res.json();
      alert(json.error || "Erreur lors de la suppression.");
    }
  }

  function toggleSelection(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function imprimerSelection() {
    const choisies = zones.filter((z) => selection.has(z.id));
    if (choisies.length === 0) return;
    setPrintZones(choisies);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Zones spéciales</h1>
      <p className="mb-6 text-sm text-but-gray">
        Zone tampon, Drive, CAM, chariot... : pas de position sur le plan,
        juste un nom et un identifiant, pour générer un QR code lisible par
        le même lecteur/PDA que les alvéoles (même préfixe, configuré sur{" "}
        <a href="/admin/alveoles" className="font-semibold text-but-red hover:underline">
          la page Alvéoles
        </a>
        ).
      </p>

      <Card className="mb-6">
        <h2 className="mb-3 font-bold text-but-dark">Créer une zone spéciale</h2>
        <form onSubmit={handleCreer} className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr_auto]">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeZoneSpeciale)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom (ex: Chariot 1)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
          />
          <input
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            placeholder="Identifiant (ex: 123)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
          />
          <Button type="submit" loading={enCours}>
            <IconPlus className="h-4 w-4" />
            Créer
          </Button>
        </form>
        {identifiant.trim() && (
          <p className="mt-2 font-mono text-xs text-but-gray">
            Contenu du QR : {contenuQrAlveole(identifiant.trim(), prefixeQr)}
          </p>
        )}
        {erreur && <p className="mt-2 text-sm text-but-red-dark">{erreur}</p>}
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-but-gray">
          {zones.length} zone{zones.length > 1 ? "s" : ""} spéciale{zones.length > 1 ? "s" : ""}
        </p>
        <Button type="button" variant="outline" onClick={imprimerSelection} disabled={selection.size === 0}>
          <IconPrinter className="h-4 w-4" />
          Imprimer les étiquettes sélectionnées ({selection.size})
        </Button>
      </div>

      {chargement && <p className="text-sm text-but-gray">Chargement...</p>}

      {!chargement && zones.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center text-but-gray">
          <IconBox className="h-8 w-8" />
          <p className="text-sm">Aucune zone spéciale pour l&apos;instant.</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((z) => (
          <Card key={z.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selection.has(z.id)}
                  onChange={() => toggleSelection(z.id)}
                  className="h-4 w-4"
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-but-gray">
                  {labelType(z.type)}
                </span>
              </label>
              {role === "admin" && (
                <button
                  type="button"
                  onClick={() => handleDelete(z)}
                  className="text-but-gray hover:text-but-red-dark"
                  title="Supprimer"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <QrCodeSvg value={contenuQrAlveole(z.identifiant, prefixeQr)} size={80} />
              <div className="flex-1">
                <input
                  defaultValue={z.nom}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== z.nom && handleUpdate(z, { nom: e.target.value.trim() })}
                  className="mb-1 w-full rounded border border-gray-200 px-2 py-1 text-sm font-semibold"
                />
                <input
                  defaultValue={z.identifiant}
                  onBlur={(e) =>
                    e.target.value.trim() && e.target.value !== z.identifiant && handleUpdate(z, { identifiant: e.target.value.trim() })
                  }
                  className="w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs"
                />
                <select
                  value={z.type}
                  onChange={(e) => handleUpdate(z, { type: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setPrintZones([z])}>
              <IconPrinter className="h-4 w-4" />
              Imprimer
            </Button>
          </Card>
        ))}
      </div>

      {printZones && <EtiquettesZonesSpeciales zones={printZones} prefixeQr={prefixeQr} />}
    </div>
  );
}
