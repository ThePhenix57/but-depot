import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/zones — liste toutes les zones du plan avec leurs rectangles
// (une zone peut en avoir plusieurs — voir zone_rects).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("zones")
    .select(
      "id, code, label, couleur, ordre_inverse, rects:zone_rects(id, pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct)"
    )
    .order("code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones: data });
}

// POST /api/zones — crée une nouvelle zone sur le plan (admin uniquement,
// vérifié par la policy RLS "zones_write_admin"), avec son premier
// rectangle (pos_x_pct/pos_y_pct/largeur_pct/hauteur_pct, dessiné au
// clic-glisser dans /admin/zones). Pour ajouter un DEUXIÈME rectangle à
// une zone existante (ex: rack coupé en deux endroits séparés sur le
// plan), voir POST /api/zones/:id/rects à la place.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { code, label, pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct, couleur } = body;

  if (!code) {
    return NextResponse.json({ error: "Le code est obligatoire." }, { status: 400 });
  }

  const { data: zone, error } = await supabase
    .from("zones")
    .insert({
      code: String(code).toUpperCase(),
      label: label || null,
      couleur: couleur || "#E2001A",
    })
    .select("id, code, label, couleur")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce code existe déjà." }, { status: 409 });
    }
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier le plan." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rects: unknown[] = [];
  if (pos_x_pct != null && pos_y_pct != null && largeur_pct != null && hauteur_pct != null) {
    const { data: rect, error: rectError } = await supabase
      .from("zone_rects")
      .insert({
        zone_id: zone.id,
        pos_x_pct,
        pos_y_pct,
        largeur_pct,
        hauteur_pct,
      })
      .select("id, pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct")
      .single();
    if (rectError) return NextResponse.json({ error: rectError.message }, { status: 500 });
    rects = [rect];
  }

  return NextResponse.json({ zone: { ...zone, rects } });
}
