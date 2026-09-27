# SOS Telas — CRM & Performance

Dashboard personalizado para acompanhar leads do WhatsApp, cidades, conversão e desempenho do Meta Ads.

## Stack

- Next.js + TypeScript
- Neon Postgres
- WhatsApp Cloud API via webhook
- Meta Marketing API para insights dos anúncios
- Identificação de cidade sem IA: aliases + bairros + fuzzy matching local

## Fluxo

1. O lead chega pelo WhatsApp.
2. O webhook registra a mensagem no Neon.
3. O backend tenta identificar cidade/bairro no texto recebido.
4. A origem do anúncio é armazenada quando a referência do Click-to-WhatsApp estiver presente.
5. O Meta Ads é sincronizado para a tabela `ad_metrics_daily`.
6. O dashboard cruza mídia + leads + vendas.

## Variáveis de ambiente

O projeto espera:

- `DATABASE_URL`
- `META_GRAPH_VERSION`
- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `META_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `CRON_SECRET` (opcional)

A integração Neon da Vercel normalmente fornece `DATABASE_URL` automaticamente ao projeto conectado.

Nenhuma credencial deve ser commitada no GitHub.

## Banco

O schema inicial está em `neon/schema.sql`.

## Webhook WhatsApp

Depois do deploy, configure na Meta:

`https://SEU-DOMINIO/api/webhooks/whatsapp`

O endpoint responde à verificação GET e recebe eventos POST. Se `META_APP_SECRET` estiver configurado, o POST também valida `X-Hub-Signature-256`.

## Sincronização Meta Ads

Endpoint:

`GET /api/sync/meta-ads`

Quando `CRON_SECRET` estiver configurado, envie:

`Authorization: Bearer <CRON_SECRET>`

## Estado atual

Sem banco/Meta configurados, o dashboard abre em modo de demonstração com dados explicitamente marcados como fictícios.
