import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/zones/:id/rects — ajoute un rectangle supplémentaire à une
// zone existante (ex: un rack coupé en deux endroits séparés sur le plan :
// on dessine un premier rectangle pour la première partie, puis on revient
// ici pour dessiner le deuxième, toujours sous le même code de zone).
// Admin uniquement (policy RLS "zone_rects_insert_admin").
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct } = body;
  if (pos_x_pct == null || pos_y_pct == null || largeur_pct == null || hauteur_pct == null) {
    return NextResponse.json({ error: "Rectangle incomplet." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("zone_rects")
    .insert({ zone_id: id, pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct })
    .select("id, pos_x_pct, pos_y_pct, largeur_pct, hauteur_pct")
    .single();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier le plan." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rect: data });
}
