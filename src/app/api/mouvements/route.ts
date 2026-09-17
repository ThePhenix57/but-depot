import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/mouvements?from=YYYY-MM-DD&to=YYYY-MM-DD&ean=...
// Journal des rangements — réservé aux admins (aussi protégé par RLS côté
// base, cette vérification donne un message clair plutôt qu'une liste vide).
//
// Filtre EAN : "42569" cherche les EAN qui SE TERMINENT par ces chiffres
// (le cas le plus utile : identifier un produit à partir des derniers
// chiffres visibles sur une fiche imprimée). Taper directement un motif
// SQL du type "%42569" ou "35%69" fonctionne aussi tel quel pour qui veut
// plus de contrôle.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux admins." }, { status: 403 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const eanFiltre = request.nextUrl.searchParams.get("ean")?.trim();
  const typeFiltre = request.nextUrl.searchParams.get("type")?.trim();

  let productIds: string[] | null = null;
  if (eanFiltre) {
    const motif = eanFiltre.includes("%") ? eanFiltre : `%${eanFiltre}`;
    const { data: produits, error: prodError } = await supabase
      .from("products")
      .select("id")
      .ilike("ean", motif);
    if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 });
    productIds = (produits ?? []).map((p) => p.id);
    if (productIds.length === 0) {
      return NextResponse.json({ mouvements: [] });
    }
  }

  let query = supabase
    .from("mouvements")
    .select(
      `id, type, colis, type_palette, message, created_at,
       product:products(ean, name),
       alveole:alveoles(code, zone:zones(code, label)),
       auteur:profiles(full_name, email)`
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (productIds) query = query.in("product_id", productIds);
  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (typeFiltre) query = query.eq("type", typeFiltre);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ mouvements: data });
}
