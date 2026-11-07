# Migreringar

Versionerade SQL-migreringar (B-055). Inga migreringar finns i M1; de första kommer i M3.

| Mapp | Körs mot |
|---|---|
| `system/` | `grid_system`: företag, användare, medlemskap, konfiguration. Ingen verksamhetsdata. |
| `tenant/` | Varje företagsdatabas `grid_t_<företag>`. Varje modul har ett eget schema (`fleet`, `place`, …). |

**Regler**

- Filnamn: `NNNN_beskrivning.sql`, till exempel `0001_create_companies.sql`. Fyra siffror, löpande utan
  luckor, gemener, siffror och understreck i beskrivningen. Kontrolleras av `orderMigrations`.
- En migrering ändras aldrig när den har slagits ihop i `main`. Rättelser görs med en ny migrering.
- Vid driftsättning körs migreringarna mot systemdatabasen och mot alla företagsdatabaser, och
  resultatet loggas per företag. Misslyckas en migrering för ett företag stoppas driftsättningen.
- Körningen byggs i M3 med Kysely (typade frågor) och PostgreSQL 16+.
