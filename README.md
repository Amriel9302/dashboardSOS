# SOS Telas — CRM & Performance

Dashboard personalizado para acompanhar leads do WhatsApp, cidades, conversão e desempenho do Meta Ads.

## Estrutura

- Next.js + TypeScript
- Supabase (leads, mensagens e métricas de anúncios)
- WhatsApp Cloud API via webhook
- Meta Marketing API para insights dos anúncios
- Identificação de cidade sem IA: aliases + bairros + fuzzy matching local

## Fluxo

1. O lead chega pelo WhatsApp.
2. O webhook registra a mensagem.
3. O backend tenta identificar cidade/bairro no texto recebido.
4. A origem do anúncio é armazenada quando a referência do Click-to-WhatsApp estiver presente.
5. O Meta Ads é sincronizado para a tabela `ad_metrics_daily`.
6. O dashboard cruza mídia + leads + vendas.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e configure:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `META_GRAPH_VERSION`
- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `META_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `CRON_SECRET` (opcional)

Nenhuma credencial deve ser commitada no GitHub.

## Banco

O schema inicial está em `supabase/schema.sql`.

## Webhook WhatsApp

Depois do deploy, configure na Meta:

`https://SEU-DOMINIO/api/webhooks/whatsapp`

O mesmo endpoint responde à verificação GET e recebe eventos POST.

## Sincronização Meta Ads

Endpoint:

`GET /api/sync/meta-ads`

Quando `CRON_SECRET` estiver configurado, envie:

`Authorization: Bearer <CRON_SECRET>`

## Estado atual

Sem Supabase/Meta configurados, o dashboard abre em modo de demonstração com dados explicitamente marcados como fictícios.
