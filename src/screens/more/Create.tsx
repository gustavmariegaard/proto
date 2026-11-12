import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AvatarTone } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ChoicePair, MoreHeader, PhotoPicker } from './parts';
import { groupStore, initialsOf, pageStore } from './store';
import './More.css';

const tones: AvatarTone[] = ['sand', 'blue', 'sage', 'rose'];
const pickTone = (name: string) => tones[name.length % tones.length]!;

const visibility = [
  { value: 'lukket', label: 'Lukket' },
  { value: 'aaben', label: 'Åben' },
] as const;

/** Opret gruppe. Fuld skærm, rute /grupper/ny. */
export function NewGroup() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<string>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'lukket' | 'aaben'>('lukket');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    groupStore.add({
      id: `ny-${Date.now()}`,
      name: n,
      initials: initialsOf(n),
      tone: pickTone(n),
      avatarSrc: photo,
      meta: 'Oprettet lige nu',
    });
    navigate('/grupper', { replace: true });
  };

  return (
    <div className="more-screen">
      <MoreHeader title="Opret gruppe" fallback="/grupper" />
      <form className="more-content" onSubmit={submit}>
        <PhotoPicker value={photo} onChange={setPhoto} />
        <TextField label="Gruppens navn" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField label="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} />
        <h2 className="t-heading-s">Hvem kan se den?</h2>
        <ChoicePair label="Hvem kan se den?" options={visibility} value={mode} onChange={setMode} />
        <p className="t-caption more-muted" aria-live="polite">
          {mode === 'lukket'
            ? 'Nye medlemmer skal anmode om adgang, og du godkender dem.'
            : 'Alle kan finde gruppen og blive medlem med det samme.'}
        </p>
        <Button type="submit" block disabled={!name.trim()}>
          Opret gruppe
        </Button>
      </form>
    </div>
  );
}

/** Opret side. Fuld skærm, rute /sider/ny. */
export function NewPage() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<string>();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    pageStore.add({
      id: `ny-${Date.now()}`,
      name: n,
      initials: initialsOf(n),
      tone: pickTone(n),
      avatarSrc: photo,
      meta: 'Oprettet lige nu',
    });
    navigate('/sider', { replace: true });
  };

  return (
    <div className="more-screen">
      <MoreHeader title="Opret side" fallback="/sider" />
      <form className="more-content" onSubmit={submit}>
        <PhotoPicker value={photo} onChange={setPhoto} />
        <TextField label="Sidens navn" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField label="Kategori" value={category} onChange={(e) => setCategory(e.target.value)} />
        <TextField label="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button type="submit" block disabled={!name.trim()}>
          Opret side
        </Button>
      </form>
    </div>
  );
}
