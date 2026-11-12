import { Chip } from '../../components/Chip';
import { PageHeader } from '../../components/PageHeader';
import { interestOptions, interestSuggestions } from '../../data/profile';
import { useSession } from '../../state/session';
import './Profile.css';
import './Screens.css';

/**
 * Interesser: dine interesser som chips. Mørk = valgt.
 * Tryk for at vælge til eller fra; et forslag under "Måske kunne du også lide"
 * flyttes op og vælges. Gemmes med det samme i sessionens profil.
 */
export function Interests() {
  const { profile, setProfile } = useSession();
  const chosen = profile.interests;

  const extra = chosen.filter((i) => !interestOptions.includes(i) && !interestSuggestions.includes(i));
  const adopted = interestSuggestions.filter((i) => chosen.includes(i));
  const list = [...interestOptions, ...extra, ...adopted];
  const suggestions = interestSuggestions.filter((i) => !chosen.includes(i));

  const toggle = (interest: string) =>
    setProfile({
      ...profile,
      interests: chosen.includes(interest) ? chosen.filter((i) => i !== interest) : [...chosen, interest],
    });

  return (
    <div className="pf-screen">
      <PageHeader title="Interesser" fallback="/profil" />
      <main className="pf-screen__content">
        <p className="t-body-s pf-muted pf-full">
          Tryk på en interesse for at se opslag om den. De mørke er dem, I har tilfælles.
        </p>
        <ul className="pf-chips" aria-label="Dine interesser">
          {list.map((i) => (
            <li key={i}>
              <Chip selected={chosen.includes(i)} onClick={() => toggle(i)}>
                {i}
              </Chip>
            </li>
          ))}
        </ul>
        {suggestions.length > 0 && (
          <>
            <h2 className="t-heading-s">Måske kunne du også lide</h2>
            <ul className="pf-chips" aria-label="Forslag">
              {suggestions.map((i) => (
                <li key={i}>
                  <Chip onClick={() => toggle(i)}>{i}</Chip>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
