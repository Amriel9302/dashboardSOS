"use client";

import {
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Database,
  Filter,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MessageCircleMore,
  MoreHorizontal,
  Search,
  Settings2,
  Target,
  Users,
  WalletCards,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardData, Lead, LeadStatus } from "@/lib/types";

type Tab = "overview" | "leads" | "cities" | "ads" | "integrations";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("pt-BR");

const statusLabel: Record<LeadStatus, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  orcamento: "Orçamento",
  fechado: "Fechado",
  perdido: "Perdido",
  fora_area: "Fora da área",
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <article className="metric-card">
      <div className="metric-card__top">
        <span>{label}</span>
        <div className="metric-icon"><Icon size={18} strokeWidth={1.9} /></div>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  return <span className={"status status--" + status}>{statusLabel[status]}</span>;
}

function IntegrationBadge({ ok }: { ok: boolean }) {
  return (
    <span className={ok ? "integration-badge integration-badge--ok" : "integration-badge"}>
      {ok ? <Wifi size={14} /> : <WifiOff size={14} />}
      {ok ? "Conectado" : "Aguardando"}
    </span>
  );
}

function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Cidade</th>
            <th>Serviço</th>
            <th>Origem</th>
            <th>Status</th>
            <th>Valor</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <div className="lead-cell">
                  <span className="avatar">
                    {(lead.name || lead.phone).slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <b>{lead.name || "Contato sem nome"}</b>
                    <span>{lead.phone}</span>
                  </div>
                </div>
              </td>
              <td>
                <div className="city-cell">
                  <b>{lead.city || "Não identificada"}</b>
                  <span>{lead.neighborhood || "—"}</span>
                </div>
              </td>
              <td>{lead.service || "—"}</td>
              <td>
                <div className="source-cell">
                  <b>{lead.source || "WhatsApp"}</b>
                  <span>{lead.adName || "Sem anúncio identificado"}</span>
                </div>
              </td>
              <td><StatusPill status={lead.status} /></td>
              <td>
                <b>
                  {lead.status === "fechado" && lead.saleValue != null
                    ? money.format(lead.saleValue)
                    : lead.quoteValue != null
                      ? money.format(lead.quoteValue)
                      : "—"}
                </b>
              </td>
              <td><button className="icon-button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");

  const filteredLeads = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data.leads;
    return data.leads.filter((lead) =>
      [
        lead.name,
        lead.phone,
        lead.city,
        lead.neighborhood,
        lead.service,
        lead.adName,
        statusLabel[lead.status],
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data.leads, query]);

  const maxCityLeads = Math.max(...data.cities.map((city) => city.leads), 1);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SOS</div>
          <div>
            <strong>SOS Telas</strong>
            <span>CRM & Performance</span>
          </div>
        </div>

        <nav>
          <button className={tab === "overview" ? "nav-item active" : "nav-item"} onClick={() => setTab("overview")}>
            <LayoutDashboard size={18} /> Visão geral
          </button>
          <button className={tab === "leads" ? "nav-item active" : "nav-item"} onClick={() => setTab("leads")}>
            <Users size={18} /> Leads
          </button>
          <button className={tab === "cities" ? "nav-item active" : "nav-item"} onClick={() => setTab("cities")}>
            <MapPin size={18} /> Cidades
          </button>
          <button className={tab === "ads" ? "nav-item active" : "nav-item"} onClick={() => setTab("ads")}>
            <Megaphone size={18} /> Anúncios
          </button>
          <button className={tab === "integrations" ? "nav-item active" : "nav-item"} onClick={() => setTab("integrations")}>
            <Settings2 size={18} /> Integrações
          </button>
        </nav>

        <div className="sidebar-card">
          <span>Período atual</span>
          <strong>Últimos 30 dias</strong>
          <small>O filtro de período será conectado aos dados reais da Meta.</small>
        </div>

        <div className="sidebar-footer">
          <div className="mini-logo">S</div>
          <div>
            <strong>SOS Telas de Proteção</strong>
            <span>Ribeirão e região</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">SOS TELAS DE PROTEÇÃO</p>
            <h1>
              {tab === "overview" && "Visão geral"}
              {tab === "leads" && "Leads"}
              {tab === "cities" && "Desempenho por cidade"}
              {tab === "ads" && "Anúncios"}
              {tab === "integrations" && "Integrações"}
            </h1>
          </div>
          <div className="topbar-actions">
            <button className="period-button">Últimos 30 dias <ChevronDown size={16} /></button>
            <div className="live-dot"><span /> Atualização automática</div>
          </div>
        </header>

        {data.isDemo && (
          <div className="demo-banner">
            <strong>Prévia do dashboard.</strong>
            <span>Os números abaixo são demonstrativos até conectarmos o banco, WhatsApp e Meta Ads.</span>
          </div>
        )}

        {tab === "overview" && (
          <>
            <section className="metrics-grid">
              <MetricCard label="Investimento" value={money.format(data.metrics.spend)} detail="Meta Ads" icon={WalletCards} />
              <MetricCard label="Conversas" value={number.format(data.metrics.conversations)} detail={money.format(data.metrics.costPerConversation) + " por conversa"} icon={MessageCircleMore} />
              <MetricCard label="Qualificados" value={number.format(data.metrics.qualified)} detail="Leads com potencial real" icon={Target} />
              <MetricCard label="Orçamentos" value={number.format(data.metrics.quotes)} detail="Enviados aos leads" icon={BadgeDollarSign} />
              <MetricCard label="Vendas" value={number.format(data.metrics.sales)} detail={data.metrics.leadToSaleRate.toFixed(1).replace(".", ",") + "% dos leads"} icon={CheckCircle2} />
              <MetricCard label="Faturamento" value={money.format(data.metrics.revenue)} detail={data.metrics.sales ? money.format(data.metrics.costPerSale) + " por venda" : "Sem vendas registradas"} icon={CircleDollarSign} />
            </section>

            <section className="two-column">
              <article className="panel city-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">LOCALIZAÇÃO</span>
                    <h2>Leads por cidade</h2>
                  </div>
                  <button className="text-button" onClick={() => setTab("cities")}>Ver detalhes</button>
                </div>

                <div className="city-list">
                  {data.cities.slice(0, 6).map((city) => (
                    <div className="city-row" key={city.city}>
                      <div className="city-name">
                        <span className="city-pin"><MapPin size={15} /></span>
                        <div>
                          <b>{city.city}</b>
                          <span>{city.sales} {city.sales === 1 ? "venda" : "vendas"}</span>
                        </div>
                      </div>
                      <div className="city-progress-wrap">
                        <div className="city-progress">
                          <span style={{ width: ((city.leads / maxCityLeads) * 100) + "%" }} />
                        </div>
                        <b>{city.leads}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel funnel-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">FUNIL COMERCIAL</span>
                    <h2>Da conversa à venda</h2>
                  </div>
                  <BarChart3 size={19} className="muted-icon" />
                </div>

                <div className="funnel">
                  {[
                    ["Conversas", data.metrics.conversations],
                    ["Qualificados", data.metrics.qualified],
                    ["Orçamentos", data.metrics.quotes],
                    ["Vendas", data.metrics.sales],
                  ].map(([label, value], index) => {
                    const amount = Number(value);
                    const base = Math.max(data.metrics.conversations, 1);
                    const width = Math.max(26, (amount / base) * 100);
                    return (
                      <div className="funnel-step" key={String(label)}>
                        <div className="funnel-meta">
                          <span>{label}</span>
                          <b>{number.format(amount)}</b>
                        </div>
                        <div className="funnel-track">
                          <span style={{ width: width + "%", opacity: 1 - index * 0.13 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">CRM</span>
                  <h2>Leads recentes</h2>
                </div>
                <button className="text-button" onClick={() => setTab("leads")}>Ver todos</button>
              </div>
              <LeadTable leads={data.leads.slice(0, 6)} />
            </section>
          </>
        )}

        {tab === "leads" && (
          <section className="panel page-panel">
            <div className="toolbar">
              <div className="search-box">
                <Search size={17} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, cidade, serviço ou anúncio..." />
              </div>
              <button className="secondary-button"><Filter size={16} /> Filtros</button>
            </div>
            <div className="list-summary">
              <span><b>{filteredLeads.length}</b> leads encontrados</span>
              <span className="muted">Cidade é identificada automaticamente quando possível.</span>
            </div>
            <LeadTable leads={filteredLeads} />
          </section>
        )}

        {tab === "cities" && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">GEO PERFORMANCE</span>
                <h2>Quais cidades realmente convertem</h2>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cidade</th>
                    <th>Leads</th>
                    <th>Qualificados</th>
                    <th>Orçamentos</th>
                    <th>Vendas</th>
                    <th>Conversão</th>
                    <th>Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cities.map((city) => (
                    <tr key={city.city}>
                      <td><div className="city-inline"><MapPin size={15} /><b>{city.city}</b></div></td>
                      <td>{city.leads}</td>
                      <td>{city.qualified}</td>
                      <td>{city.quotes}</td>
                      <td><b>{city.sales}</b></td>
                      <td>{city.conversionRate.toFixed(1).replace(".", ",")}%</td>
                      <td><b>{money.format(city.revenue)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "ads" && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">META ADS</span>
                <h2>Desempenho dos anúncios</h2>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Anúncio</th>
                    <th>Investimento</th>
                    <th>Conversas</th>
                    <th>Custo/conversa</th>
                    <th>Impressões</th>
                    <th>Alcance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ads.map((ad, index) => (
                    <tr key={ad.date + (ad.adName || "") + index}>
                      <td>
                        <div className="source-cell">
                          <b>{ad.adName || "Anúncio"}</b>
                          <span>{ad.campaignName || "Campanha não identificada"}</span>
                        </div>
                      </td>
                      <td><b>{money.format(ad.spend)}</b></td>
                      <td>{ad.conversations}</td>
                      <td>{ad.conversations ? money.format(ad.spend / ad.conversations) : "—"}</td>
                      <td>{number.format(ad.impressions)}</td>
                      <td>{number.format(ad.reach)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "integrations" && (
          <section className="integration-grid">
            <article className="integration-card">
              <div className="integration-icon"><MessageCircleMore size={22} /></div>
              <div className="integration-copy">
                <div className="integration-title">
                  <h3>WhatsApp Cloud API</h3>
                  <IntegrationBadge ok={data.integrations.whatsapp} />
                </div>
                <p>Recebe as mensagens por webhook e identifica cidade, bairro e origem do lead sem IA.</p>
                <small>Variáveis: WHATSAPP_PHONE_NUMBER_ID e META_WEBHOOK_VERIFY_TOKEN</small>
              </div>
            </article>

            <article className="integration-card">
              <div className="integration-icon"><Megaphone size={22} /></div>
              <div className="integration-copy">
                <div className="integration-title">
                  <h3>Meta Ads</h3>
                  <IntegrationBadge ok={data.integrations.metaAds} />
                </div>
                <p>Sincroniza investimento, impressões, alcance, conversas, campanhas, conjuntos e anúncios.</p>
                <small>Variáveis: META_ACCESS_TOKEN e META_AD_ACCOUNT_ID</small>
              </div>
            </article>

            <article className="integration-card">
              <div className="integration-icon"><Database size={22} /></div>
              <div className="integration-copy">
                <div className="integration-title">
                  <h3>Banco de dados</h3>
                  <IntegrationBadge ok={data.integrations.database} />
                </div>
                <p>Armazena leads, mensagens, identificação de cidade e métricas diárias dos anúncios.</p>
                <small>Supabase configurado somente no servidor.</small>
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
