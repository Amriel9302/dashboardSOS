export type LeadStatus =
  | "novo"
  | "qualificado"
  | "orcamento"
  | "fechado"
  | "perdido"
  | "fora_area";

export type CitySource =
  | "texto_direto"
  | "bairro"
  | "cep"
  | "localizacao"
  | "fuzzy"
  | "manual"
  | "desconhecido";

export interface Lead {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  neighborhood: string | null;
  service: string | null;
  status: LeadStatus;
  source: string | null;
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  quoteValue: number | null;
  saleValue: number | null;
  cityConfidence: number | null;
  citySource: CitySource | null;
  createdAt: string;
}

export interface AdMetric {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  conversations: number;
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
}

export interface CityMetric {
  city: string;
  leads: number;
  qualified: number;
  quotes: number;
  sales: number;
  revenue: number;
  conversionRate: number;
}

export interface DashboardMetrics {
  spend: number;
  conversations: number;
  qualified: number;
  quotes: number;
  sales: number;
  revenue: number;
  costPerConversation: number;
  costPerSale: number;
  leadToSaleRate: number;
}

export interface DashboardData {
  isDemo: boolean;
  metrics: DashboardMetrics;
  leads: Lead[];
  cities: CityMetric[];
  ads: AdMetric[];
  integrations: {
    database: boolean;
    whatsapp: boolean;
    metaAds: boolean;
  };
}
