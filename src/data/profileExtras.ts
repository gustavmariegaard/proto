import { img, side } from './sample';

/*
 * Ekstra indhold på andres profiler: samlinger, tekstopslag, billeder og flicks.
 * Eksempeldata til prototypen (ikke fra Figma). Billederne er fra Figma og fra brugeren.
 */

export type ExtraCollection = { id: string; title: string; photos: string[] };
export type ExtraText = { id: string; text: string; time: string };
export type ProfileExtras = {
  pinned?: string;
  collections: ExtraCollection[];
  texts: ExtraText[];
  photos: string[];
  flicks: string[];
};

const extras: Record<string, ProfileExtras> = {
  'mette.lund': {
    pinned: 'Vinterbadning hver søndag klokken 9 ved broen. Alle er velkomne – tag en varm trøje med.',
    collections: [
      { id: 'soen', title: 'Ved søen', photos: [img('soe.jpg'), img('familie-soe.jpg'), img('aften.jpg')] },
      { id: 'byen', title: 'Byen', photos: [img('nyhavn.jpg'), img('cykelsti.jpg')] },
      { id: 'haven', title: 'Haven', photos: [img('have.jpg'), img('mad.jpg')] },
    ],
    texts: [
      { id: 't1', text: 'Nogen der har et godt tip til en varm vinterjakke, der ikke koster en formue?', time: 'I går' },
      { id: 't2', text: 'Tak for i aftes. Det var dejligt at se jer alle sammen igen.', time: 'For 4 dage siden' },
    ],
    photos: [img('aften.jpg'), img('soe.jpg'), img('have.jpg'), img('nyhavn.jpg'), img('familie-soe.jpg')],
    flicks: [img('soe.jpg'), img('aften.jpg'), img('nyhavn.jpg')],
  },
  'jonas.krogh': {
    pinned: 'Træning tirsdag og torsdag klokken 18 i Hallen. Nye spillere er altid velkomne.',
    collections: [
      { id: 'kampe', title: 'Kampe', photos: [img('haandbold.jpg'), side('hallen.jpg')] },
      { id: 'holdet', title: 'Holdet', photos: [img('begivenhed.jpg'), img('dans.jpg')] },
    ],
    texts: [
      { id: 't1', text: 'Husk at melde afbud i god tid, hvis I ikke kan komme til kampen.', time: 'I går' },
      { id: 't2', text: 'Vi mangler en dommer til lørdag. Nogen der kender en?', time: 'For 5 dage siden' },
    ],
    photos: [img('haandbold.jpg'), side('hallen.jpg'), img('begivenhed.jpg')],
    flicks: [img('haandbold.jpg'), side('hallen.jpg')],
  },
  'anna.noergaard': {
    collections: [
      { id: 'cykel', title: 'Cykelstier', photos: [img('cykelsti.jpg'), img('cykel.jpg')] },
      { id: 'byrum', title: 'Grønne byrum', photos: [img('have.jpg'), img('soe.jpg')] },
    ],
    texts: [
      { id: 't1', text: 'Borgermødet om den nye plads er flyttet til onsdag. Kom og sig din mening.', time: 'For 2 dage siden' },
    ],
    photos: [img('cykelsti.jpg'), img('cykel.jpg'), img('have.jpg'), img('familie-soe.jpg')],
    flicks: [img('cykelsti.jpg')],
  },
  'peter.holm': {
    collections: [
      { id: 'familie', title: 'Familien', photos: [img('familie-soe.jpg'), img('spisebord.jpg')] },
      { id: 'musik', title: 'Musik', photos: [img('dans.jpg'), img('begivenhed.jpg')] },
    ],
    texts: [{ id: 't1', text: 'Hvem kommer med til koncert i Kulturhuset på fredag?', time: 'I går' }],
    photos: [img('familie-soe.jpg'), img('spisebord.jpg'), img('dans.jpg')],
    flicks: [img('dans.jpg'), img('familie-soe.jpg')],
  },
  'sofie.holm': {
    collections: [
      { id: 'bagning', title: 'Bagning', photos: [img('mad.jpg'), img('spisebord.jpg')] },
      { id: 'hjem', title: 'Hjemme', photos: [img('have.jpg')] },
    ],
    texts: [{ id: 't1', text: 'Surdej forsøg nummer to er i ovnen. Krydser fingre.', time: 'I dag' }],
    photos: [img('mad.jpg'), img('spisebord.jpg'), img('have.jpg')],
    flicks: [img('mad.jpg')],
  },
  'ahmed.rahimi': {
    collections: [{ id: 'nyt', title: 'Ny lejlighed', photos: [img('toej.jpg'), img('computer.jpg')] }],
    texts: [{ id: 't1', text: 'Tak til alle, der hjalp med flytningen. I er guld værd.', time: 'I dag' }],
    photos: [img('toej.jpg'), img('computer.jpg'), img('begivenhed.jpg')],
    flicks: [img('begivenhed.jpg')],
  },
  'karen.bech': {
    collections: [{ id: 'gaarden', title: 'Gården', photos: [img('spisebord.jpg'), img('have.jpg')] }],
    texts: [{ id: 't1', text: 'Vi mangler et par borde til fællesspisningen. Kan nogen låne os nogle?', time: 'I går' }],
    photos: [img('spisebord.jpg'), img('have.jpg'), img('nyhavn.jpg')],
    flicks: [img('nyhavn.jpg')],
  },
  kulturhuset: {
    pinned: 'Se hele programmet for vinteren på vores side. Billetter i døren eller online.',
    collections: [
      { id: 'scenen', title: 'Scenen', photos: [img('dans.jpg'), img('begivenhed.jpg')] },
      { id: 'teater', title: 'Teater', photos: [side('teater.jpg')] },
    ],
    texts: [{ id: 't1', text: 'Fredagens koncert er udsolgt. Vi lægger ekstra billetter ud ved døren.', time: 'I dag' }],
    photos: [img('dans.jpg'), img('begivenhed.jpg'), side('teater.jpg')],
    flicks: [img('dans.jpg'), img('begivenhed.jpg')],
  },
  hallen: {
    collections: [{ id: 'hallen', title: 'Hallen', photos: [side('hallen.jpg'), img('haandbold.jpg')] }],
    texts: [{ id: 't1', text: 'Åbent for fri leg i hal 1 søndag fra 10 til 14.', time: 'I går' }],
    photos: [side('hallen.jpg'), img('haandbold.jpg')],
    flicks: [img('haandbold.jpg')],
  },
  'det.lokale.bageri': {
    collections: [{ id: 'bagvaerk', title: 'Bagværk', photos: [side('bageri.jpg'), img('mad.jpg'), img('spisebord.jpg')] }],
    texts: [{ id: 't1', text: 'Dagens brød: rugbrød med solsikkekerner og surdejsbolle med rosmarin.', time: 'I dag' }],
    photos: [side('bageri.jpg'), img('mad.jpg'), img('spisebord.jpg')],
    flicks: [side('bageri.jpg')],
  },
  cykelvaerkstedet: {
    collections: [{ id: 'vaerkstedet', title: 'Værkstedet', photos: [side('vaerksted.jpg'), img('cykel.jpg')] }],
    texts: [{ id: 't1', text: 'Vi har lukket mandag på grund af vareoptælling.', time: 'I går' }],
    photos: [side('vaerksted.jpg'), img('cykel.jpg'), img('cykelsti.jpg')],
    flicks: [img('cykel.jpg')],
  },
  'byens.bibliotek': {
    collections: [{ id: 'boeger', title: 'Bøger', photos: [side('bibliotek.jpg'), img('computer.jpg')] }],
    texts: [{ id: 't1', text: 'Månedens bog er klar til udlån. Spørg efter den ved skranken.', time: 'I går' }],
    photos: [side('bibliotek.jpg'), img('computer.jpg')],
    flicks: [side('bibliotek.jpg')],
  },
  teaterforeningen: {
    collections: [{ id: 'proever', title: 'Prøver', photos: [side('teater.jpg'), img('toej.jpg')] }],
    texts: [{ id: 't1', text: 'Næste prøve er onsdag klokken 19. Husk manuskriptet.', time: 'I går' }],
    photos: [side('teater.jpg'), img('toej.jpg')],
    flicks: [side('teater.jpg')],
  },
};

const empty: ProfileExtras = { collections: [], texts: [], photos: [], flicks: [] };

export function extrasFor(handle: string): ProfileExtras {
  return extras[handle] ?? empty;
}
