import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/messages?channel=global|admin|direct&with=<userId si direct>
// Renvoie les 100 derniers messages du canal demandé, du plus ancien au
// plus récent, avec le nom de l'expéditeur.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const channel = request.nextUrl.searchParams.get("channel") || "global";
  const withUserId = request.nextUrl.searchParams.get("with");

  if (channel === "direct" && !withUserId) {
    return NextResponse.json({ error: "Destinataire manquant." }, { status: 400 });
  }

  let query = supabase
    .from("messages")
    .select("id, channel_type, sender_id, recipient_id, content, created_at")
    .eq("channel_type", channel)
    .order("created_at", { ascending: true })
    .limit(200);

  if (channel === "direct" && withUserId) {
    query = query.or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${user.id})`
    );
  }

  const { data: messages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const senderIds = Array.from(new Set((messages ?? []).map((m) => m.sender_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", senderIds.length > 0 ? senderIds : ["00000000-0000-0000-0000-000000000000"]);

  const withNames = (messages ?? []).map((m) => ({
    ...m,
    sender_name: profiles?.find((p) => p.id === m.sender_id)?.full_name || profiles?.find((p) => p.id === m.sender_id)?.email || "?",
  }));

  return NextResponse.json({ messages: withNames });
}

// POST /api/messages — envoie un message. Body: { channelType, content, recipientId? }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const channelType = body.channelType === "admin" || body.channelType === "direct" ? body.channelType : "global";
  const content = String(body.content || "").trim();
  const recipientId = body.recipientId || null;

  if (!content) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }
  if (channelType === "direct" && !recipientId) {
    return NextResponse.json({ error: "Destinataire manquant." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_type: channelType,
      sender_id: user.id,
      recipient_id: channelType === "direct" ? recipientId : null,
      content,
    })
    .select("id, channel_type, sender_id, recipient_id, content, created_at")
    .single();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Accès refusé à ce canal." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
