# Tradyon Procurement — Prototype

End-to-end AI-first procurement OS. Same code that demos to design partners ships to production.

## Quick start — Demo mode (zero setup)

```bash
DEMO_MODE=1 pnpm dev
```

Runs entirely in-process (PGlite), bypasses Clerk auth, and falls back to canned LLM responses when no `ANTHROPIC_API_KEY` is set. No database, no accounts required. Visit http://localhost:3000/digest and explore the full UI.

## Production / staging setup

```bash
# 1. Create .env.local with the following:

DATABASE_URL=postgres://user:pass@host/db?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/digest
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding

# Channel adapters: "real" requires the adapter implementation (currently stubs that throw —
# keep on "mock" until you wire real adapters)
GMAIL_MODE=mock
WHATSAPP_CLOUD_MODE=mock
WHISPER_MODE=stub

# 2. Install dependencies and boot
pnpm install
pnpm db:migrate                    # applies migrations including the destructive 0002
pnpm build:demo-zip                # builds the demo chat-export ZIP for the upload flow
pnpm seed                          # populates Polico-shaped fixture data into the real DB
pnpm dev                           # or: pnpm build && pnpm start
```

Visit http://localhost:3000/sign-in and sign in with your Clerk dev user. You'll land on `/digest` with the full Polico seed (30 SKUs, 80 vendors, ~1200 quotes, agent policies, sample alerts, chat session).

> **Note on migration 0002:** This migration drops and recreates `vendor_contact` with a richer CRM shape. For fresh databases this is safe. If you have existing data in `vendor_contact`, export it first (see the comment at the top of `drizzle/migrations/0002_vendor_crm.sql`).

## Postgres provisioning

```bash
# Option A: local Docker
docker run -d --name tp-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
# DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres

# Option B: Neon dev branch via Vercel Marketplace (recommended for Vercel deploys)
```

## Demo flow

1. `/onboarding` — drop the bundled `vendor-patel-chat-export.zip`. Watch the processing panel structure quotes in real time.
2. `/digest` — see outliers + new quotes for the day.
3. `/compare/BLACK-PEPPER-5MM` — comparison table across vendors with normalized landed cost.
4. `/vendors/<id>` — auto-built vendor profile with score tier, CRM contacts, preferences, and recent quotes.
5. `/opportunities` — high-conviction buy opportunities with reasoning + counterfactuals.
6. `/insights/forecasts` — rolling-median forecasts per SKU.
7. `/agents` — agent policies + recent runs.
8. `/alerts` — create a price-below alert; ingest a fixture quote to trigger.
9. **Cmd+K (or click the lime FAB)** — TradeGenie chat with tool-calling.

All UI features (opportunity hub, CRM, RFQ templates, search, breadcrumbs, table views, in-context price trends, density heatmap) work identically in production. The only fallbacks in demo mode are: Postgres (PGlite), auth (Clerk skipped), and LLM (canned responses when no ANTHROPIC_API_KEY).

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
