# Locatto

Sistema de gestao imobiliaria com frontend em React + Vite e backend em Supabase.

## Requisitos

- Node.js 18+
- npm

## Desenvolvimento

```sh
npm install
npm run dev
```

App local: http://localhost:8080

## Build de producao

```sh
npm run build
npm run preview
```

## Variaveis de ambiente

Configure em `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`)
- `VITE_SUPABASE_PROJECT_ID`

Para Edge Functions de IA:

- `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_URL`

## Estrutura principal

- `src/` aplicacao React
- `supabase/functions/` Edge Functions
- `supabase/migrations/` migracoes SQL
