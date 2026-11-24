import { useState } from 'react';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { allTopics, trendingTopics } from '../../data/interests';
import { suggestedInterests } from '../../data/onboarding';
import { useTopics } from '../../state/topics';
import './TopicsSheet.css';

/** Rediger emner (Offentlig debat og Flicks bruger de samme emner): søg efter nye emner, se hvad der trender, og vælg eller fravælg. */
export function TopicsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { topics: mine, following: has, follow: toggle } = useTopics();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const catalogue = [...new Set([...mine, ...trendingTopics.map((t) => t.name), ...allTopics])];
  const hits = q ? catalogue.filter((t) => t.toLowerCase().includes(q)) : [];
  const exact = catalogue.some((t) => t.toLowerCase() === q);
  const newTopic = query.trim().replace(/^./, (c) => c.toUpperCase());
  const suggestions = suggestedInterests.filter((i) => !has(i));

  const chip = (i: string) => (
    <li key={i}>
      <Chip
        selected={has(i)}
        className="interests__chip"
        aria-label={has(i) ? `${i}, følger. Tryk for at fjerne` : `${i}. Tryk for at følge`}
        onClick={() => toggle(i)}
      >
        {i}
        <Icon name={has(i) ? 'close' : 'plus'} size={16} />
      </Chip>
    </li>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Rediger interesser" dim initialSize="full">
      <div className="interests">
        <TextField
          label="Søg efter interesser"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
        />

        {q ? (
          <section className="interests__section" aria-label="Søgeresultater">
            <ul className="interests__chips">
              {hits.map(chip)}
              {!exact && (
                <li>
                  <Chip
                    className="interests__chip"
                    onClick={() => {
                      toggle(newTopic);
                      setQuery('');
                    }}
                  >
                    Følg “{newTopic}”
                    <Icon name="plus" size={16} />
                  </Chip>
                </li>
              )}
            </ul>
            {hits.length === 0 && (
              <p className="t-caption interests__muted">Ingen interesser hedder sådan endnu. Du kan selv følge den.</p>
            )}
          </section>
        ) : (
          <>
            <section className="interests__section" aria-labelledby="interests-mine">
              <h2 id="interests-mine" className="t-heading-s">Dine interesser</h2>
              {mine.length ? (
                <ul className="interests__chips">{mine.map(chip)}</ul>
              ) : (
                <p className="t-caption interests__muted">Du følger ingen interesser endnu. Søg, eller vælg nedenfor.</p>
              )}
            </section>

            <section className="interests__section" aria-labelledby="interests-trending">
              <h2 id="interests-trending" className="t-heading-s">Trender lige nu</h2>
              <ol className="interests__trending">
                {trendingTopics.map((t, n) => (
                  <li key={t.name}>
                    <button
                      type="button"
                      className="interests__trend"
                      aria-pressed={has(t.name)}
                      onClick={() => toggle(t.name)}
                    >
                      <span className="interests__rank t-heading-s" aria-hidden="true">{n + 1}</span>
                      <span className="interests__trend-text">
                        <span className="t-label">{t.name}</span>
                        <span className="t-caption interests__muted">{t.note}</span>
                      </span>
                      <span className={['interests__follow t-caption-strong', has(t.name) && 'interests__follow--on'].filter(Boolean).join(' ')}>
                        {has(t.name) ? (
                          <>
                            <Icon name="check" size={14} /> Følger
                          </>
                        ) : (
                          <>
                            <Icon name="plus" size={14} /> Følg
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>

            {suggestions.length > 0 && (
              <section className="interests__section" aria-labelledby="interests-more">
                <h2 id="interests-more" className="t-heading-s">Forslag til dig</h2>
                <ul className="interests__chips">{suggestions.map(chip)}</ul>
              </section>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
