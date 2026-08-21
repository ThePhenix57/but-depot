import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { findOrCreateZone } from "@/lib/zones";

// POST /api/produits
// Body: { ean, name, zoneCode }
// Crée un nouveau produit ET son premier emplacement (comme le classeur
// Google Sheets : impossible de créer un produit sans lui donner un
// emplacement de départ).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const ean = String(body.ean || "").trim();
  const name = String(body.name || "").trim();
  const zoneCode = String(body.zoneCode || "").trim().toUpperCase();

  if (!ean || !name || !zoneCode) {
    return NextResponse.json(
      { error: "Code EAN, nom et emplacement sont obligatoires." },
      { status: 400 }
    );
  }

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({ ean, name, created_by: user.id })
    .select("id, ean, name, created_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Ce code EAN existe déjà dans la base." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Trouve ou crée la zone, puis lie le produit à cette zone.
  const zone = await findOrCreateZone(supabase, zoneCode);
  if ("error" in zone) {
    return NextResponse.json({ error: zone.error }, { status: 500 });
  }

  const { error: linkError } = await supabase.from("product_locations").insert({
    product_id: product.id,
    zone_id: zone.id,
    added_by: user.id,
  });
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ product, zone });
}
