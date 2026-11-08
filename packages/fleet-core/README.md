# @annecto-grid/fleet-core

Fleet Managers kärnlogik: ren logik utan DOM, databas och nätverk. Förd över från prototypens `Core`
(artefakten *Fleet Manager · Annecto Grid (prototyp v2)*) till TypeScript i M1, **utan ändrat beteende**.
De publika namnen är desamma som i prototypen.

| Fil | Innehåll | Beslut |
|---|---|---|
| `normalize.ts` | Normalisering av text, regnummer, VIN, hjulformel och tal | B-005 |
| `identifiers.ts` | UUID, VIN, hjulformel | B-005 |
| `dates.ts` | Datum i systemets tidszon (Europe/Stockholm) | – |
| `status.ts` | Fordonsstatus, frigörande status | B-005, B-039 |
| `inspection.ts` | Besiktning, körförbud, kvittering | B-021, B-022 |
| `history.ts` | Historikposter, historikrader, rättelser, ordning | B-023, B-026, B-033, B-036 |
| `odometer.ts` | Mätarställning vid inläggning | B-036 |
| `transfer.ts` | Skicka fordon, matchning av stamdata på namn | B-039 |
| `mileage.ts` | Körda km från Dispatcher | B-027, B-029 |
| `statistics.ts` | Statistik | B-032 |
| `custom-fields.ts` | Egna fält, Ja/Nej/Okänt, Annat, kommentarer | B-019, B-046, B-049 |
| `fields.ts`, `validation.ts`, `diff.ts` | Fältdefinitioner, validering, ändringshistorik | B-005, B-006, B-014 |
| `model-registry.ts` | Modellregister | B-007 |
| `platform/texts.ts` | Textupplösning, namn per språk – **flyttas till `i18n` i M3** | B-003, B-015, B-016 |
| `platform/branding.ts` | Kontrast och logotyper – **flyttas till `ui` i M3** | B-017, B-037 |
| `platform/integration.ts` | Moduler och dataflödesstatus – **flyttas till `tenancy` i M3** | B-018 |

## Tester

`test/core.test.ts` har 27 tester, ett per område i prototypens kärntester
(*Annecto_Grid_Fleet_Manager_Prototyp_v2*, avsnitt 3). Prototypens testfil fanns inte med i artefakten,
så testerna är skrivna på nytt från prototypens kod och testbeskrivning. De förväntade värdena beskriver
prototypens beteende och har körts mot både prototypens ursprungliga `Core` och den här koden.

```sh
pnpm --filter @annecto-grid/fleet-core test
```
