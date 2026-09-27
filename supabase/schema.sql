create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text,
  city text,
  neighborhood text,
  service text,
  status text not null default 'novo'
    check (status in ('novo','qualificado','orcamento','fechado','perdido','fora_area')),
  source text,
  campaign_id text,
  campaign_name text,
  adset_id text,
  adset_name text,
  ad_id text,
  ad_name text,
  ctwa_clid text,
  whatsapp_message_id text unique,
  city_confidence numeric(4,3),
  city_source text,
  quote_value numeric(12,2),
  sale_value numeric(12,2),
  first_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_phone_unique on public.leads(phone);
create index if not exists leads_city_idx on public.leads(city);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_ad_id_idx on public.leads(ad_id);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  phone text not null,
  direction text not null default 'inbound',
  message_type text,
  body text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_phone_idx
  on public.whatsapp_messages(phone, created_at desc);

create table if not exists public.ad_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  campaign_id text,
  campaign_name text,
  adset_id text,
  adset_name text,
  ad_id text not null,
  ad_name text,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  conversations integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(date, ad_id)
);

create index if not exists ad_metrics_date_idx on public.ad_metrics_daily(date desc);
create index if not exists ad_metrics_ad_id_idx on public.ad_metrics_daily(ad_id);

create table if not exists public.location_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_city text not null,
  alias text not null unique,
  kind text not null default 'city'
    check (kind in ('city','neighborhood')),
  neighborhood text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
before update on public.leads
for each row execute function public.touch_updated_at();

drop trigger if exists ad_metrics_touch_updated_at on public.ad_metrics_daily;
create trigger ad_metrics_touch_updated_at
before update on public.ad_metrics_daily
for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.ad_metrics_daily enable row level security;
alter table public.location_aliases enable row level security;

-- A aplicação usa somente a service role no servidor.
-- Nenhuma tabela é exposta diretamente ao navegador.
