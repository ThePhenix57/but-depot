import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/emplacements/:id  (id = product_locations.id)
// Retire un emplacement d'un produit. Réservé aux admins/direction
// (la policy RLS "product_locations_delete_admin" le vérifie déjà côté
// base de données ; on renvoie ici un message plus clair si ce n'est pas
// un admin).
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Seul un compte admin/direction peut supprimer un emplacement." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("product_locations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
