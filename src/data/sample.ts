import type { AvatarTone } from '../components/Avatar';
import type { Post } from '../components/PostCard';

/*
 * Eksempeldata. Tekster er hentet fra Figma.
 * Billeder er grå pladsholdere. Læg egne billeder i public/img og
 * skriv stien her, fx image: '/img/aften.jpg' eller avatarSrc: '/img/mette.jpg'.
 */

/** Sti til et billede fra Figma i public/img/figma (virker også under /proto/ på GitHub Pages) */
export const img = (file: string) => `${import.meta.env.BASE_URL}img/figma/${file}`;

export type Person = { name: string; fullName: string; tone: AvatarTone; avatarSrc?: string };

export const people: Record<string, Person> = {
  mette: { name: 'Mette', fullName: 'Mette Lund', tone: 'blue', avatarSrc: img('mette.jpg') },
  jonas: { name: 'Jonas', fullName: 'Jonas Krogh', tone: 'sage', avatarSrc: img('jonas.jpg') },
  anna: { name: 'Anna', fullName: 'Anna Nørgaard', tone: 'sand', avatarSrc: img('anna.jpg') },
  peter: { name: 'Peter', fullName: 'Peter', tone: 'rose', avatarSrc: img('peter.jpg') },
  sofie: { name: 'Sofie', fullName: 'Sofie Holm', tone: 'sand', avatarSrc: img('person-d.jpg') },
  ahmed: { name: 'Ahmed', fullName: 'Ahmed Rahimi', tone: 'blue', avatarSrc: img('person-e.jpg') },
  karen: { name: 'Karen', fullName: 'Karen Bech', tone: 'sage', avatarSrc: img('person-b.jpg') },
};

/* ---------- Moments ---------- */

export type Moment = {
  id: string;
  personId: keyof typeof people;
  /** Fx "2 timer siden" */
  time: string;
  /** Sti til billede i public/img, ellers grå pladsholder */
  image?: string;
};

/** Hver persons moments i rækkefølge. Mette har fire (fire prikker i Figma). */
export const moments: Moment[] = [
  { id: 'm1', personId: 'mette', time: '2 timer siden', image: img('aften.jpg') },
  { id: 'm2', personId: 'mette', time: '2 timer siden', image: img('soe.jpg') },
  { id: 'm3', personId: 'mette', time: '2 timer siden', image: img('have.jpg') },
  { id: 'm4', personId: 'mette', time: '2 timer siden', image: img('nyhavn.jpg') },
  { id: 'j1', personId: 'jonas', time: '2 timer siden', image: img('haandbold.jpg') },
  { id: 'a1', personId: 'anna', time: '2 timer siden', image: img('familie-soe.jpg') },
  { id: 'p1', personId: 'peter', time: '2 timer siden', image: img('cykelsti.jpg') },
  { id: 's1', personId: 'sofie', time: '3 timer siden', image: img('mad.jpg') },
  { id: 's2', personId: 'sofie', time: '3 timer siden', image: img('have.jpg') },
  { id: 'h1', personId: 'ahmed', time: '5 timer siden', image: img('begivenhed.jpg') },
  { id: 'k1', personId: 'karen', time: 'i går', image: img('nyhavn.jpg') },
];

/** Hvem der er set fra start (grå ring i Figma) */
export const initiallySeen = ['anna', 'peter', 'karen'];

/* ---------- Opslag ---------- */

/**
 * venner = Hjem › Venner, interesser = Hjem › Interesser (nyt fra sider, man følger),
 * debat = Opdag › Offentlig debat (opslag om emner)
 */
export type FeedPost = Post & { feed: 'venner' | 'interesser' | 'debat'; topic?: string };

export const posts: FeedPost[] = [
  {
    id: 'p-mette',
    feed: 'venner',
    author: 'Mette Lund',
    avatarSrc: img('mette.jpg'),
    tone: 'blue',
    meta: 'Til Venner · for 2 timer siden',
    text: 'Sidste aften før vinteren sætter ind. Tak for en god sommer, alle sammen.',
    image: img('aften.jpg'),
  },
  {
    id: 'p-jonas',
    feed: 'venner',
    author: 'Jonas Krogh',
    avatarSrc: img('jonas.jpg'),
    tone: 'sage',
    meta: 'i går',
    group: { name: 'Håndboldholdet', initials: 'HB', tone: 'blue', avatarSrc: img('haandbold.jpg') },
    text: 'Træning flyttet til torsdag klokken 18. Hallen er booket, tag begge sæt tøj med.',
  },
  /* ---------- Ekstra eksempelindhold (ikke fra Figma) ---------- */
  {
    id: 'p-sofie',
    feed: 'venner',
    author: 'Sofie Holm',
    avatarSrc: img('person-d.jpg'),
    tone: 'sand',
    meta: 'Til Venner · for 3 timer siden',
    text: 'Første forsøg med surdejsbrød. Det blev fladt, men det smager fantastisk. Næste gang skal det nok hæve.',
    image: img('mad.jpg'),
  },
  {
    id: 'p-ahmed',
    feed: 'venner',
    author: 'Ahmed Rahimi',
    avatarSrc: img('person-e.jpg'),
    tone: 'blue',
    meta: 'Til Venner · for 5 timer siden',
    text: 'Er der nogen, der har en trailer, jeg kan låne på lørdag? Vi flytter endelig ind i den nye lejlighed.',
  },
  {
    id: 'p-mette-2',
    feed: 'venner',
    author: 'Mette Lund',
    avatarSrc: img('mette.jpg'),
    tone: 'blue',
    meta: 'Til Venner · i går',
    text: 'Morgentur ved vandet inden arbejde. Det er koldt nu, men lyset er helt særligt.',
    image: img('soe.jpg'),
  },
  {
    id: 'p-karen',
    feed: 'venner',
    author: 'Karen Bech',
    avatarSrc: img('person-b.jpg'),
    tone: 'sage',
    meta: 'i går',
    group: { name: 'Naboer på Vestergade', initials: 'NV', tone: 'sage' },
    text: 'Fællesspisning i gården på søndag klokken 17. Tag noget med til buffeten, så sørger vi for borde og stole.',
  },
  {
    id: 'p-peter',
    feed: 'venner',
    author: 'Peter',
    avatarSrc: img('peter.jpg'),
    tone: 'rose',
    meta: 'Til Venner · for 2 dage siden',
    text: 'Tak for i lørdags, alle sammen. Det var den bedste fødselsdag i mange år.',
    image: img('familie-soe.jpg'),
  },
  {
    id: 'p-jonas-2',
    feed: 'venner',
    author: 'Jonas Krogh',
    avatarSrc: img('jonas.jpg'),
    tone: 'sage',
    meta: 'for 3 dage siden',
    group: { name: 'Håndboldholdet', initials: 'HB', tone: 'blue', avatarSrc: img('haandbold.jpg') },
    text: 'Godt kæmpet i weekenden. Vi tabte med to mål, men forsvaret har aldrig set bedre ud.',
    image: img('haandbold.jpg'),
  },
  {
    id: 'p-anna-2',
    feed: 'venner',
    author: 'Anna Nørgaard',
    avatarSrc: img('anna.jpg'),
    tone: 'rose',
    meta: 'Til Venner · for 4 dage siden',
    text: 'Nogen der vil med på loppemarked i Kødbyen på søndag? Jeg leder efter en gammel reol.',
  },

  {
    id: 'p-kulturhuset',
    feed: 'interesser',
    author: 'Kulturhuset',
    avatarSrc: img('dans.jpg'),
    tone: 'blue',
    meta: 'Side · for 1 time siden',
    text: 'Nye datoer for teater i byparken. Alle er velkomne, og det er gratis.',
  },
  {
    id: 'p-anna',
    feed: 'debat',
    topic: 'Byudvikling',
    author: 'Anna Nørgaard',
    avatarSrc: img('anna.jpg'),
    tone: 'rose',
    meta: 'Byudvikling · Offentligt',
    text: 'Kan vi blive enige om, at nye cykelstier skal måles på, hvor mange der faktisk bruger dem?',
  },
  /* ---------- Ekstra eksempelindhold (ikke fra Figma) ---------- */
  {
    id: 'p-musik',
    feed: 'debat',
    topic: 'Musik',
    author: 'Spillestedet Lyden',
    avatarSrc: img('begivenhed.jpg'),
    tone: 'sand',
    meta: 'Musik · Offentligt',
    text: 'Åben scene hver torsdag i november. Skriv dig på listen i baren, og tag dit eget instrument med.',
    image: img('begivenhed.jpg'),
  },
  {
    id: 'p-cykling',
    feed: 'debat',
    topic: 'Cykling',
    author: 'Cykelklubben Øst',
    avatarSrc: img('cykelsti.jpg'),
    tone: 'sage',
    meta: 'Cykling · Offentligt',
    text: 'Vinterturen kører fra havnen lørdag klokken 9. Vi holder et roligt tempo, og alle kan være med.',
    image: img('cykelsti.jpg'),
  },
  {
    id: 'p-madlavning',
    feed: 'debat',
    topic: 'Madlavning',
    author: 'Lene Dahl',
    avatarSrc: img('person-i.jpg'),
    tone: 'rose',
    meta: 'Madlavning · Offentligt',
    text: 'Min bedste opskrift på græskarsuppe: ristet græskar, ingefær og en sjat kokosmælk. Så enkelt er det.',
    image: img('mad.jpg'),
  },
  {
    id: 'p-kultur-2',
    feed: 'debat',
    topic: 'Kultur',
    author: 'Byens Bibliotek',
    avatarSrc: img('nyhavn.jpg'),
    tone: 'blue',
    meta: 'Kultur · Offentligt',
    text: 'Forfatteraften på tirsdag. Kom og hør, hvordan en roman bliver til, fra første idé til færdig bog.',
  },
  {
    id: 'p-byudvikling-2',
    feed: 'debat',
    topic: 'Byudvikling',
    author: 'Grønne Gader',
    avatarSrc: img('have.jpg'),
    tone: 'sage',
    meta: 'Byudvikling · Offentligt',
    text: 'Vi har plantet 40 nye træer i kvarteret i år. Hvor skal de næste stå? Skriv dit forslag i kommentarerne.',
    image: img('have.jpg'),
  },
  {
    id: 'p-fotografi',
    feed: 'debat',
    topic: 'Fotografi',
    author: 'Mikkel Aagaard',
    avatarSrc: img('person-g.jpg'),
    tone: 'sand',
    meta: 'Fotografi · Offentligt',
    text: 'Tip til mørke aftener: Sæt kameraet på noget fast, og brug selvudløseren. Så bliver billedet skarpt.',
    image: img('nyhavn.jpg'),
  },
  {
    id: 'p-loeb',
    feed: 'debat',
    topic: 'Løb',
    author: 'Løbefællesskabet',
    avatarSrc: img('person-h.jpg'),
    tone: 'blue',
    meta: 'Løb · Offentligt',
    text: 'Nyt begynderhold starter i januar. Fra sofa til fem kilometer på otte uger, i dit eget tempo.',
  },

  /* ---------- Interesser: nyt fra sider, du følger (ikke fra Figma) ---------- */
  {
    id: 'p-hallen',
    feed: 'interesser',
    author: 'Hallen',
    tone: 'rose',
    meta: 'Side · for 3 timer siden',
    text: 'Hal 2 er lukket for vedligehold fra mandag til onsdag. Træninger flytter til hal 1, se de nye tider på opslagstavlen.',
    image: img('haandbold.jpg'),
  },
  {
    id: 'p-bageri',
    feed: 'interesser',
    author: 'Det lokale bageri',
    tone: 'sand',
    meta: 'Side · i morges',
    text: 'Fastelavnsbollerne er tilbage fra lørdag. Bestil gerne på forhånd, hvis I skal bruge mange.',
    image: img('spisebord.jpg'),
  },
  {
    id: 'p-cykelvaerksted',
    feed: 'interesser',
    author: 'Cykelværkstedet',
    tone: 'blue',
    meta: 'Side · i går',
    text: 'Gratis lygtetjek hele næste uge. Kig forbi med din cykel, så er du klar til de mørke morgener.',
    image: img('cykel.jpg'),
  },
  {
    id: 'p-bibliotek',
    feed: 'interesser',
    author: 'Byens bibliotek',
    tone: 'sage',
    meta: 'Side · i går',
    text: 'Ny it-café hver onsdag klokken 14. Tag din telefon eller computer med, så hjælper vi med MitID, apps og alt det andet.',
    image: img('computer.jpg'),
  },
  {
    id: 'p-teater',
    feed: 'interesser',
    author: 'Teaterforeningen',
    tone: 'sand',
    meta: 'Side · for 2 dage siden',
    text: 'Vi mangler frivillige til kostumer til forårets forestilling. Ingen erfaring nødvendig, kun lyst.',
    image: img('toej.jpg'),
  },
];

/* ---------- Kommentarer ---------- */

export type Comment = {
  id: string;
  author: string;
  avatarSrc?: string;
  tone: AvatarTone;
  time: string;
  text: string;
  likes: number;
  /** Svar vises rykket ind under kommentaren før */
  isReply?: boolean;
  isAuthor?: boolean;
  translatedFrom?: string;
};

/** Kommentarer fra Figma. Samme tråd vises på alle opslag i prototypen. */
export const comments: Comment[] = [
  { id: 'c1', author: 'Jonas Krogh', avatarSrc: img('jonas.jpg'), tone: 'sage', time: '2 t.', text: 'Det var en rigtig god sæson.', likes: 4 },
  {
    id: 'c2',
    author: 'Mette Lund',
    avatarSrc: img('mette.jpg'),
    tone: 'blue',
    time: '1 t.',
    text: 'Tak, Jonas! Vi ses til foråret.',
    likes: 2,
    isReply: true,
    isAuthor: true,
  },
  { id: 'c3', author: 'Elin Andersson', tone: 'rose', time: '1 t.', text: 'Hvor fint!', likes: 0, translatedFrom: 'svensk' },
  { id: 'c4', author: 'Søren Vang', tone: 'sand', time: '40 min.', text: 'Skal vi mødes i weekenden?', likes: 1 },
];
