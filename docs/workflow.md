# Arbetsrutiner

## Pull requests

1. Skapa en gren från `main`, till exempel `m3/tenancy` eller `fix/version-endpoint`.
2. Gör ändringen och kör `pnpm check` lokalt.
3. Öppna en pull request. Mallen frågar efter vad, varför, påverkade moduler, hur det testats och
   kända begränsningar.
4. GitHub Actions kör jobben `checks` och `containers`. Båda måste vara gröna.
5. Granska och slå ihop med *Squash and merge*.

## Skydd för `main` (görs en gång, kräver administratörsrätt)

GitHub → repot → **Settings** → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**:

- **Ruleset name:** `main`
- **Enforcement status:** Active
- **Target branches:** *Add target* → *Include default branch*
- Markera:
  - **Restrict deletions**
  - **Require a pull request before merging**
  - **Require status checks to pass** → *Add checks* → `checks` och `containers`
    (de visas i listan efter första körningen i GitHub Actions)
  - **Block force pushes**
- **Create**.

Vill du kunna slå ihop dina egna pull requests utan en annan granskare, låt *Required approvals*
stå på 0.

## Commit-meddelanden

Engelska eller svenska, konsekvent inom en pull request. Kort första rad i imperativ, till exempel
`Add version endpoint`.

## Beroenden

- Versioner står på ett ställe: `catalog` i `pnpm-workspace.yaml`. Paket refererar till `catalog:`.
- `pnpm-lock.yaml` checkas in och används med `--frozen-lockfile` i CI och i containrar.
- Paket som får köra installationsskript listas i `onlyBuiltDependencies`.
