import { createClient } from "@/lib/supabase/server";
import { genererSel, hasherCode } from "@/lib/adminCode";
import { NextRequest, NextResponse } from "next/server";

const CLE = "journal_reset";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Réservé aux admins." }, { status: 403 }) };
  }
  return { user };
}

// GET /api/admin/code-journal — indique si un code a déjà été défini (pas
// le code lui-même, jamais renvoyé au client).
export async function GET() {
  const supabase = await createClient();
  const check = await requireAdmin(supabase);
  if (check.error) return check.error;

  const { data } = await supabase.from("admin_codes").select("id").eq("cle", CLE).maybeSingle();
  return NextResponse.json({ defini: !!data });
}

// POST /api/admin/code-journal — définit ou change le code. Si un code
// existe déjà, "codeActuel" doit correspondre pour pouvoir le changer.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const check = await requireAdmin(supabase);
  if (check.error) return check.error;
  const user = check.user!;

  const body = await request.json();
  const nouveauCode = String(body.nouveauCode || "").trim();
  const codeActuel = typeof body.codeActuel === "string" ? body.codeActuel.trim() : "";

  if (nouveauCode.length < 4) {
    return NextResponse.json(
      { error: "Le code doit faire au moins 4 caractères." },
      { status: 400 }
    );
  }

  const { data: existant } = await supabase
    .from("admin_codes")
    .select("code_hash, code_sel")
    .eq("cle", CLE)
    .maybeSingle();

  if (existant) {
    if (!codeActuel || hasherCode(codeActuel, existant.code_sel) !== existant.code_hash) {
      return NextResponse.json({ error: "Code actuel incorrect." }, { status: 400 });
    }
  }

  const sel = genererSel();
  const hash = hasherCode(nouveauCode, sel);

  const { error } = await supabase.from("admin_codes").upsert(
    {
      cle: CLE,
      code_hash: hash,
      code_sel: sel,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "cle" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
