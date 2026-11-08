# Arbetsrutiner

## Pull requests

1. Skapa en gren från `main`, till exempel `m3/tenancy` eller `fix/version-endpoint`.
2. Gör ändringen och kör `pnpm check` lokalt.
3. Öppna en pull request. Mallen frågar efter vad, varför, påverkade moduler, hur det testats och
   kända begränsningar.
4. GitHub Actions kör jobben `checks` och `containers`. Båda måste vara gröna.
5. Kontrollera att båda är gröna, granska och slå ihop med *Squash and merge*.
6. Ingen pushar direkt till `main`.

## Skydd för `main`

**Läge nu (2026-11-08): inte påslaget.** Repot är privat och ägs av ett GitHub-gratiskonto, och där
finns varken regeluppsättningar eller grenskydd. GitHub svarar *"Upgrade to GitHub Pro or make
this repository public"*. Tills vidare gäller reglerna ovan som arbetsrutin: GitHub hindrar inte en
sammanslagning när kontrollerna fallerar, så det måste kontrolleras före sammanslagningen.

Skyddet slås på när repot får GitHub Pro eller flyttas till en organisation med betald plan.
Senast inför M6 (första riktiga företag), eller tidigare om fler personer ska arbeta i koden.
Claudes arbetsmiljö kan inte ändra grenskydd, så det gör du själv:

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

## Prototyp och produktionskod hålls i takt

Prototyperna (Claude-artefakterna) är specifikationen. De förs inte över automatiskt. Därför gäller:

1. När ett beslut i beslutsloggen ändrar en prototyp öppnas samma dag en pull request här för det
   som redan finns i produktionskoden: kärnlogik (`packages/<modul>-core`), datamodell, API och
   texter. Pull requesten hänvisar till beslutet (B-xxx).
2. Delar som ännu inte finns i produktionskoden, till exempel Fleet Managers gränssnitt före M5,
   förs inte över då. De byggs från beslutsloggen och prototypen när milstolpen kommer.
3. Tabellen i `docs/decisions.md` får en rad per beslut som påverkar repot.
4. Ändras kärnlogik i prototypen ska motsvarande test i `packages/<modul>-core/test` ändras eller
   läggas till, så att testerna fortsätter att beskriva prototypens beteende.

## Commit-meddelanden

Engelska eller svenska, konsekvent inom en pull request. Kort första rad i imperativ, till exempel
`Add version endpoint`.

## Beroenden

- Versioner står på ett ställe: `catalog` i `pnpm-workspace.yaml`. Paket refererar till `catalog:`.
- `pnpm-lock.yaml` checkas in och används med `--frozen-lockfile` i CI och i containrar.
- Paket som får köra installationsskript listas i `onlyBuiltDependencies`.
