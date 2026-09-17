import { createClient } from "@/lib/supabase/server";
import { createAlveole, findAlveoleByCode } from "@/lib/alveoles";
import { NextRequest, NextResponse } from "next/server";

// GET /api/alveoles — liste toutes les alvéoles avec leur occupation
// actuelle (poids stocké / capacité), optionnellement filtrée par zone.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const zoneId = request.nextUrl.searchParams.get("zoneId");

  let query = supabase
    .from("alveole_occupancy")
    .select("alveole_id, zone_id, code, capacite_kg, poids_actuel_kg, nb_produits_differents")
    .order("code");
  if (zoneId) query = query.eq("zone_id", zoneId);

  const { data: occupancy, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: alveoles, error: alvError } = await supabase
    .from("alveoles")
    .select("id, zone_id, code, capacite_kg, taille_palette_max, bloquee, bloquee_motif, bloquee_at");
  if (alvError) return NextResponse.json({ error: alvError.message }, { status: 500 });

  const merged = (occupancy ?? []).map((o) => {
    const a = (alveoles ?? []).find((x) => x.id === o.alveole_id);
    return {
      ...o,
      id: o.alveole_id,
      taille_palette_max: a?.taille_palette_max ?? null,
      bloquee: a?.bloquee ?? false,
      bloquee_motif: a?.bloquee_motif ?? null,
      bloquee_at: a?.bloquee_at ?? null,
    };
  });

  return NextResponse.json({ alveoles: merged });
}

// POST /api/alveoles — crée une alvéole (utilisé par l'admin ou lors d'un
// rangement vers un code d'alvéole encore inconnu).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const zoneId = String(body.zoneId || "").trim();
  const code = String(body.code || "").trim().toUpperCase();
  const capaciteKg = body.capaciteKg != null && body.capaciteKg !== "" ? Number(body.capaciteKg) : null;
  const taillePaletteMax = body.taillePaletteMax || null;

  if (!zoneId || !code) {
    return NextResponse.json({ error: "Zone et code d'alvéole sont obligatoires." }, { status: 400 });
  }

  const { data: existing } = await findAlveoleByCode(supabase, code);
  if (existing) {
    return NextResponse.json({ error: "Ce code d'alvéole existe déjà." }, { status: 409 });
  }

  const { data, error } = await createAlveole(supabase, { zoneId, code, capaciteKg, taillePaletteMax });
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alveole: data });
}
