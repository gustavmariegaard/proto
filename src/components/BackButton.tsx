import { useNavigate } from 'react-router-dom';
import { IconButton } from './IconButton';

/** Rund tilbage-knap med kant. Går ét skridt tilbage, eller til `fallback`. */
export function BackButton({ fallback = '/velkommen' }: { fallback?: string }) {
  const navigate = useNavigate();
  const goBack = () => {
    // Har man åbnet siden direkte fra et link, er der intet at gå tilbage til.
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
  return <IconButton icon="chevron-left" label="Tilbage" variant="outline" onClick={goBack} />;
}
