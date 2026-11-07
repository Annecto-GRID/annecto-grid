# Tekniska beslut

Projektets beslutslogg (B-001 och framåt) förs i claude.ai-projektet *Annecto Systems - Grid*
(`Annecto_Grid_Beslutslogg*.md`). Här finns de beslut som rör repot och kodens uppbyggnad, med
hänvisning till beslutsloggen.

| Beslut | Innehåll | Källa |
|---|---|---|
| B-055 | Hetzner Cloud, PostgreSQL med en databas per företag (`grid_system` + `grid_t_<företag>`), monorepo i GitHub, driftsättning via GitHub Actions | Beslutslogg 3, *Driftsättning fas 0* |
| M1 | TypeScript strikt, Node.js 22 LTS, pnpm workspaces, Fastify, React + Vite, PostgreSQL 16+ via Kysely med versionerade SQL-migreringar, Vitest och Playwright, ESLint + Prettier | *M1 Kodskelett – specifikation* |
| M1 | Fleet Managers kärnlogik flyttas oförändrad till `packages/fleet-core`. Textupplösning, kontrast/logotyp och dataflödesstatus ligger under `platform/` och flyttas till `i18n`, `ui` och `tenancy` i M3 | *M1 Kodskelett – specifikation*, avsnitt 4 |

## Detaljer från M1

- **Workspace-paket som TypeScript-källkod.** Paketen exporterar `src/index.ts` direkt. Vite och
  Vitest kompilerar dem; API:t buntas med esbuild till en fil för containern. Inget separat
  byggsteg per paket behövs.
- **Ett ställe för versioner.** `catalog` i `pnpm-workspace.yaml`.
- **Webben anropar API:t på samma ursprung** (`/api`). I utveckling via Vites proxy, i containern
  via nginx. Ingen CORS behövs.
- **Testerna för kärnlogiken** är skrivna på nytt, eftersom prototypens testfil inte sparades med
  artefakten. De 27 testerna täcker samma områden, och samma tester går igenom mot prototypens
  ursprungliga `Core`. Dessutom jämfördes porten mot prototypen med slumpade indata (cirka 99 000
  anrop, inga skillnader) innan pull requesten öppnades.
