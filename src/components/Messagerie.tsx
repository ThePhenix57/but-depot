"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChannelType, Message, Profile } from "@/lib/types";
import { IconClose } from "@/components/icons";
import Button from "@/components/ui/Button";

type Onglet = "global" | "admin" | "direct";

interface Props {
  // Mode "compact" : utilisé dans la bulle de messagerie flottante (pas de
  // titre de page, tabs plus petits, occupe toute la hauteur disponible).
  compact?: boolean;
  // Affiche un bouton de fermeture (utilisé par la bulle flottante).
  onClose?: () => void;
}

// Contenu de la messagerie (chat global / admin / messages directs), utilisé
// à la fois par la page complète /messagerie et par la bulle flottante
// (voir components/ChatBulle.tsx) — même logique, juste plus compact.
export default function Messagerie({ compact = false, onClose }: Props) {
  const [moi, setMoi] = useState<{ id: string; full_name: string | null; role: string } | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("global");
  const [collegues, setCollegues] = useState<Profile[]>([]);
  const [destinataireId, setDestinataireId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // Charge mon identité (id/rôle) une fois — sert à savoir si l'onglet
  // "Admin" doit être visible et à distinguer "mes" messages dans la bulle.
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.id) setMoi(json);
      });
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((json) => {
        if (json.profiles) setCollegues(json.profiles);
      });
  }, []);

  // Recharge les messages à chaque changement d'onglet ou de destinataire.
  useEffect(() => {
    if (onglet === "direct" && !destinataireId) {
      setMessages([]);
      return;
    }
    load();
  }, [onglet, destinataireId]);

  // Abonnement Supabase Realtime : dès qu'un message est inséré, on
  // l'ajoute s'il concerne la conversation actuellement affichée.
  useEffect(() => {
    if (!moi) return;
    const supabase = createClient();
    const channel = supabase
      .channel("messages-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const concerne =
            m.channel_type === onglet &&
            (m.channel_type !== "direct" ||
              (m.sender_id === moi.id && m.recipient_id === destinataireId) ||
              (m.sender_id === destinataireId && m.recipient_id === moi.id));
          if (concerne) {
            setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moi, onglet, destinataireId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function load() {
    const params = new URLSearchParams({ channel: onglet });
    if (onglet === "direct") params.set("with", destinataireId);
    const res = await fetch(`/api/messages?${params}`);
    const json = await res.json();
    if (res.ok) setMessages(json.messages);
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    setErreur(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelType: onglet,
        content: texte.trim(),
        recipientId: onglet === "direct" ? destinataireId : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErreur(json.error);
      return;
    }
    setTexte("");
    // On l'ajoute nous-mêmes (au cas où le Realtime a un peu de retard).
    setMessages((prev) => (prev.some((p) => p.id === json.message.id) ? prev : [...prev, json.message]));
  }

  function nomCollegue(id: string) {
    return collegues.find((c) => c.id === id)?.full_name || "?";
  }

  const autresCollegues = collegues.filter((c) => c.id !== moi?.id);

  const tabs = (
    <div
      className={`flex items-center gap-1 ${
        compact ? "border-b border-gray-200 px-2 py-1.5" : "mb-4 gap-2 border-b border-gray-200"
      }`}
    >
      <button
        onClick={() => setOnglet("global")}
        className={`rounded-lg font-semibold transition ${compact ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm"} ${
          onglet === "global"
            ? compact
              ? "bg-but-red text-white"
              : "border-b-2 border-but-red text-but-red"
            : "text-but-gray hover:text-but-dark"
        }`}
      >
        Global
      </button>
      {moi?.role === "admin" && (
        <button
          onClick={() => setOnglet("admin")}
          className={`rounded-lg font-semibold transition ${compact ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm"} ${
            onglet === "admin"
              ? compact
                ? "bg-but-red text-white"
                : "border-b-2 border-but-red text-but-red"
              : "text-but-gray hover:text-but-dark"
          }`}
        >
          Admin
        </button>
      )}
      <button
        onClick={() => setOnglet("direct")}
        className={`rounded-lg font-semibold transition ${compact ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm"} ${
          onglet === "direct"
            ? compact
              ? "bg-but-red text-white"
              : "border-b-2 border-but-red text-but-red"
            : "text-but-gray hover:text-but-dark"
        }`}
      >
        {compact ? "Direct" : "Messages directs"}
      </button>
      {compact && onClose && (
        <button
          onClick={onClose}
          aria-label="Fermer la messagerie"
          className="ml-auto rounded-lg px-2 py-1 text-but-gray hover:bg-but-gray-light hover:text-but-dark"
        >
          <IconClose className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const destinataireSelect = onglet === "direct" && (
    <select
      value={destinataireId}
      onChange={(e) => setDestinataireId(e.target.value)}
      className={`rounded-lg border border-gray-300 text-sm focus:border-but-red focus:outline-none ${
        compact ? "mx-2 mt-2 px-2 py-1.5" : "mb-3 w-full px-2 py-2 sm:w-72"
      }`}
    >
      <option value="">— Choisir un collègue —</option>
      {autresCollegues.map((c) => (
        <option key={c.id} value={c.id}>
          {c.full_name} {c.role === "admin" ? "(admin)" : ""}
        </option>
      ))}
    </select>
  );

  const chatBox =
    onglet === "direct" && !destinataireId ? (
      <p
        className={`rounded-xl border border-dashed border-gray-300 text-center text-sm text-but-gray ${
          compact ? "m-2 flex-1 content-center p-4" : "p-6"
        }`}
      >
        Choisissez un collègue pour démarrer une conversation.
      </p>
    ) : (
      <div
        className={`flex flex-col ${
          compact ? "min-h-0 flex-1" : "h-[26rem] rounded-xl border border-gray-200"
        }`}
      >
        <div className={`flex-1 space-y-2 overflow-y-auto ${compact ? "px-2 py-2" : "p-3"}`}>
          {messages.length === 0 && (
            <p className="text-center text-sm text-but-gray">Aucun message pour l&apos;instant.</p>
          )}
          {messages.map((m) => {
            const cestMoi = m.sender_id === moi?.id;
            return (
              <div key={m.id} className={`flex ${cestMoi ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    cestMoi ? "bg-but-red text-white" : "bg-but-gray-light text-but-dark"
                  }`}
                >
                  {!cestMoi && (
                    <p className="mb-0.5 text-xs font-semibold opacity-80">
                      {m.sender_name || nomCollegue(m.sender_id)}
                    </p>
                  )}
                  <p className="whitespace-pre-line">{m.content}</p>
                  <p className={`mt-0.5 text-[10px] ${cestMoi ? "text-white/70" : "text-but-gray"}`}>
                    {new Date(m.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={finRef} />
        </div>
        <form onSubmit={envoyer} className={`flex gap-2 border-t border-gray-200 ${compact ? "p-2" : "p-2"}`}>
          <input
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-but-red focus:outline-none"
          />
          <Button type="submit" size="sm">
            Envoyer
          </Button>
        </form>
      </div>
    );

  if (compact) {
    return (
      <div className="flex h-full flex-col">
        {tabs}
        {destinataireSelect}
        {chatBox}
        {erreur && <p className="px-2 py-1 text-xs text-but-red-dark">{erreur}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">Messagerie</h1>
      <p className="mb-6 text-sm text-but-gray">
        Discussion globale visible par tous, discussion réservée aux admins,
        ou message direct à un collègue.
      </p>
      {tabs}
      {destinataireSelect}
      {chatBox}
      {erreur && <p className="mt-2 text-sm text-but-red">{erreur}</p>}
    </div>
  );
}
