import { createClient } from "@/lib/supabase/server";
import { aAccesSav } from "@/lib/sav";
import { NextRequest, NextResponse } from "next/server";

const CHAMPS_TICKET =
  "id, numero, client_nom, client_prenom, numero_facture, produit_id, produit_nom, produit_ref, produit_ean, categorie, commentaire, colonne_id, ordre, ylios_fait, created_by, created_at, updated_at, createur:profiles!sav_tickets_created_by_fkey(full_name, email), champs:sav_ticket_champs(id, ticket_id, champ_id, valeur_bool, valeur_texte)";

// GET /api/sav/tickets — tous les tickets SAV (le tableau charge tout
// d'un coup, pas de pagination : le volume attendu pour un dépôt reste
// modeste). Inclut les valeurs de champs personnalisés et le nombre de
// commentaires par ticket.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await aAccesSav(supabase, user.id))) {
    return NextResponse.json({ error: "Accès SAV non autorisé." }, { status: 403 });
  }

  const [{ data: tickets, error }, { data: commentaires }] = await Promise.all([
    supabase.from("sav_tickets").select(CHAMPS_TICKET).order("ordre", { ascending: true }),
    supabase.from("sav_commentaires").select("ticket_id"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nbCommentairesParTicket = new Map<string, number>();
  for (const c of commentaires ?? []) {
    nbCommentairesParTicket.set(c.ticket_id, (nbCommentairesParTicket.get(c.ticket_id) ?? 0) + 1);
  }

  const ticketsAvecCompte = (tickets ?? []).map((t) => ({
    ...t,
    nb_commentaires: nbCommentairesParTicket.get(t.id) ?? 0,
  }));

  return NextResponse.json({ tickets: ticketsAvecCompte });
}

// POST /api/sav/tickets — crée un ticket SAV.
// Body: {
//   clientNom, clientPrenom, numeroFacture?,
//   produitId?, produitNom, produitRef?, produitEan?,
//   categorie: "meuble" | "electromenager" | "autre",
//   commentaire?, colonneId?,
//   champs?: { champId: string, valeurBool?: boolean, valeurTexte?: string }[]
// }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await aAccesSav(supabase, user.id))) {
    return NextResponse.json({ error: "Accès SAV non autorisé." }, { status: 403 });
  }

  const body = await request.json();
  const clientNom = String(body.clientNom || "").trim();
  const clientPrenom = String(body.clientPrenom || "").trim();
  const produitNom = String(body.produitNom || "").trim();
  const categorie = ["meuble", "electromenager", "autre"].includes(body.categorie) ? body.categorie : "autre";

  if (!clientNom || !clientPrenom || !produitNom) {
    return NextResponse.json(
      { error: "Nom client, prénom client et produit sont obligatoires." },
      { status: 400 }
    );
  }

  // Nouveau ticket : dans la première colonne (la plus à gauche) sauf si
  // une colonne précise est demandée, et à la fin de cette colonne.
  let colonneId = body.colonneId ? String(body.colonneId) : null;
  if (!colonneId) {
    const { data: premiereColonne } = await supabase
      .from("sav_colonnes")
      .select("id")
      .order("ordre", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!premiereColonne) {
      return NextResponse.json(
        { error: "Aucune colonne SAV n'existe — configure d'abord le tableau." },
        { status: 409 }
      );
    }
    colonneId = premiereColonne.id;
  }
  const { data: dernierTicket } = await supabase
    .from("sav_tickets")
    .select("ordre")
    .eq("colonne_id", colonneId)
    .order("ordre", { ascending: false })
    .limit(1);
  const ordre = (dernierTicket?.[0]?.ordre ?? -1) + 1;

  const { data: ticket, error } = await supabase
    .from("sav_tickets")
    .insert({
      client_nom: clientNom,
      client_prenom: clientPrenom,
      numero_facture: body.numeroFacture ? String(body.numeroFacture).trim() : null,
      produit_id: body.produitId || null,
      produit_nom: produitNom,
      produit_ref: body.produitRef ? String(body.produitRef).trim() : null,
      produit_ean: body.produitEan ? String(body.produitEan).trim() : null,
      categorie,
      commentaire: body.commentaire ? String(body.commentaire).trim() : null,
      colonne_id: colonneId,
      ordre,
      created_by: user.id,
    })
    .select(CHAMPS_TICKET)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const champsEnvoyes: { champId: string; valeurBool?: boolean; valeurTexte?: string }[] = Array.isArray(body.champs)
    ? body.champs
    : [];
  if (champsEnvoyes.length > 0) {
    const { error: champsError } = await supabase.from("sav_ticket_champs").insert(
      champsEnvoyes.map((c) => ({
        ticket_id: ticket.id,
        champ_id: c.champId,
        valeur_bool: c.valeurBool ?? null,
        valeur_texte: c.valeurTexte ?? null,
      }))
    );
    if (champsError) {
      return NextResponse.json(
        { error: `Ticket créé, mais erreur sur les champs personnalisés : ${champsError.message}` },
        { status: 500 }
      );
    }
  }

  const { data: ticketComplet } = await supabase.from("sav_tickets").select(CHAMPS_TICKET).eq("id", ticket.id).single();
  return NextResponse.json({ ticket: { ...(ticketComplet ?? ticket), nb_commentaires: 0 } });
}
