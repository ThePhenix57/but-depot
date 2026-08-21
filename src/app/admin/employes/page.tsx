"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

export default function EmployesAdminPage() {
  const [employes, setEmployes] = useState<Profile[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"employe" | "admin">("employe");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/employes");
    const json = await res.json();
    if (res.ok) setEmployes(json.employes);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/employes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: fullName, role }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error);
      return;
    }
    setMessage(
      `Invitation envoyée à ${email}. Il/elle recevra un email pour choisir son mot de passe.`
    );
    setEmail("");
    setFullName("");
    setRole("employe");
    load();
  }

  async function handleRoleChange(profile: Profile, newRole: "employe" | "admin") {
    const res = await fetch(`/api/employes/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) load();
  }

  async function handleDelete(profile: Profile) {
    if (!confirm(`Supprimer définitivement le compte de ${profile.full_name} ?`))
      return;
    const res = await fetch(`/api/employes/${profile.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-but-dark">Employés</h1>
      <p className="mb-6 text-sm text-but-gray">
        Crée un compte nominatif par personne. Un email d&apos;invitation lui
        permet de choisir son mot de passe (nécessite l&apos;envoi d&apos;email
        configuré côté Supabase — voir DEPLOIEMENT.md).
      </p>

      {message && (
        <p className="mb-4 rounded bg-but-gray-light px-3 py-2 text-sm">{message}</p>
      )}

      <form
        onSubmit={handleInvite}
        className="mb-10 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-4"
      >
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded border border-gray-300 px-3 py-2 sm:col-span-2"
        />
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nom complet"
          className="rounded border border-gray-300 px-3 py-2"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "employe" | "admin")}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="employe">Employé</option>
          <option value="admin">Admin / direction</option>
        </select>
        <button
          type="submit"
          className="rounded bg-but-red px-4 py-2 font-semibold text-white sm:col-span-4"
        >
          Inviter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-but-gray-light text-left">
            <tr>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employes.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{p.full_name}</td>
                <td className="px-3 py-2">{p.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.role}
                    onChange={(e) =>
                      handleRoleChange(p, e.target.value as "employe" | "admin")
                    }
                    className="rounded border border-gray-200 px-2 py-1"
                  >
                    <option value="employe">Employé</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleDelete(p)}
                    className="rounded border border-but-red px-2 py-1 text-xs font-semibold text-but-red hover:bg-but-red hover:text-white"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
