import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/categories/:id — renomme et/ou remplace les zones autorisées.
export async function PATCH(
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

  if (typeof body.name === "string" && body.name.trim()) {
    const { error } = await supabase
      .from("categories")
      .update({ name: body.name.trim() })
      .eq("id", id);
    if (error) {
      if (error.code === "42501") {
        return NextResponse.json(
          { error: "Seul un compte admin/direction peut gérer les catégories." },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.zone_ids)) {
    const { error: delError } = await supabase
      .from("category_zones")
      .delete()
      .eq("category_id", id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

    if (body.zone_ids.length > 0) {
      const { error: insError } = await supabase
        .from("category_zones")
        .insert(body.zone_ids.map((zoneId: string) => ({ category_id: id, zone_id: zoneId })));
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/categories/:id
export async function DELETE(
  _request: NextRequest,
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

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut gérer les catégories." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
