import { useState } from 'react';
import { allTopics, trendingTopics } from '../data/interests';
import { Chip } from './Chip';
import { Icon } from './Icon';
import './TagInput.css';

const MAX_TAGS = 5;

/**
 * Tags på opslag, flicks og moments: skriv selv, eller vælg blandt forslag. Højst fem.
 * required = mindst ét tag (Offentlig debat). dark = til mørke skærme.
 */
type Props = {
  tags: string[];
  onTags: (t: string[]) => void;
  error?: boolean;
  required?: boolean;
  /** Erstatter forklaringen under overskriften */
  hint?: string;
};

export function TagInput({ tags, onTags, error = false, required = false, hint }: Props) {
  const [text, setText] = useState('');
  const q = text.trim().replace(/^#/, '');
  const known = [...new Set([...trendingTopics.map((t) => t.name), ...allTopics])];
  const suggestions = (q ? known.filter((t) => t.toLowerCase().includes(q.toLowerCase())) : known.slice(0, 8))
    .filter((t) => !tags.includes(t))
    .slice(0, 8);
  const full = tags.length >= MAX_TAGS;

  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || full) return;
    const nice = t.charAt(0).toUpperCase() + t.slice(1);
    const existing = known.find((k) => k.toLowerCase() === nice.toLowerCase()) ?? nice;
    if (!tags.includes(existing)) onTags([...tags, existing]);
    setText('');
  };

  return (
    <div className="create__tags" id="create-tags">
      <h3 className="t-heading-s">
        Tags {!required && <span className="t-caption tag-input__muted">(valgfrit)</span>}
      </h3>
      <p className={['t-caption', error ? 'create__tags-error' : 'tag-input__muted'].join(' ')} aria-live="polite">
        {error
          ? 'Tilføj mindst ét tag, så andre kan finde opslaget.'
          : hint ??
            (required
            ? `Højst ${MAX_TAGS} tags pr. opslag`
            : `Gør opslaget lettere at finde, fx #Bagning eller #Håndbold. Højst ${MAX_TAGS}.`)}
      </p>
      {tags.length > 0 && (
        <ul className="create__tag-list">
          {tags.map((t, i) => (
            <li key={t}>
              <Chip selected className="create__tag" aria-label={`Fjern tagget ${t}`} onClick={() => onTags(tags.filter((x) => x !== t))}>
                #{t}
                {i === 0 && required && <span className="create__tag-main">emne</span>}
                <Icon name="close" size={16} />
              </Chip>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <input
          className="field"
          type="text"
          placeholder="Skriv et tag, fx Cykelstier"
          aria-label="Skriv et tag"
          value={text}
          enterKeyHint="done"
          autoCapitalize="sentences"
          onChange={(e) => {
            const v = e.target.value;
            // Komma eller mellemrum efter et ord laver et tag
            if (/[,]$/.test(v)) add(v.slice(0, -1));
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            }
          }}
        />
      )}
      {!full && suggestions.length > 0 && (
        <div className="create__chips" aria-label="Forslag">
          {q && !known.some((k) => k.toLowerCase() === q.toLowerCase()) && (
            <Chip className="create__tag" onClick={() => add(q)}>
              Nyt tag: #{q}
              <Icon name="plus" size={16} />
            </Chip>
          )}
          {suggestions.map((t) => (
            <Chip key={t} className="create__tag" onClick={() => add(t)}>
              #{t}
              <Icon name="plus" size={16} />
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
