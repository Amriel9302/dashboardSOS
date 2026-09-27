import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
    const response = await fetch(next, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error("Meta API " + response.status + ": " + body);
    }

    const json = await response.json();
    rows.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
  }

  return rows;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const token = process.env.META_ACCESS_TOKEN;
  const adAccount = process.env.META_AD_ACCOUNT_ID;
  const version = process.env.META_GRAPH_VERSION;

  if (!supabase || !token || !adAccount || !version) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID and META_GRAPH_VERSION.",
      },
      { status: 503 },
    );
  }

  try {
    const accountId = adAccount.startsWith("act_") ? adAccount : "act_" + adAccount;
    const endpoint = new URL(
      "https://graph.facebook.com/" + version + "/" + accountId + "/insights",
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
        campaign_id: row.campaign_id ?? null,
        campaign_name: row.campaign_name ?? null,
        adset_id: row.adset_id ?? null,
        adset_name: row.adset_name ?? null,
        ad_id: row.ad_id as string,
        ad_name: row.ad_name ?? null,
        spend: Number(row.spend ?? 0),
        impressions: Number(row.impressions ?? 0),
        reach: Number(row.reach ?? 0),
        clicks: Number(row.clicks ?? 0),
        conversations: conversationCount(row.actions),
      }));

    if (normalized.length) {
      const { error } = await supabase
        .from("ad_metrics_daily")
        .upsert(normalized, { onConflict: "date,ad_id" });

      if (error) throw error;
    }

    const { data: ads } = await supabase
      .from("ad_metrics_daily")
      .select("ad_id, campaign_id, campaign_name, adset_id, adset_name, ad_name");

    for (const ad of ads ?? []) {
      await supabase
        .from("leads")
        .update({
          campaign_id: ad.campaign_id,
          campaign_name: ad.campaign_name,
          adset_id: ad.adset_id,
          adset_name: ad.adset_name,
          ad_name: ad.ad_name,
        })
        .eq("ad_id", ad.ad_id)
        .is("ad_name", null);
    }

    return NextResponse.json({ ok: true, rows: normalized.length });
  } catch (error) {
    console.error("Meta sync failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
