# Tradyon Procurement — Prototype

End-to-end AI-first procurement OS. Same code that demos to design partners ships to production.

## Quick start

```bash
# 1. Provision Postgres (Neon dev branch via Vercel Marketplace, or local Docker)
docker run -d --name tp-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
# Set DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres in .env.local

# 2. Set ANTHROPIC_API_KEY (required for extraction + chat + agents) in .env.local
# 3. Set Clerk keys (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) in .env.local
# 4. Optionally set BLOB_READ_WRITE_TOKEN for file uploads (else falls back to local URLs)

pnpm install
pnpm db:migrate
pnpm build:demo-zip
pnpm seed
pnpm dev
```

Visit http://localhost:3000/sign-in and sign in with the Clerk dev user. You'll land on `/digest` with the full Polico seed (30 SKUs, 80 vendors, ~1200 quotes, agent policies, sample alerts, chat session).

## Demo flow

1. `/onboarding` — drop the bundled `vendor-patel-chat-export.zip`. Watch the processing panel structure quotes in real time.
2. `/digest` — see outliers + new quotes for the day.
3. `/compare/BLACK-PEPPER-5MM` — comparison table across vendors with normalized landed cost.
4. `/vendors/<id>` — auto-built vendor profile with score tier and recent quotes.
5. `/opportunities` — high-conviction buy opportunities with reasoning + counterfactuals.
6. `/insights/forecasts` — rolling-median forecasts per SKU.
7. `/agents` — agent policies + recent runs.
8. `/alerts` — create a price-below alert; ingest a fixture quote to trigger.
9. **Cmd+K (or click the lime FAB)** — TradeGenie chat with tool-calling.

## CI smoke

```bash
# Terminal A
pnpm dev

# Terminal B
pnpm demo:smoke   # uploads the demo zip, polls until processing completes, asserts ✅
```

## Deploy to Vercel

```bash
vercel link
# Provision Neon Postgres + Vercel Blob via Marketplace
# Add Clerk integration (auto-provisions NEXT_PUBLIC_CLERK_* + CLERK_SECRET_KEY)
vercel env pull
pnpm db:migrate
pnpm build:demo-zip
pnpm seed
vercel --prod
```

## Architecture summary

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4
- Postgres + Drizzle (30 tables), all multi-tenant from day one
- Anthropic SDK for classification + extraction; Vercel AI SDK for streaming chat
- Clerk auth with org-scoped RBAC
- Real WhatsApp Chat Export parser (production-ready), real normalization engine, real LLM extraction pipeline
- 5 opt-in agents (daily summary, follow-up, negotiation, buy-now, vendor discovery) with audit log
- TradeGenie chat with 5 tools (search vendors, find outliers, compare quotes, price history, list RFQs)

## What ships behind a v1.1 flag

- Real Gmail OAuth ingestion (currently mock adapter)
- Real WhatsApp Cloud API send (currently mock adapter)
- Real Whisper voice transcription (currently stub)
- Real shipment-data-driven vendor discovery (currently stub fixtures)
