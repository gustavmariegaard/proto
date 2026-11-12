import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useSession } from '../state/session';

/** Midlertidig side for faner, der bygges i et senere trin. */
export function Placeholder({ title, showLogOut }: { title: string; showLogOut?: boolean }) {
  const { logOut } = useSession();
  const navigate = useNavigate();
  return (
    <div style={{ padding: '4px 20px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <h1 className="t-title-l">{title}</h1>
      {showLogOut && (
        // Midlertidig: så testere kan prøve velkomst og oprettelse igen.
        <Button
          variant="secondary"
          onClick={() => {
            logOut();
            navigate('/velkommen', { replace: true });
          }}
        >
          Log ud
        </Button>
      )}
    </div>
  );
}
