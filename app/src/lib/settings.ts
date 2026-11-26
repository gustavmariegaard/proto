/*
 * Tekster og lister til Indstillinger: sprog, oversættelse, offentlig person,
 * juridiske sider og forældrekontrol. Samme indhold som prototypen (src/data/settings.ts).
 */

/* ---------- Sprog ---------- */

export type Language = {
  /** BCP 47-kode, bruges også som lang-attribut */
  code: string;
  /** Sprogets eget navn, fx "Deutsch" */
  native: string;
  /** Dansk navn, fx "Tysk" */
  da: string;
};

/** Europas sprog. Sorteres efter dansk navn, når de vises. */
export const europeanLanguages: Language[] = [
  { code: 'da', native: 'Dansk', da: 'Dansk' },
  { code: 'sv', native: 'Svenska', da: 'Svensk' },
  { code: 'nb', native: 'Norsk bokmål', da: 'Norsk (bokmål)' },
  { code: 'nn', native: 'Norsk nynorsk', da: 'Norsk (nynorsk)' },
  { code: 'is', native: 'Íslenska', da: 'Islandsk' },
  { code: 'fo', native: 'Føroyskt', da: 'Færøsk' },
  { code: 'kl', native: 'Kalaallisut', da: 'Grønlandsk' },
  { code: 'fi', native: 'Suomi', da: 'Finsk' },
  { code: 'se', native: 'Davvisámegiella', da: 'Nordsamisk' },
  { code: 'en', native: 'English', da: 'Engelsk' },
  { code: 'ga', native: 'Gaeilge', da: 'Irsk' },
  { code: 'cy', native: 'Cymraeg', da: 'Walisisk' },
  { code: 'gd', native: 'Gàidhlig', da: 'Skotsk gælisk' },
  { code: 'de', native: 'Deutsch', da: 'Tysk' },
  { code: 'lb', native: 'Lëtzebuergesch', da: 'Luxembourgsk' },
  { code: 'nl', native: 'Nederlands', da: 'Nederlandsk' },
  { code: 'fy', native: 'Frysk', da: 'Frisisk' },
  { code: 'fr', native: 'Français', da: 'Fransk' },
  { code: 'br', native: 'Brezhoneg', da: 'Bretonsk' },
  { code: 'oc', native: 'Occitan', da: 'Occitansk' },
  { code: 'co', native: 'Corsu', da: 'Korsikansk' },
  { code: 'es', native: 'Español', da: 'Spansk' },
  { code: 'ca', native: 'Català', da: 'Catalansk' },
  { code: 'eu', native: 'Euskara', da: 'Baskisk' },
  { code: 'gl', native: 'Galego', da: 'Galicisk' },
  { code: 'pt', native: 'Português', da: 'Portugisisk' },
  { code: 'it', native: 'Italiano', da: 'Italiensk' },
  { code: 'sc', native: 'Sardu', da: 'Sardinsk' },
  { code: 'rm', native: 'Rumantsch', da: 'Rætoromansk' },
  { code: 'mt', native: 'Malti', da: 'Maltesisk' },
  { code: 'pl', native: 'Polski', da: 'Polsk' },
  { code: 'cs', native: 'Čeština', da: 'Tjekkisk' },
  { code: 'sk', native: 'Slovenčina', da: 'Slovakisk' },
  { code: 'hu', native: 'Magyar', da: 'Ungarsk' },
  { code: 'ro', native: 'Română', da: 'Rumænsk' },
  { code: 'bg', native: 'Български', da: 'Bulgarsk' },
  { code: 'el', native: 'Ελληνικά', da: 'Græsk' },
  { code: 'hr', native: 'Hrvatski', da: 'Kroatisk' },
  { code: 'sr', native: 'Српски', da: 'Serbisk' },
  { code: 'bs', native: 'Bosanski', da: 'Bosnisk' },
  { code: 'cnr', native: 'Crnogorski', da: 'Montenegrinsk' },
  { code: 'sl', native: 'Slovenščina', da: 'Slovensk' },
  { code: 'mk', native: 'Македонски', da: 'Makedonsk' },
  { code: 'sq', native: 'Shqip', da: 'Albansk' },
  { code: 'et', native: 'Eesti', da: 'Estisk' },
  { code: 'lv', native: 'Latviešu', da: 'Lettisk' },
  { code: 'lt', native: 'Lietuvių', da: 'Litauisk' },
  { code: 'uk', native: 'Українська', da: 'Ukrainsk' },
  { code: 'be', native: 'Беларуская', da: 'Hviderussisk' },
  { code: 'ru', native: 'Русский', da: 'Russisk' },
  { code: 'tr', native: 'Türkçe', da: 'Tyrkisk' },
];

export const languageByCode = (code: string) => europeanLanguages.find((l) => l.code === code) ?? europeanLanguages[0];

export const translationToggles = [
  { id: 'oversaet-opslag', title: 'Oversæt opslag automatisk', hint: 'Opslag på andre sprog vises på dit standardsprog.' },
  { id: 'oversaet-beskeder', title: 'Oversæt beskeder', hint: 'Du kan altid se den originale tekst.' },
];

/* ---------- Offentlig person ---------- */

export const publicCategories = ['Politik', 'Medier', 'Kultur', 'Sport', 'Erhverv', 'Andet'];

export const publicCriteria = [
  'Du har en offentlig rolle, fx som politiker, journalist, kunstner eller atlet.',
  'Du omtales jævnligt i medier, der ikke er dine egne.',
  'Din profil er dig selv, ikke en fanside eller en virksomhed.',
];

export const evidenceHints = [
  'Link, fx artikel i et medie',
  'Link, fx officiel profilside',
  'Link, fx Wikipedia eller interview',
];

/* ---------- Om og jura ---------- */

export type LegalDoc = {
  title: string;
  intro: string;
  sections: [heading: string, text: string][];
};

export const legalDocs = {
  privatlivspolitik: {
    title: 'Privatlivspolitik',
    intro: 'Her kan du læse, hvilke oplysninger ciircle behandler om dig, hvorfor, og hvilke rettigheder du har.',
    sections: [
      [
        'Dataansvarlig',
        'ciircle ApS er dataansvarlig for behandlingen af dine personoplysninger. Du kan kontakte os på privatliv@ciircle.eu, hvis du har spørgsmål.',
      ],
      [
        'Hvad vi behandler',
        'Navn, brugernavn, e-mail, profilbillede og fødselsdato. Det, du selv deler: opslag, kommentarer, billeder og beskeder. Tekniske oplysninger som log ind-tidspunkter.',
      ],
      [
        'Hvorfor',
        'For at levere tjenesten, holde den sikker og overholde loven. Behandlingen sker på grundlag af vores aftale med dig (GDPR art. 6, stk. 1, litra b) og vores retlige forpligtelser (litra c).',
      ],
      [
        'Annoncer',
        'Annoncer bygger kun på de emner, du selv har valgt, og på dit land. Vi bruger ikke dine beskeder eller din færden på andre sider til annoncer.',
      ],
      [
        'Hvor dine data ligger',
        'Data opbevares på servere i Frankfurt (EU). I testperioden drives serverne af Supabase, som er et amerikansk firma. Før appen åbnes for alle, flyttes data til en europæisk udbyder.',
      ],
      [
        'Hvor længe',
        'Vi gemmer dine oplysninger, så længe du har en konto. Sletter du kontoen, slettes din profil, dine opslag, billeder og beskeder med det samme.',
      ],
      [
        'Dine rettigheder',
        'Du har ret til indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og til at gøre indsigelse. Du kan klage til Datatilsynet på datatilsynet.dk.',
      ],
    ],
  },
  databehandleraftale: {
    title: 'Databehandleraftale',
    intro: 'Aftalen gælder, når ciircle behandler personoplysninger på vegne af en side, gruppe eller virksomhed, der bruger ciircle.',
    sections: [
      [
        'Parter',
        'Den dataansvarlige er den organisation, der opretter en side eller gruppe på ciircle. Databehandleren er ciircle ApS.',
      ],
      [
        'Formål og omfang',
        'ciircle behandler kun oplysninger om medlemmer, følgere og deltagere for at drive siden eller gruppen – fx medlemslister, tilmeldinger til begivenheder og beskeder.',
      ],
      [
        'Instruks',
        'ciircle behandler kun oplysningerne efter dokumenteret instruks fra den dataansvarlige og bruger dem ikke til egne formål.',
      ],
      [
        'Fortrolighed og sikkerhed',
        'Medarbejdere med adgang har tavshedspligt. Data krypteres under overførsel og opbevaring, og adgang logges.',
      ],
      [
        'Underdatabehandlere',
        'ciircle bruger kun underdatabehandlere i EU. En opdateret liste findes på ciircle.eu/underdatabehandlere, og den dataansvarlige får besked før ændringer.',
      ],
      [
        'Brud på sikkerheden',
        'ciircle underretter den dataansvarlige uden unødig forsinkelse og senest 48 timer efter, at et brud er opdaget.',
      ],
      [
        'Ophør',
        'Når aftalen ophører, sletter ciircle alle oplysninger inden 30 dage, medmindre loven kræver andet.',
      ],
    ],
  },
} satisfies Record<string, LegalDoc>;

export type LegalKind = keyof typeof legalDocs;

/** Eksemplet i forhåndsvisningen: samme sætning på de mest brugte sprog */
const sentence: Record<string, string> = {
  da: 'Sikke en smuk aften ved søen! Vi blev, til solen gik ned.',
  de: 'Was für ein schöner Abend am See! Wir sind geblieben, bis die Sonne untergegangen ist.',
  en: 'What a beautiful evening by the lake! We stayed until the sun went down.',
  sv: 'Vilken vacker kväll vid sjön! Vi stannade tills solen gick ner.',
  nb: 'For en vakker kveld ved sjøen! Vi ble til solen gikk ned.',
  fr: 'Quelle belle soirée au bord du lac ! Nous sommes restés jusqu’au coucher du soleil.',
  es: '¡Qué tarde tan bonita junto al lago! Nos quedamos hasta que se puso el sol.',
  it: 'Che bella serata al lago! Siamo rimasti fino al tramonto.',
  nl: 'Wat een mooie avond aan het meer! We bleven tot de zon onderging.',
  pl: 'Co za piękny wieczór nad jeziorem! Zostaliśmy, aż zaszło słońce.',
  fi: 'Mikä kaunis ilta järven rannalla! Jäimme, kunnes aurinko laski.',
};

/** Forhåndsvisning: et opslag på tysk (eller engelsk, hvis man har valgt tysk), oversat til det valgte sprog */
export function translationPreview(code: string) {
  const fromCode = code === 'de' ? 'en' : 'de';
  return {
    name: fromCode === 'de' ? 'Lena Hoffmann' : 'Emma Clarke',
    meta: fromCode === 'de' ? 'Hamburg · 2 t.' : 'Dublin · 2 t.',
    from: languageByCode(fromCode).da.toLowerCase(),
    original: sentence[fromCode],
    /** null = vi har ikke eksemplet på det sprog */
    translated: sentence[code] ?? null,
  };
}

/** Europas sprog, Dansk først og resten efter dansk navn */
export const sortedLanguages = [...europeanLanguages].sort((a, b) => (a.code === 'da' ? -1 : b.code === 'da' ? 1 : a.da.localeCompare(b.da, 'da')));

/* ---------- Forældrekontrol ---------- */

export const childAreas = [
  { id: 'moments', title: 'Moments', hint: 'Se og dele moments, der forsvinder efter 24 timer.' },
  { id: 'flicks', title: 'Flicks', hint: 'Korte videoer. Kun fra folk og sider, barnet følger.' },
  { id: 'debat', title: 'Offentlig debat', hint: 'Opslag om emner fra personer, barnet ikke kender.' },
  { id: 'sider', title: 'Sider og interesser', hint: 'Nyt fra sider, barnet følger.' },
  { id: 'grupper', title: 'Grupper', hint: 'Fx sportsklubben eller klassens gruppe.' },
  { id: 'torvet', title: 'Torvet', hint: 'Køb og salg mellem brugere.' },
  { id: 'begivenheder', title: 'Begivenheder', hint: 'Se og tilmelde sig begivenheder.' },
] as const;

export const screenTimeOptions = ['30 min.', '60 min.', '2 timer', 'Ingen grænse'];

/** Dansk ejefald: Emil → Emils, Klaus → Klaus' */
export const possessive = (name: string) => (/[sxz]$/i.test(name) ? `${name}'` : `${name}s`);

/** Alder ud fra fødselsdato */
export function ageOf(birthdate: string | null) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
