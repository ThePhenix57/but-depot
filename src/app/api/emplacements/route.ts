import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { findOrCreateZone } from "@/lib/zones";

// POST /api/emplacements
// Body: { productId, zoneCode }
// Ajoute un emplacement supplémentaire à un produit déjà existant.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const productId = String(body.productId || "").trim();
  const zoneCode = String(body.zoneCode || "").trim().toUpperCase();

  if (!productId || !zoneCode) {
    return NextResponse.json(
      { error: "Produit et emplacement sont obligatoires." },
      { status: 400 }
    );
  }

  const zone = await findOrCreateZone(supabase, zoneCode);
  if ("error" in zone) {
    return NextResponse.json({ error: zone.error }, { status: 500 });
  }

  const { error: linkError } = await supabase.from("product_locations").insert({
    product_id: productId,
    zone_id: zone.id,
    added_by: user.id,
  });

  if (linkError) {
    if (linkError.code === "23505") {
      return NextResponse.json(
        { error: "Ce produit est déjà rangé à cet emplacement." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ zone });
}
