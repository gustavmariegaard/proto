import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { AvatarTone } from '../../components/Avatar';
import '../../components/Avatar.css';
import '../../components/Button.css';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import type { Community } from '../../data/more';
import './More.css';

/** Sidehoved med tilbage-knap, titel og evt. en tekst-knap (Ghost) til højre, fx "Opret gruppe". */
export function MoreHeader({ title, fallback = '/mere', action }: { title: string; fallback?: string; action?: { label: string; to: string } }) {
  return (
    <PageHeader title={title} fallback={fallback}>
      {action && (
        <Link to={action.to} className="btn btn--ghost">
          {action.label}
        </Link>
      )}
    </PageHeader>
  );
}

/** Avatar med faste initialer (fx "F3"), da den fælles Avatar selv udregner dem. */
export function InitialsAvatar({ initials, tone, size = 'L', src }: { initials: string; tone: AvatarTone; size?: 'S' | 'L'; src?: string }) {
  return (
    <span className={`avatar avatar--${size} avatar--${tone}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}

/** Række i Grupper og Sider: avatar, navn, seneste aktivitet og en mint prik ved nyt. */
export function CommunityRow({ item, onOpen }: { item: Community; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className="more-row" onClick={onOpen}>
        <InitialsAvatar initials={item.initials} tone={item.tone} src={item.avatarSrc} />
        <span className="more-row__text">
          <span className="t-heading-s more-ellipsis">{item.name}</span>
          <span className="t-caption more-muted more-ellipsis">{item.meta}</span>
        </span>
        {item.unread && (
          <>
            <span className="more-dot" aria-hidden="true" />
            <span className="more-sr">Ny aktivitet</span>
          </>
        )}
      </button>
    </li>
  );
}

export type SortMode = 'seneste' | 'navn';

/** "30 grupper" til venstre og et sorteringsvalg til højre. */
export function SortRow({ count, sort, onSort }: { count: string; sort: SortMode; onSort: (s: SortMode) => void }) {
  return (
    <div className="more-sort">
      <span className="t-caption more-muted" aria-live="polite">{count}</span>
      <button
        type="button"
        className="more-sort__btn t-caption-strong"
        aria-label={`Sortér: ${sort === 'seneste' ? 'Seneste aktivitet' : 'Navn'}. Tryk for at skifte`}
        onClick={() => onSort(sort === 'seneste' ? 'navn' : 'seneste')}
      >
        {sort === 'seneste' ? 'Seneste aktivitet' : 'Navn'}
        <Icon name="chevron-right" size={16} className="more-sort__chev" />
      </button>
    </div>
  );
}

export function sortItems(items: Community[], sort: SortMode) {
  if (sort === 'seneste') return items;
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'da'));
}

export function matches(name: string, query: string) {
  return name.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da'));
}

/** Stiplet felt "Tilføj billede". Vælger et billede fra telefonen og viser det. */
export function PhotoPicker({ value, onChange }: { value?: string; onChange: (url: string | undefined) => void }) {
  const id = useId();
  return (
    <div className="more-photo">
      <input
        id={id}
        type="file"
        accept="image/*"
        className="more-sr"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(URL.createObjectURL(file));
          e.target.value = '';
        }}
      />
      <label htmlFor={id} className={['more-photo__drop', value && 'more-photo__drop--filled'].filter(Boolean).join(' ')}>
        {value ? (
          <img src={value} alt="Valgt billede" />
        ) : (
          <span className="more-photo__hint">
            <Icon name="plus" />
            <span className="t-label">Tilføj billede</span>
          </span>
        )}
      </label>
      {value && (
        <button type="button" className="more-photo__remove" aria-label="Fjern billede" onClick={() => onChange(undefined)}>
          <Icon name="close" size={20} />
        </button>
      )}
    </div>
  );
}

/** To valg side om side ("Lukket" / "Åben"). Det valgte er hvidt med kant og fed tekst. */
export function ChoicePair<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="more-choice" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={['more-choice__item', on && 'more-choice__item--on'].filter(Boolean).join(' ')}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
