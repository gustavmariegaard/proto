# ciircle – prototype

Mobil-først web-app (PWA) til test af det sociale netværk ciircle.
Design: Figma-filen er den eneste kilde til udseende.

## Kør den lokalt

```bash
npm install
npm run dev
```

Åbn adressen, der vises i terminalen. På en computer vises appen i en iPhone-ramme.

## Test på iPhone

Appen kan udgives automatisk på GitHub Pages, hver gang branchen `prototype` opdateres:
https://gustavmariegaard.github.io/proto/ (kræver, at Pages er slået til i repoets indstillinger).

Åbn linket i Safari → Del → **Føj til hjemmeskærm**.
Vil du prøve velkomst og oprettelse igen, så tryk **Log ud** under Mere.

## Mapper

```
public/
  img/                 ← læg egne billeder her (ellers grå pladsholdere)
  favicon.svg          ← logoet fra Figma
  icon-*.png           ← app-ikoner til hjemmeskærmen
scripts/
  make-icons.mjs       ← laver app-ikonerne ud fra logoet
src/
  styles/
    tokens.css         ← farver, afstande, radier og typografi fra Figma
    global.css         ← skrifttyper, nulstilling og frirum øverst
    preview.css        ← iPhone-rammen på computer
  components/          ← fælles byggeklodser (knap, chip, avatar, opslag …)
  layout/AppShell.tsx  ← fast topbar, rullende indhold og flydende bundmenu
  screens/             ← skærmene (én fil pr. skærm)
  data/sample.ts       ← eksempeldata (ingen server endnu)
  App.tsx              ← hvilke adresser viser hvilke skærme
```

## Trin

1. ✅ Opsætning, tokens og fælles komponenter
2. ✅ Velkomst, log ind og oprettelse af profil
3. Hjem (Venner / Interesser), Moments og kommentarer som ark
4. Opret, Flicks og Beskeder (Alle, Personer, Cirkler)
5. Profil og Mere (Begivenheder, Grupper, Sider, Gemt, Torvet)
