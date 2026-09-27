import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { detectCityAndNeighborhood } from "@/lib/city-detection";
import { getDb } from "@/lib/db";

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

type ExistingLead = {
  city: string | null;
  neighborhood: string | null;
  city_confidence: string | number | null;
  first_message: string | null;
  ad_id: string | null;
  ctwa_clid: string | null;
};

function hasValidMetaSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.slice("sha256=".length);

  if (expected.length !== received.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function POST(request: Request) {
  const sql = getDb();

  if (!sql) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  if (!hasValidMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  try {
    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};
        const contactName = value?.contacts?.[0]?.profile?.name ?? null;

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

          const createdAt = message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString();

          await sql`
            insert into public.whatsapp_messages (
              message_id,
              phone,
              direction,
              message_type,
              body,
              raw_payload,
              created_at
            )
            values (
              ${messageId},
              ${phone},
              'inbound',
              ${message.type ?? "unknown"},
              ${body || null},
              ${JSON.stringify(message)}::jsonb,
              ${createdAt}::timestamptz
            )
            on conflict (message_id) do update
            set
              body = excluded.body,
              raw_payload = excluded.raw_payload
          `;

          const existingRows = (await sql`
            select
              city,
              neighborhood,
              city_confidence,
              first_message,
              ad_id,
              ctwa_clid
            from public.leads
            where phone = ${phone}
            limit 1
          `) as ExistingLead[];

          const existing = existingRows[0];
          const referral = message.referral ?? {};

          const shouldUpdateCity =
            Boolean(detection.city) &&
            (!existing?.city ||
              Number(detection.confidence) >
                Number(existing?.city_confidence ?? 0));

          const city = shouldUpdateCity ? detection.city : existing?.city ?? null;
          const neighborhood = shouldUpdateCity
            ? detection.neighborhood ?? existing?.neighborhood ?? null
            : existing?.neighborhood ?? null;
          const cityConfidence = shouldUpdateCity
            ? detection.confidence
            : existing?.city_confidence ?? null;
          const citySource = shouldUpdateCity ? detection.source : null;
          const source = referral.source_id ? "Meta Ads" : "WhatsApp";
          const adId = existing?.ad_id ?? referral.source_id ?? null;
          const ctwaClid = existing?.ctwa_clid ?? referral.ctwa_clid ?? null;
          const firstMessage = existing?.first_message ?? (body || null);

          await sql`
            insert into public.leads (
              phone,
              name,
              city,
              neighborhood,
              status,
              source,
              ad_id,
              ctwa_clid,
              whatsapp_message_id,
              city_confidence,
              city_source,
              first_message,
              last_message_at
            )
            values (
              ${phone},
              ${contactName},
              ${city},
              ${neighborhood},
              'novo',
              ${source},
              ${adId},
              ${ctwaClid},
              ${messageId},
              ${cityConfidence},
              ${citySource},
              ${firstMessage},
              now()
            )
            on conflict (phone) do update
            set
              name = coalesce(excluded.name, leads.name),
              city = coalesce(excluded.city, leads.city),
              neighborhood = coalesce(excluded.neighborhood, leads.neighborhood),
              source = case
                when excluded.source = 'Meta Ads' then 'Meta Ads'
                else coalesce(leads.source, excluded.source)
              end,
              ad_id = coalesce(leads.ad_id, excluded.ad_id),
              ctwa_clid = coalesce(leads.ctwa_clid, excluded.ctwa_clid),
              city_confidence = coalesce(excluded.city_confidence, leads.city_confidence),
              city_source = coalesce(excluded.city_source, leads.city_source),
              first_message = coalesce(leads.first_message, excluded.first_message),
              last_message_at = now()
          `;
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
