import { Avatar } from '../../components/Avatar';
import { IconButton } from '../../components/IconButton';
import '../../components/PageHeader.css';
import type { Contact } from '../../data/messages';
import { useGoBack } from './hooks';

/** Sidehoved med luk-knap (X) og titel, som "Ny besked" og "Ny cirkel" i Figma. */
export function CloseHeader({ title, fallback = '/beskeder' }: { title: string; fallback?: string }) {
  const close = useGoBack(fallback);
  return (
    <header className="page-header">
      <IconButton icon="close" label="Luk" variant="outline" onClick={close} />
      <h1 className="page-header__title">{title}</h1>
    </header>
  );
}

/** Vælg-række med avatar, navn, relation og en rund markering til højre. */
export function PickRow({ contact, selected, onToggle }: { contact: Contact; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={['msg-card msg-pick', selected && 'msg-pick--on'].filter(Boolean).join(' ')}
      aria-pressed={selected}
      onClick={onToggle}
    >
      <Avatar name={contact.name} tone={contact.tone} src={contact.avatarSrc} />
      <span className="msg-card__text">
        <span className="t-heading-s">{contact.name}</span>
        <span className="t-caption msg-muted">{contact.relation}</span>
      </span>
      <span className={['msg-radio', selected && 'msg-radio--on'].filter(Boolean).join(' ')} aria-hidden="true" />
    </button>
  );
}

