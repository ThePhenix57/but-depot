import { createClient } from "@/lib/supabase/server";
import { aAccesSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

const CHAMPS_TICKET =
  "id, numero, client_nom, client_prenom, numero_facture, produit_id, produit_nom, produit_ref, produit_ean, categorie, commentaire, colonne_id, ordre, ylios_fait, created_by, created_at, updated_at, createur:profiles!sav_tickets_created_by_fkey(full_name, email), champs:sav_ticket_champs(id, ticket_id, champ_id, valeur_bool, valeur_texte)";

// GET /api/sav/tickets/:id — détail complet d'un ticket (avec ses
// commentaires, pour la fiche/modale).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await aAccesSav(supabase, user.id))) {
    return NextResponse.json({ error: "Accès SAV non autorisé." }, { status: 403 });
  }

  const [{ data: ticket, error }, { data: commentaires }] = await Promise.all([
    supabase.from("sav_tickets").select(CHAMPS_TICKET).eq("id", id).single(),
    supabase
      .from("sav_commentaires")
      .select("id, ticket_id, auteur_id, texte, created_at, auteur:profiles!sav_commentaires_auteur_id_fkey(full_name, email)")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket, commentaires: commentaires ?? [] });
}

// PATCH /api/sav/tickets/:id — met à jour un ticket : déplacement sur le
// tableau (colonneId/ordre), champ Ylios, commentaire libre, ou toute
// autre info de la fiche. Body: champs à modifier uniquement.
// Optionnel: champs: { champId, valeurBool?, valeurTexte? }[] pour
// remplacer les valeurs des champs personnalisés.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await aAccesSav(supabase, user.id))) {
    return NextResponse.json({ error: "Accès SAV non autorisé." }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.clientNom !== undefined) updates.client_nom = String(body.clientNom).trim();
  if (body.clientPrenom !== undefined) updates.client_prenom = String(body.clientPrenom).trim();
  if (body.numeroFacture !== undefined) updates.numero_facture = body.numeroFacture ? String(body.numeroFacture).trim() : null;
  if (body.produitNom !== undefined) updates.produit_nom = String(body.produitNom).trim();
  if (body.produitRef !== undefined) updates.produit_ref = body.produitRef ? String(body.produitRef).trim() : null;
  if (body.produitEan !== undefined) updates.produit_ean = body.produitEan ? String(body.produitEan).trim() : null;
  if (body.produitId !== undefined) updates.produit_id = body.produitId || null;
  if (body.categorie !== undefined && ["meuble", "electromenager", "autre"].includes(body.categorie)) {
    updates.categorie = body.categorie;
  }
  if (body.commentaire !== undefined) updates.commentaire = body.commentaire ? String(body.commentaire).trim() : null;
  if (body.colonneId !== undefined) updates.colonne_id = body.colonneId;
  if (body.ordre !== undefined) updates.ordre = Number(body.ordre);
  if (body.ylios_fait !== undefined || body.ylioFait !== undefined) {
    updates.ylios_fait = !!(body.ylios_fait ?? body.ylioFait);
  }

  const { error } = await supabase.from("sav_tickets").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(body.champs)) {
    const lignes = body.champs.map((c: { champId: string; valeurBool?: boolean; valeurTexte?: string }) => ({
      ticket_id: id,
      champ_id: c.champId,
      valeur_bool: c.valeurBool ?? null,
      valeur_texte: c.valeurTexte ?? null,
    }));
    if (lignes.length > 0) {
      const { error: champsError } = await supabase
        .from("sav_ticket_champs")
        .upsert(lignes, { onConflict: "ticket_id,champ_id" });
      if (champsError) {
        return NextResponse.json(
          { error: `Ticket mis à jour, mais erreur sur les champs personnalisés : ${champsError.message}` },
          { status: 500 }
        );
      }
    }
  }

  const { data: ticket, error: relireError } = await supabase.from("sav_tickets").select(CHAMPS_TICKET).eq("id", id).single();
  if (relireError) return NextResponse.json({ error: relireError.message }, { status: 500 });
  return NextResponse.json({ ticket });
}

// DELETE /api/sav/tickets/:id — supprime définitivement un ticket
// (réservé aux admins, policy RLS "sav_tickets_delete_admin").
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux admins." }, { status: 403 });
  }

  const { error } = await supabase.from("sav_tickets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
