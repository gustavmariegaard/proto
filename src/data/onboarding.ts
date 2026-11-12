import type { IconName } from '../components/Icon';

/* Tekster fra Figma (Section 1 · Log ind og opret konto). */

export type ValuePoint = {
  slug: string;
  icon: IconName;
  title: string;
  /** Kort tekst på "Sådan fungerer ciircle" og øverst på Om-siden */
  summary: string;
  /** Pladsholdertekst i kortet på "Sådan fungerer ciircle" */
  howShort: string;
};

export const valuePoints: ValuePoint[] = [
  {
    slug: 'feed',
    icon: 'sliders',
    title: 'Du vælger, hvad dit feed bygger på',
    summary: 'Du vælger selv, hvad dit feed bygger på: venner, interesser eller nyeste. Du kan altid se, hvorfor noget vises.',
    howShort: '[Beskriv, hvordan valget virker, og hvordan det kontrolleres. Tilføj et konkret eksempel og skriv, hvem der er ansvarlig.]',
  },
  {
    slug: 'data',
    icon: 'lock',
    title: 'Data gemmes i EU',
    summary: 'Dine oplysninger gemmes i EU.',
    howShort: '[Beskriv, hvor data ligger, hvem der har adgang, og hvordan det kontrolleres. Tilføj, hvordan brugeren kan se og slette sine data.]',
  },
  {
    slug: 'eid',
    icon: 'check',
    title: 'Profiler bekræftes med eID',
    summary: 'Profiler bekræftes med et nationalt eID.',
    howShort: '[Beskriv, hvordan bekræftelsen sker, og hvad vi gemmer. Tilføj, hvad der sker, hvis en profil viser sig at være falsk.]',
  },
  {
    slug: 'annoncer',
    icon: 'shop',
    title: 'Annoncer fra virksomheder i EU',
    summary: 'Kun virksomheder i EU kan annoncere. Du kan se, hvorfor du ser en annonce.',
    howShort: '[Beskriv, hvordan virksomheder godkendes, og hvad de kan målrette på. Tilføj, hvordan brugeren kan se og klage over en annonce.]',
  },
  {
    slug: 'alder',
    icon: 'user',
    title: 'Aldersbekræftelse indbygget',
    summary: 'Alder bekræftes automatisk. Der er særlige indstillinger for unge.',
    howShort: '[Beskriv, hvilke begrænsninger der gælder, og hvordan de håndhæves. Tilføj, hvordan forældre kan se og styre det.]',
  },
];

/** Fælles pladsholdertekster på alle Om-sider */
export const valuePointDetail = {
  how: [
    '[Beskriv, hvordan funktionen virker i praksis, og hvem der er ansvarlig.]',
    '[Beskriv, hvordan det kontrolleres, og af hvem. Tilføj et konkret eksempel.]',
  ],
  check: '[Beskriv, hvor i appen brugeren kan se og styre det.]',
};

export const countries = [
  'Albanien', 'Andorra', 'Belgien', 'Bosnien-Hercegovina', 'Bulgarien', 'Cypern', 'Danmark', 'Estland',
  'Finland', 'Frankrig', 'Grækenland', 'Irland', 'Island', 'Italien', 'Kosovo', 'Kroatien', 'Letland',
  'Liechtenstein', 'Litauen', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Nederlandene',
  'Nordmakedonien', 'Norge', 'Polen', 'Portugal', 'Rumænien', 'San Marino', 'Schweiz', 'Serbien',
  'Slovakiet', 'Slovenien', 'Spanien', 'Storbritannien', 'Sverige', 'Tjekkiet', 'Tyskland', 'Ukraine',
  'Ungarn', 'Østrig',
];

export const suggestedInterests = [
  'Fotografi', 'Film', 'Løb', 'Klima', 'Sport', 'Litteratur', 'Politik', 'Gaming', 'Havearbejde',
];

export const legal = {
  vilkaar: {
    title: 'Vilkår',
    sections: [
      ['1. Hvem er vi', '[Beskriv, hvem der driver ciircle, og hvor selskabet er hjemmehørende.]'],
      ['2. Din konto', '[Beskriv, hvad det kræver at have en konto, og hvad eID-bekræftelsen betyder.]'],
      ['3. Hvad du må og ikke må', '[Beskriv reglerne for opslag, kommentarer og deling, og hvordan man anmelder indhold.]'],
      ['4. Annoncer', '[Beskriv, at kun virksomheder i EU kan annoncere, og hvordan annoncer vises.]'],
      ['5. Hvis du vil stoppe', '[Beskriv, hvordan man lukker sin konto, og hvad der sker med ens indhold.]'],
    ],
  },
  privatliv: {
    title: 'Privatlivspolitik',
    sections: [
      ['1. Hvad vi gemmer', '[Beskriv, hvilke oplysninger vi gemmer om dig, og hvad vi får fra eID-bekræftelsen.]'],
      ['2. Hvorfor vi gemmer det', '[Beskriv formålene og det retlige grundlag.]'],
      ['3. Hvor længe', '[Beskriv, hvor længe oplysningerne gemmes.]'],
      ['4. Dine rettigheder', '[Beskriv retten til indsigt, rettelse, sletning og dataportabilitet.]'],
      ['5. Annoncer og dine valg', '[Beskriv, hvad annoncer bygger på, og hvilke valg brugeren har.]'],
    ],
  },
} as const;
