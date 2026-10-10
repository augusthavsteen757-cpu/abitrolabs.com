# Arbejdsaftaler for dette repo

Ejeren (August) vil have, at alt er **meget sikkert og grundigt testet**. Det gælder altid:

## Test – altid, og på alle måder
- Kør **alle** testsæt efter hver ændring, før der committes og deployes:
  - `npx tsc --noEmit` og `npm run build` (i `fixflow/`)
  - Hele e2e-testen: start appen med `ALLOW_LOCAL_DB=1 ALLOW_SIMULATED_PAYMENTS=1 ALLOW_DEMO_MODE=1 npm start` efter `npm run db:push && npm run db:seed`, og kør `BASE_URL=http://localhost:3000 CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/e2e.mjs`
  - Beta-tilstanden (som er den, der kører live): start med `BETA_FREE=1 ALLOW_LOCAL_DB=1 ALLOW_DEMO_MODE=1 npm start` og test den
  - Uden AI-nøgle i drift må der aldrig vises eksempel-analyser: start `ALLOW_LOCAL_DB=1 npm start` (uden nøgle og uden ALLOW_DEMO_MODE) og kør `BASE_URL=http://localhost:3000 node scripts/no-ai-key.mjs`
  - Den read-only smoke-test mod en produktionslignende build: `BASE_URL=... node scripts/smoke.mjs`
  - Ved ændringer i AI-prompt, model eller SDK: `node eval/run-eval.mjs` mod en app med rigtig nøgle
- Skriv nye tests for ny funktionalitet og for hver fejl, der rettes.
- Test også fejlsituationer: ingen forbindelse, dobbeltklik/parallelle requests, forkerte filer, andre brugeres data, alle 8 sprog, mobil (390 px).
- Påstå aldrig, at noget virker, uden at have testet det. Kan noget ikke testes (fx live-siden er blokeret fra sandboxen), så sig det tydeligt.

## Sikkerhed og jura først
- Ingen hemmeligheder i chat, kode eller git. Nøgler lægges direkte i Render.
- Al tekst og markedsføring skal være sand og lovlig (forbrugeraftaleloven, markedsføringsloven, GDPR, AI-forordningen). Ved tvivl: vær forsigtig og sig det.
- Nye tekster skal findes på alle 8 sprog (`fixflow/src/i18n/dict/*.ts`); juridiske sider er på dansk.

## Kommunikation
- Svar på dansk, kort og konkret, med links og præcise klik-trin.
- Vær ærlig og kritisk – også hvis en idé ikke er god.
