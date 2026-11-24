import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import { useSession } from '../../state/session';
import { useMe } from './shared';
import './Screens.css';
import './EditProfile.css';

const BIO_MAX = 150;

/** Rediger profil: profilbillede, navn, brugernavn og bio. Rute: /profil/rediger */
export function EditProfile() {
  const navigate = useNavigate();
  const { profile, setProfile } = useSession();
  const me = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username.replace(/^@/, ''));
  const [bio, setBio] = useState(profile.bio ?? '');

  const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
  const usernameOk = /^[a-z0-9._æøå]{2,30}$/.test(cleanUsername);
  const canSave = name.trim().length > 0 && usernameOk;

  const pickPhoto = (file?: File) => {
    if (!file) return;
    // Lille, kvadratisk udgave, så billedet kan huskes på telefonen
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

  const save = () => {
    if (!canSave) return;
    setProfile({ ...profile, avatar, name: name.trim(), username: cleanUsername, bio: bio.trim() });
    navigate('/profil', { replace: true });
  };

  return (
    <div className="pf-screen">
      <PageHeader title="Rediger profil" fallback="/profil">
        <Button variant="ghost" disabled={!canSave} onClick={save}>
          Gem
        </Button>
      </PageHeader>

      <form
        className="edit-profile"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="edit-profile__photo">
          <button type="button" className="edit-profile__avatar" aria-label="Skift profilbillede" onClick={() => fileRef.current?.click()}>
            <img src={avatar || me.avatar} alt="" />
          </button>
          <button type="button" className="edit-profile__change t-label" onClick={() => fileRef.current?.click()}>
            Skift profilbillede
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </div>

        <div className="edit-profile__group">
          <span className="t-label edit-profile__label" aria-hidden="true">Navn</span>
          <TextField label="Navn" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="edit-profile__group">
          <span className="t-label edit-profile__label" aria-hidden="true">Brugernavn</span>
          <TextField
            label="Brugernavn"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {username.trim() && !usernameOk && (
            <p className="t-caption edit-profile__error">Brug 2–30 tegn: bogstaver, tal, punktum eller understreg.</p>
          )}
        </div>
        <div className="edit-profile__group">
          <span className="t-label edit-profile__label" aria-hidden="true">Bio</span>
          <textarea
            className="edit-profile__field t-body-s"
            aria-label="Bio"
            placeholder="Skriv lidt om dig selv"
            maxLength={BIO_MAX}
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <span className="t-caption edit-profile__count">
            {bio.length}/{BIO_MAX}
          </span>
        </div>

        <Button type="submit" block disabled={!canSave}>
          Gem
        </Button>
      </form>
    </div>
  );
}
