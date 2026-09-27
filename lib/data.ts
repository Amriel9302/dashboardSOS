import { demoData } from "./demo-data";
import { getSupabaseAdmin } from "./supabase-admin";
import type { AdMetric, CityMetric, DashboardData, Lead } from "./types";

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseAdmin();

  if (!supabase) return demoData;

  const [{ data: leadRows, error: leadError }, { data: adRows, error: adError }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("ad_metrics_daily")
        .select("*")
        .order("date", { ascending: false })
        .limit(1000),
    ]);

  if (leadError || adError) {
    console.error("Dashboard data load failed", { leadError, adError });
    return {
      ...demoData,
      integrations: {
        database: true,
        whatsapp: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.META_WEBHOOK_VERIFY_TOKEN),
        metaAds: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
      },
    };
  }

  const leads: Lead[] = (leadRows ?? []).map((row) => ({
    id: String(row.id),
    name: row.name ?? null,
    phone: row.phone ?? "",
    city: row.city ?? null,
    neighborhood: row.neighborhood ?? null,
    service: row.service ?? null,
    status: row.status,
    source: row.source ?? null,
    campaignName: row.campaign_name ?? null,
    adsetName: row.adset_name ?? null,
    adName: row.ad_name ?? null,
    quoteValue: row.quote_value == null ? null : n(row.quote_value),
    saleValue: row.sale_value == null ? null : n(row.sale_value),
    cityConfidence: row.city_confidence == null ? null : n(row.city_confidence),
    citySource: row.city_source ?? null,
    createdAt: row.created_at,
  }));

  const ads: AdMetric[] = (adRows ?? []).map((row) => ({
    date: row.date,
    spend: n(row.spend),
    impressions: n(row.impressions),
    reach: n(row.reach),
    conversations: n(row.conversations),
    campaignName: row.campaign_name ?? null,
    adsetName: row.adset_name ?? null,
    adName: row.ad_name ?? null,
  }));

  const spend = ads.reduce((sum, row) => sum + row.spend, 0);
  const conversations = ads.reduce((sum, row) => sum + row.conversations, 0);
  const qualified = leads.filter((l) => ["qualificado", "orcamento", "fechado"].includes(l.status)).length;
  const quotes = leads.filter((l) => ["orcamento", "fechado"].includes(l.status)).length;
  const sales = leads.filter((l) => l.status === "fechado").length;
  const revenue = leads.reduce((sum, l) => sum + (l.saleValue ?? 0), 0);

  const cityMap = new Map<string, CityMetric>();
  for (const lead of leads) {
    const city = lead.city || "Não identificada";
    const current = cityMap.get(city) ?? {
      city,
      leads: 0,
      qualified: 0,
      quotes: 0,
      sales: 0,
      revenue: 0,
      conversionRate: 0,
    };
    current.leads += 1;
    if (["qualificado", "orcamento", "fechado"].includes(lead.status)) current.qualified += 1;
    if (["orcamento", "fechado"].includes(lead.status)) current.quotes += 1;
    if (lead.status === "fechado") current.sales += 1;
    current.revenue += lead.saleValue ?? 0;
    cityMap.set(city, current);
  }

  const cities = [...cityMap.values()]
    .map((city) => ({
      ...city,
      conversionRate: city.leads ? (city.sales / city.leads) * 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  return {
    isDemo: false,
    metrics: {
      spend,
      conversations,
      qualified,
      quotes,
      sales,
      revenue,
      costPerConversation: conversations ? spend / conversations : 0,
      costPerSale: sales ? spend / sales : 0,
      leadToSaleRate: leads.length ? (sales / leads.length) * 100 : 0,
    },
    leads,
    cities,
    ads,
    integrations: {
      database: true,
      whatsapp: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.META_WEBHOOK_VERIFY_TOKEN),
      metaAds: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
    },
  };
}
