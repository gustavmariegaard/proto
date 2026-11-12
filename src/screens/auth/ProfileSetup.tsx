import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { LanguageButton } from '../../components/LanguageButton';
import { Tag } from '../../components/Tag';
import { TextField } from '../../components/TextField';
import { suggestedInterests } from '../../data/onboarding';
import { AuthPage, AuthTop } from '../../layout/AuthPage';
import { useSession } from '../../state/session';
import './ProfileSetup.css';

/** Opret konto · Profil: billede, navn, brugernavn og interesser. */
export function ProfileSetup() {
  const navigate = useNavigate();
  const { profile, setProfile } = useSession();
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [interests, setInterests] = useState(profile.interests);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const suggestions = suggestedInterests
    .filter((s) => !interests.includes(s))
    .filter((s) => s.toLowerCase().includes(q));
  const visible = showAll || q ? suggestions : suggestions.slice(0, 4);
  const canSuggest = q.length > 1 && !suggestedInterests.concat(interests).some((s) => s.toLowerCase() === q);

  const add = (i: string) => setInterests((list) => (list.includes(i) ? list : [...list, i]));
  const remove = (i: string) => setInterests((list) => list.filter((x) => x !== i));

  const pickPhoto = (file?: File) => {
    if (!file) return;
    // Lav en lille udgave af billedet, så det kan huskes på telefonen.
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const done = () => {
    setProfile({ name: name.trim(), username: username.trim(), interests, avatar });
    // Selve log ind sker på næste skærm ("Du er med").
    navigate('/konto/velkommen', { replace: true });
  };

  return (
    <AuthPage top={36} gap={12} footer={<Button block onClick={done}>Færdig</Button>}>
      <AuthTop>
        <BackButton />
        <LanguageButton />
      </AuthTop>
      <h1>Lav din profil</h1>
      <div>
        <Tag>Alder bekræftet</Tag>
      </div>

      <div className="profile-setup__content">
        <div className="profile-setup__avatar-wrap">
          <button
            type="button"
            className="profile-setup__avatar"
            onClick={() => fileRef.current?.click()}
            aria-label={avatar ? 'Skift profilbillede' : 'Vælg profilbillede'}
          >
            {avatar ? <img src={avatar} alt="" /> : <Icon name="camera" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </div>

        <TextField label="Navn" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Brugernavn"
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <h2 className="t-heading-s">Interesser</h2>
        <p className="t-caption profile-setup__muted">
          Dit feed sammensættes ud fra de interesser, du vælger. Vælg så mange, du vil. Du kan altid ændre dem.
        </p>
        <TextField
          label="Søg efter interesser"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {interests.length > 0 && (
          <ul className="profile-setup__chips" aria-label="Valgte interesser">
            {interests.map((i) => (
              <li key={i}>
                <Chip selected onClick={() => remove(i)} aria-label={`Fjern ${i}`}>
                  {i}
                  <Icon name="close" size={16} className="profile-setup__x" />
                </Chip>
              </li>
            ))}
          </ul>
        )}

        {visible.length > 0 && (
          <>
            <p className="t-caption-strong profile-setup__muted">Foreslået</p>
            <ul className="profile-setup__chips" aria-label="Foreslåede interesser">
              {visible.map((s) => (
                <li key={s}>
                  <Chip onClick={() => add(s)}>{s}</Chip>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="profile-setup__more">
          {!showAll && !q && suggestions.length > visible.length && (
            <Button variant="ghost" onClick={() => setShowAll(true)}>Vis flere</Button>
          )}
          <Button
            variant="ghost"
            disabled={!canSuggest}
            onClick={() => {
              add(query.trim().charAt(0).toUpperCase() + query.trim().slice(1));
              setQuery('');
            }}
          >
            Foreslå dette emne
          </Button>
        </div>
      </div>
    </AuthPage>
  );
}
