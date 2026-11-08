# Driftsättning (M2)

Servern hos Hetzner kör Annecto Grid i Docker. Caddy tar emot trafiken och sköter HTTPS. Test och
produktion körs som separata Docker Compose-projekt (`grid-test`, `grid-prod`) med egna nätverk.

```
Internet ─► Caddy (grid-edge) ─┬─► test.<domän> ─► grid-test: web (nginx) ─► api
                               └─► app.<domän>  ─► grid-prod: web (nginx) ─► api
```

| Miljö | Adress | När |
|---|---|---|
| Test | `https://test.<domän>` | Automatiskt när CI är grön på `main` |
| Produktion | `https://app.<domän>` | Bara när någon startar *Deploy* för hand med `prod` |

Containeravbilderna byggs i GitHub Actions och läggs i GitHubs containerregister
(`ghcr.io/annecto-grid/annecto-grid/api` och `/web`), märkta med commitens sha. Servern hämtar
dem; den bygger ingenting själv och har ingen kod från repot, bara filerna i `infra/deploy`.

## Engångsinstallation av servern

Förutsättningar: en Ubuntu 24.04-server hos Hetzner som du når med `ssh root@<ip>`, och en domän.

1. **DNS.** Hos domänregistratorn: skapa A-poster för `test` och `app` som pekar på serverns
   IPv4-adress. Kontrollera med `nslookup test.<domän>` att adressen stämmer.
2. **Hetzners brandvägg** (om du använder den): tillåt inkommande TCP 22, 80 och 443 samt UDP 443.
3. **Kör installationsskriptet** på servern:
   ```sh
   ssh root@<ip>
   nano bootstrap.sh        # klistra in innehållet i infra/server/bootstrap.sh, spara med Ctrl+O, Enter, Ctrl+X
   bash bootstrap.sh
   ```
   Skriptet tar några minuter. Det slår på automatiska säkerhetsuppdateringar och brandvägg, stänger
   av inloggning med lösenord, installerar Docker, skapar användaren `deploy` och en SSH-nyckel för
   GitHub. Sist skriver det ut tre värden.
4. **Lägg in värdena i GitHub:** repot → *Settings* → *Secrets and variables* → *Actions*.

   Fliken *Secrets* → *New repository secret*:

   | Namn | Värde |
   |---|---|
   | `DEPLOY_HOST` | Serverns IP-adress |
   | `DEPLOY_KNOWN_HOSTS` | Raderna som skriptet skriver ut under rubriken |
   | `DEPLOY_SSH_KEY` | Nyckeln från `-----BEGIN` till och med `-----END … KEY-----` |

   Fliken *Variables* → *New repository variable*:

   | Namn | Värde |
   |---|---|
   | `APP_DOMAIN` | Domänen utan `test.` eller `app.`, till exempel `annectogrid.se` |
   | `ACME_EMAIL` | Din e-postadress. Let's Encrypt skickar varningar om certifikat dit |

   Nyckeln visas bara en gång. Tappas den bort: ta bort raden `github-actions-annecto-grid` i
   `/home/deploy/.ssh/authorized_keys` på servern och kör skriptet igen.

5. **Första driftsättningen:** *Actions* → *Deploy* → *Run workflow* → `test`. Efter några minuter
   visar `https://test.<domän>` startsidan med versionsnummer.

## Vanliga åtgärder

- **Lägga ut i produktion:** *Actions* → *Deploy* → *Run workflow* → `prod`, och klistra in sha för
  commiten som ska ut (den som kör i test syns på startsidan och i *Deploy*-körningens logg).
  Tomt fält betyder senaste commit på `main`.
- **Gå tillbaka till en tidigare version:** samma sak med den tidigare commitens sha. Avbilderna
  finns kvar i registret.
- **Se vad som körs:** `ssh root@<ip> cat /srv/grid/test/deployments.log`.
- **Loggar:** `ssh root@<ip>` och sedan `docker compose -p grid-test logs --tail 100`.

## Säkerhet

- GitHub loggar in som `deploy`, som kan styra Docker men inte har `sudo`. Docker-åtkomst motsvarar i
  praktiken root på servern, så nyckeln `DEPLOY_SSH_KEY` ska bara finnas i GitHubs hemligheter.
- Servern loggar in i containerregistret med en tillfällig token från körningen och loggar ut efteråt.
  Ingen permanent GitHub-token finns på servern.
- Brandväggen släpper bara in SSH, HTTP och HTTPS. API:t nås bara via webbcontainern.

## Ingår inte i M2

Databas (M3), säkerhetskopior (M4), övervakning med avisering. Godkännande i GitHub före
produktion kräver betald plan för privata repon; tills vidare är det den manuella starten av
*Deploy* med `prod` som är godkännandet.
