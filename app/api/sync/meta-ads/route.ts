import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type MetaAction = {
  action_type?: string;
  value?: string;
};

type InsightRow = {
  date_start: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: MetaAction[];
};

function conversationCount(actions: MetaAction[] | undefined): number {
  if (!actions) return 0;
  const match = actions.find((action) =>
    String(action.action_type ?? "")
      .toLowerCase()
      .includes("messaging_conversation_started"),
  );
  return Number(match?.value ?? 0) || 0;
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === "Bearer " + secret;
}

async function fetchAllInsights(url: string, token: string): Promise<InsightRow[]> {
  const rows: InsightRow[] = [];
  let next: string | null = url;

  while (next) {
    const response: Response = await fetch(next, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error("Meta API " + response.status + ": " + body);
    }

    const json: {
      data?: InsightRow[];
      paging?: { next?: string };
    } = await response.json();

    rows.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
  }

  return rows;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const sql = getDb();
  const token = process.env.META_ACCESS_TOKEN;
  const adAccount = process.env.META_AD_ACCOUNT_ID;
  const version = process.env.META_GRAPH_VERSION;

  if (!sql || !token || !adAccount || !version) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Configure DATABASE_URL, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID and META_GRAPH_VERSION.",
      },
      { status: 503 },
    );
  }

  try {
    const accountId = adAccount.startsWith("act_")
      ? adAccount
      : "act_" + adAccount;

    const endpoint = new URL(
      "https://graph.facebook.com/" +
        version +
        "/" +
        accountId +
        "/insights",
    );

    endpoint.searchParams.set(
      "fields",
      [
        "date_start",
        "date_stop",
        "campaign_id",
        "campaign_name",
        "adset_id",
        "adset_name",
        "ad_id",
        "ad_name",
        "spend",
        "impressions",
        "reach",
        "clicks",
        "actions",
      ].join(","),
    );
    endpoint.searchParams.set("level", "ad");
    endpoint.searchParams.set("time_increment", "1");
    endpoint.searchParams.set("date_preset", "last_30d");
    endpoint.searchParams.set("limit", "500");

    const rows = await fetchAllInsights(endpoint.toString(), token);

    const normalized = rows
      .filter((row) => row.ad_id)
      .map((row) => ({
        date: row.date_start,
        campaignId: row.campaign_id ?? null,
        campaignName: row.campaign_name ?? null,
        adsetId: row.adset_id ?? null,
        adsetName: row.adset_name ?? null,
        adId: row.ad_id as string,
        adName: row.ad_name ?? null,
        spend: Number(row.spend ?? 0),
        impressions: Number(row.impressions ?? 0),
        reach: Number(row.reach ?? 0),
        clicks: Number(row.clicks ?? 0),
        conversations: conversationCount(row.actions),
      }));

    for (const row of normalized) {
      await sql`
        insert into public.ad_metrics_daily (
          date,
          campaign_id,
          campaign_name,
          adset_id,
          adset_name,
          ad_id,
          ad_name,
          spend,
          impressions,
          reach,
          conversations,
          clicks
        )
        values (
          ${row.date}::date,
          ${row.campaignId},
          ${row.campaignName},
          ${row.adsetId},
          ${row.adsetName},
          ${row.adId},
          ${row.adName},
          ${row.spend},
          ${row.impressions},
          ${row.reach},
          ${row.conversations},
          ${row.clicks}
        )
        on conflict (date, ad_id) do update
        set
          campaign_id = excluded.campaign_id,
          campaign_name = excluded.campaign_name,
          adset_id = excluded.adset_id,
          adset_name = excluded.adset_name,
          ad_name = excluded.ad_name,
          spend = excluded.spend,
          impressions = excluded.impressions,
          reach = excluded.reach,
          conversations = excluded.conversations,
          clicks = excluded.clicks
      `;

      await sql`
        update public.leads
        set
          campaign_id = coalesce(campaign_id, ${row.campaignId}),
          campaign_name = coalesce(campaign_name, ${row.campaignName}),
          adset_id = coalesce(adset_id, ${row.adsetId}),
          adset_name = coalesce(adset_name, ${row.adsetName}),
          ad_name = coalesce(ad_name, ${row.adName})
        where ad_id = ${row.adId}
      `;
    }

    return NextResponse.json({ ok: true, rows: normalized.length });
  } catch (error) {
    console.error("Meta sync failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
