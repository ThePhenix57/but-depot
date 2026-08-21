import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/categories — liste les catégories avec leurs zones autorisées.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: links, error: linksError } = await supabase
    .from("category_zones")
    .select("category_id, zone_id");
  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });

  const result = (categories ?? []).map((c) => ({
    ...c,
    zone_ids: (links ?? []).filter((l) => l.category_id === c.id).map((l) => l.zone_id),
  }));

  return NextResponse.json({ categories: result });
}

// POST /api/categories — crée une catégorie et ses zones autorisées (admin,
// vérifié par la policy RLS "categories_write_admin").
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const zoneIds: string[] = Array.isArray(body.zone_ids) ? body.zone_ids : [];

  if (!name) {
    return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }

  const { data: category, error } = await supabase
    .from("categories")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Cette catégorie existe déjà." }, { status: 409 });
    }
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut gérer les catégories." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (zoneIds.length > 0) {
    const { error: linkError } = await supabase
      .from("category_zones")
      .insert(zoneIds.map((zoneId) => ({ category_id: category.id, zone_id: zoneId })));
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ category: { ...category, zone_ids: zoneIds } });
}
