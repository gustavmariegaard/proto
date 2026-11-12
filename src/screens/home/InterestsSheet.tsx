import { Chip } from '../../components/Chip';
import { Sheet } from '../../components/Sheet';
import { suggestedInterests } from '../../data/onboarding';
import { useSession } from '../../state/session';

/** Rediger emner: vælg og fravælg interesser direkte fra Hjem. */
export function InterestsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile } = useSession();
  const all = [...new Set([...profile.interests, ...suggestedInterests])];
  const toggle = (i: string) =>
    setProfile({
      ...profile,
      interests: profile.interests.includes(i) ? profile.interests.filter((x) => x !== i) : [...profile.interests, i],
    });

  return (
    <Sheet open={open} onClose={onClose} title="Rediger emner" dim>
      <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          Dit feed sammensættes ud fra de interesser, du vælger. Vælg så mange, du vil. Du kan altid ændre dem.
        </p>
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
          {all.map((i) => (
            <li key={i}>
              <Chip selected={profile.interests.includes(i)} onClick={() => toggle(i)}>
                {i}
              </Chip>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
