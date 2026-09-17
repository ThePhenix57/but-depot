import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/zones/rects/:rectId — supprime UN rectangle d'une zone (pas
// toute la zone) — utile si un rectangle a été mal dessiné, sans perdre le
// reste de la zone. Admin uniquement.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ rectId: string }> }
) {
  const { rectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { error } = await supabase.from("zone_rects").delete().eq("id", rectId);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Seul un compte admin/direction peut modifier le plan." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
