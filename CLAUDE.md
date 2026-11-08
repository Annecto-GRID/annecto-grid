# Arbetsregler för Claude i annecto-grid

Kortversion av projektets instruktioner (claude.ai-projektet *Annecto Systems - Grid*). Vid
konflikt gäller projektets dokument *Systemarkitektur och utvecklingsprinciper* och beslutsloggen.

## Arkitektur

- Modulärt: varje modul (Fleet Manager, Place Manager, Planner …) ska kunna fungera och driftsättas
  självständigt. Moduler kommunicerar bara via definierade gränssnitt i `packages/contracts` eller
  via integrationslagret, aldrig genom att läsa varandras data direkt.
- Företagsdata är strikt separerad: en databas per företag (B-055). Vilket företag ett anrop gäller
  avgörs på servern av inloggad användare och valt företag, aldrig enbart av klienten.
- Dataflöden och synkronisering är konfigurerbara av administratör och fungerar utan AI.
- Varna innan du implementerar något som bryter mot detta.

## Kod

- TypeScript i strikt läge. Kod, filnamn och identifierare på engelska. Texter för användare
  bara via `@annecto-grid/i18n`, på sv, en och de.
- Håll isär presentation, affärslogik, datalagring och integrationer. Kärnlogik är ren (ingen DOM,
  databas eller nätverk) och ligger i `packages/<modul>-core`.
- Datum som `YYYY-MM-DD`, beräknade i UTC; "idag" i systemets tidszon (Europe/Stockholm).
- Validera all indata. Hemligheter läggs aldrig i repot; nya variabler dokumenteras i `.env.example`.
- Små, avgränsade ändringar. Bygg inte flera stora funktioner samtidigt.
- Ändra inte `fleet-core`s beteende utan beslut; testerna beskriver prototypens beteende.
- Prototyp och produktionskod hålls i takt: ett beslut som ändrar en prototyp ger en pull request
  här för det som redan finns i koden (se `docs/workflow.md`).

## Arbetsflöde

- Varje milstolpe börjar med en specifikation som användaren godkänner.
- Ändringar via pull request mot `main`. Beskrivningen följer mallen: vad, varför, påverkade
  moduler, hur det testats, kända begränsningar.
- Kör `pnpm check` innan pull request när beroenden kan installeras.
- Påstå aldrig att något fungerar om det inte har verifierats. Skilj på färdigt, prototyp och
  ej implementerat.
- Använd korrekt kollektivtrafikterminologi (tur/avgång, fordonsomlopp/förartjänst,
  trafikdag/trafikperiod, hållplats/hållplatsläge …).
