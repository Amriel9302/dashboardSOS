import { NextResponse } from "next/server";
import { detectCityAndNeighborhood } from "@/lib/city-detection";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

type WhatsAppMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  referral?: {
    source_id?: string;
    source_url?: string;
    source_type?: string;
    headline?: string;
    body?: string;
    ctwa_clid?: string;
  };
};

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  const payload = await request.json();

  try {
    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};
        const contactName =
          value?.contacts?.[0]?.profile?.name ?? null;

        for (const message of (value?.messages ?? []) as WhatsAppMessage[]) {
          const phone = message.from;
          const messageId = message.id;
          if (!phone || !messageId) continue;

          const body =
            message.type === "text" ? message.text?.body?.trim() ?? "" : "";

          const detection = body
            ? detectCityAndNeighborhood(body)
            : {
                city: null,
                neighborhood: null,
                confidence: 0,
                source: "desconhecido" as const,
              };

          await supabase.from("whatsapp_messages").upsert(
            {
              message_id: messageId,
              phone,
              direction: "inbound",
              message_type: message.type ?? "unknown",
              body: body || null,
              raw_payload: message,
              created_at: message.timestamp
                ? new Date(Number(message.timestamp) * 1000).toISOString()
                : new Date().toISOString(),
            },
            { onConflict: "message_id" },
          );

          const { data: existing } = await supabase
            .from("leads")
            .select("id, city, neighborhood, city_confidence, first_message, ad_id, ctwa_clid")
            .eq("phone", phone)
            .maybeSingle();

          const referral = message.referral ?? {};
          const shouldUpdateCity =
            Boolean(detection.city) &&
            (!existing?.city ||
              Number(detection.confidence) >
                Number(existing?.city_confidence ?? 0));

          const leadPayload: Record<string, unknown> = {
            phone,
            name: contactName,
            source: referral.source_id ? "Meta Ads" : "WhatsApp",
            last_message_at: new Date().toISOString(),
            whatsapp_message_id: existing ? undefined : messageId,
          };

          if (!existing?.first_message && body) {
            leadPayload.first_message = body;
          }

          if (shouldUpdateCity) {
            leadPayload.city = detection.city;
            leadPayload.neighborhood =
              detection.neighborhood ?? existing?.neighborhood ?? null;
            leadPayload.city_confidence = detection.confidence;
            leadPayload.city_source = detection.source;
          }

          if (referral.source_id && !existing?.ad_id) {
            leadPayload.ad_id = referral.source_id;
          }

          if (referral.ctwa_clid && !existing?.ctwa_clid) {
            leadPayload.ctwa_clid = referral.ctwa_clid;
          }

          for (const key of Object.keys(leadPayload)) {
            if (leadPayload[key] === undefined) delete leadPayload[key];
          }

          await supabase.from("leads").upsert(leadPayload, {
            onConflict: "phone",
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
