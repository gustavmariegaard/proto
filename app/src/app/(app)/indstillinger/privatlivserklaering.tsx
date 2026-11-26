import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';

const sections: { title: string; items: string[] }[] = [
  {
    title: 'Det gemmer vi',
    items: [
      'Din e-mail, navn, brugernavn, bio og profilbillede.',
      'Dine opslag, billeder, kommentarer, hjerter, enig/uenig, noter og rapporter.',
      'Hvem du følger, blokerer og har skjult i debatten.',
      'Dine beskeder. De er endnu ikke end-to-end-krypterede.',
    ],
  },
  {
    title: 'Hvor',
    items: ['Hos Supabase på servere i EU. Data krypteres, når de sendes og gemmes.'],
  },
  {
    title: 'Hvem ser hvad',
    items: [
      'Offentlig profil: alle med en profil kan se dine opslag.',
      'Privat profil: kun dine følgere. Debatopslag er altid offentlige.',
      'Hvem der stemte enig eller uenig, og hvem der skrev en note, vises ikke.',
      'Beskeder ser kun dem i samtalen. Testholdet kan i særlige tilfælde, fx ved en rapport, se indhold.',
    ],
  },
  {
    title: 'Sådan sletter du',
    items: ['Indstillinger → Slet konto. Alt slettes med det samme.', 'Testen er midlertidig. Data slettes, når testen slutter.'],
  },
];

/** Kort privatlivserklæring for testfasen */
export default function TestPrivacy() {
  return (
    <Screen title="Privatliv i testen">
      {sections.map((s) => (
        <View key={s.title} style={{ gap: 6 }}>
          <T v="headingM">{s.title}</T>
          {s.items.map((i) => (
            <T key={i} v="bodyS">
              • {i}
            </T>
          ))}
        </View>
      ))}
    </Screen>
  );
}
