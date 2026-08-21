import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/alveoles/bulk — génère en série toutes les alvéoles d'une allée
// (ex: F1-0-A à F6-7-C) plutôt que de les créer une par une. Réservé à
// l'admin (vérifié ici en plus de la RLS, pour un message d'erreur clair).
//
// Body: {
//   zoneId, aisleCode ("F"),
//   bayFrom, bayTo,          // ex: 1 à 6
//   levelFrom, levelTo,      // ex: 0 à 7
//   positions: ["A","B","C"],
//   capaciteKg, taillePaletteMax
// }
// Génère un code par combinaison : "{aisleCode}{bay}-{level}-{position}".
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Seul un compte admin/direction peut générer des alvéoles en série." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const zoneId = String(body.zoneId || "").trim();
  const aisleCode = String(body.aisleCode || "").trim().toUpperCase();
  const bayFrom = Number(body.bayFrom);
  const bayTo = Number(body.bayTo);
  const levelFrom = Number(body.levelFrom);
  const levelTo = Number(body.levelTo);
  const positions: string[] = Array.isArray(body.positions) && body.positions.length > 0
    ? body.positions.map((p: string) => String(p).toUpperCase())
    : ["A"];
  const capaciteKg = body.capaciteKg != null && body.capaciteKg !== "" ? Number(body.capaciteKg) : null;
  const taillePaletteMax = body.taillePaletteMax || null;

  if (!zoneId || !aisleCode || Number.isNaN(bayFrom) || Number.isNaN(bayTo) || Number.isNaN(levelFrom) || Number.isNaN(levelTo)) {
    return NextResponse.json({ error: "Zone, préfixe, travées et niveaux sont obligatoires." }, { status: 400 });
  }
  const totalCount = (bayTo - bayFrom + 1) * (levelTo - levelFrom + 1) * positions.length;
  if (totalCount <= 0 || totalCount > 2000) {
    return NextResponse.json(
      { error: "Plage invalide ou trop grande (max 2000 alvéoles en une fois)." },
      { status: 400 }
    );
  }

  const codes: string[] = [];
  for (let bay = bayFrom; bay <= bayTo; bay++) {
    for (let level = levelFrom; level <= levelTo; level++) {
      for (const pos of positions) {
        codes.push(`${aisleCode}${bay}-${level}-${pos}`);
      }
    }
  }

  const { data, error } = await supabase
    .from("alveoles")
    .upsert(
      codes.map((code) => ({
        zone_id: zoneId,
        code,
        capacite_kg: capaciteKg,
        taille_palette_max: taillePaletteMax,
      })),
      { onConflict: "code", ignoreDuplicates: true }
    )
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    demandees: codes.length,
    creees: data?.length ?? 0,
    ignorees: codes.length - (data?.length ?? 0),
  });
}
