# Annecto Grid

Modulärt verksamhetssystem för kollektivtrafik och trafikoperatörer. Första modulen är
**Fleet Manager** (fordonsdatabasen).

**Status:** M1 – kodskelett. Ingen verksamhetsfunktion finns ännu. Appen visar systemets namn och
version, och Fleet Managers kärnlogik finns som eget paket med tester.

## Innehåll

```
apps/
  api/            Fastify-server: GET /health, GET /version
  web/            React-app (Vite): appram med systemnamn och version
packages/
  fleet-core/     Fleet Managers kärnlogik från prototypen + 27 enhetstester
  i18n/           texter på svenska, engelska och tyska + fullständighetskontroll
  ui/             designtokens (Roboto, ljust och mörkt tema)
  contracts/      API-kontrakt (typer och JSON Schema)
  auth/           tom grund, fylls i M3
  tenancy/        regler för migreringar; företag och databas per företag i M3
infra/            Dockerfile per app, docker-compose för lokal körning, nginx, driftsättning (deploy, server)
docs/             beslut och arbetsrutiner
```

## Krav

- Node.js 22 (se `.nvmrc`), minst 22.18
- pnpm 10 (`corepack enable` eller `npm install -g pnpm@10.28.0`)
- Docker med Compose (för att köra i containrar)

## Kom igång

```sh
pnpm install
pnpm dev:api      # API på http://localhost:3000
pnpm dev:web      # webb på http://localhost:5173 (anropar API:t via /api)
```

Kopiera `.env.example` till `.env` om du vill ändra port, loggnivå eller miljö.

## Testa och kontrollera

```sh
pnpm check        # allt nedan i samma ordning som i GitHub Actions
pnpm lint         # ESLint
pnpm format:check # Prettier (pnpm format rättar)
pnpm typecheck    # TypeScript i strikt läge, alla paket
pnpm i18n:check   # alla textnycklar finns på sv, en och de
pnpm test         # enhetstester (Vitest)
pnpm build        # bygger api och web
```

Bara ett paket: `pnpm --filter @annecto-grid/fleet-core test`.

## Köra i containrar

```sh
docker compose -f infra/docker-compose.yml up --build
```

- Webb: <http://localhost:8080> (nginx, skickar `/api` vidare till API:t)
- API: <http://localhost:3000/health> och <http://localhost:3000/version>

Stoppa med `docker compose -f infra/docker-compose.yml down`.

## Driftsättning

Testmiljön uppdateras automatiskt när CI är grön på `main`; produktion startas för hand. Installation av
servern och inställningar i GitHub: [docs/deploy.md](docs/deploy.md).

## Arbetsregler

Ändringar görs via pull request med gröna kontroller. Se [docs/workflow.md](docs/workflow.md),
bland annat läget för skyddet av `main`. Tekniska beslut finns i
[docs/decisions.md](docs/decisions.md).
