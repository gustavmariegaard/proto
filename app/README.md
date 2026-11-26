# ciircle – appen (trin 1)

Den rigtige app til iPhone og Android, bygget med **React Native + Expo** og **Supabase**.
Prototypen (web) ligger stadig i roden af repoet og på branchen `prototype`.

## Hvad er med

- Landingsside og rigtig tilmelding i tre trin: navn og brugernavn (tjekkes live), fødselsdato (mindst 13 år, vises ikke på profilen), e-mail og adgangskode. Bekræftelsesmailen har et link, der logger ind. Profilen oprettes af databasen samtidig med kontoen.
- Log ind, glemt adgangskode (mail med link) og ny adgangskode.
- Billeder gøres mindre før upload (længste side 1080 px, profilbilleder 400 px).
- **Hjem:** opslag fra dem, du følger, med hjerter, kommentarer, svar og sortering (Relevante, Omdiskuterede, Nyeste, Ældste).
- **Opret:** tekst, op til 4 billeder, Offentlig debat med højst 5 tags, Tillad deling.
- **Offentlig debat:** interesser, enig/uenig-barometer (fordeling først efter stemme eller "Vis stemmer"), fællesskabsnoter med kilder og vurderinger, skjul afsender i debatten, rapportér (også "Forkert kategoriseret").
- **Beskeder** i realtid: samtaler, anmodninger og cirkler (grupper).
- **Notifikationer:** følg, følgeanmodning (godkend/afvis), hjerte, kommentar, note.
- **Profil:** egen og andres, gitter/liste, rediger profil, følg, bloker, anmeld, fjern følger, privat profil.
- **Indstillinger:** privat profil, følgeanmodninger, blokerede, skjult i debatten, interesser, gemt, privatlivserklæring, log ud, slet konto.

Ikke med endnu (trin 2–3): Flicks, moments, Torvet, begivenheder, grupper, MitID, forældrekontrol og ægte end-to-end-kryptering af beskeder.
Beskeder er beskyttet af databasens regler og krypteret på serveren, men **ikke** end-to-end. Appen skriver derfor ikke "End-to-end-krypteret".

## Mapper

| Mappe | Indhold |
| --- | --- |
| `src/app/` | Skærmene (Expo Router: hver fil er en side) |
| `src/components/` | Genbrugelige dele: knapper, opslagskort, barometer, noter … |
| `src/lib/` | Forbindelse til Supabase, login, billeder, push |
| `src/theme/` | Farver, skrift og ikoner (samme som prototypen) |
| `supabase/migrations/` | Databasen: tabeller og regler for, hvem der må se hvad |
| `supabase/tests/` | Test af reglerne med rigtige brugere |
| `supabase/functions/push/` | Sender push-notifikationer (skal slås til, se nedenfor) |

## Kør lokalt (gratis)

Kræver Node 20+ og Docker.

```bash
npm install
cp .env.example .env
npx supabase start          # lokal database, login og billeder
npx supabase db reset       # lægger databasen ind
npm run db:test             # 33 tests af privatlivsreglerne
npx expo start --web        # åbner appen i browseren
```

Bekræftelsesmails kan ses på http://127.0.0.1:54324 (Mailpit).
På en telefon: installér **Expo Go**, kør `npx expo start` og scan QR-koden (telefonen skal kunne nå computerens IP; sæt så `EXPO_PUBLIC_SUPABASE_URL` til computerens IP i stedet for 127.0.0.1).

## Fra lokal til test på telefoner

1. **Supabase-projekt** (gratis start): opret et projekt i region *Frankfurt (eu-central-1)*.
   - Kør migrationerne: `npx supabase link --project-ref <ref>` og `npx supabase db push`.
   - Authentication → URL Configuration: Site URL og Redirect URLs = appens webadresse (fx `https://gustavmariegaard.github.io/proto/app/**`).
   - Authentication → SMTP: Supabase' indbyggede mail sender kun få mails i timen. Til en test med flere personer kræves egen SMTP (fx en gratis plan hos en mailudbyder).
   - Indsæt *Project URL* og *Publishable key* i `eas.json` (preview/production) og i `.env`.
2. **Expo-konto** (gratis): `npx eas-cli@latest login`, derefter `npx eas-cli@latest init` (giver projekt-id til push).
3. **Android**: `npx eas-cli@latest build --profile preview --platform android` giver et link, testere kan installere fra. Senere Google Play intern test (25 USD én gang).
4. **iPhone**: kræver Apple Developer (99 USD/år). `npx eas-cli@latest build --profile production --platform ios` og `npx eas-cli@latest submit --platform ios` → TestFlight.
5. **Push**: deploy `supabase/functions/push` og opret to Database Webhooks (tabellerne `notifications` og `messages`, INSERT) – se kommentaren øverst i filen.

## Før appen åbnes for alle

- MitID og aldersgrænse, forældrekontrol.
- End-to-end-kryptering af beskeder (plan i dokumentet "ændringer og plan for en rigtig app").
- Moderation af rapporter (læses i dag i Supabase-dashboardet), sikkerhedsgennemgang, privatlivspolitik og databehandleraftaler.
- Fællesskabsnoter vises i testen med det samme. Slå den rigtige regel til ved at lade `notes_show_immediately()` returnere `false`.
