import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { pronouns, reportReasons } from '../../data/create';
import { discoverPosts } from '../../data/discover';
import { flicks } from '../../data/flicks';
import { usePost } from '../../state/posts';
import { CloseHeader, RadioDot, useClose } from '../create/parts';
import '../create/parts.css';
import './Report.css';

/** Rapportér et opslag: vælg en grund og fortsæt. Åbnes med /opslag/:id/rapporter. */
export function Report() {
  const { id } = useParams();
  const close = useClose(id ? `/opslag/${id}` : '/');
  // Også opslag, der kun findes i Offentlig debat
  const flick = flicks.find((f) => f.id === id);
  const post =
    usePost(id) ??
    discoverPosts.find((p) => p.id === id) ??
    (flick ? { id: flick.id, author: flick.author, text: flick.text, meta: '' } : undefined);
  // Ingen kategori fra start: man skal selv vælge, før man kan sende
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [sent, setSent] = useState(false);
  // Forkert kategoriseret: hvilke tags passer ikke? (ét tag vælges af sig selv)
  const [wrongTags, setWrongTags] = useState<string[]>([]);

  if (!post) return <Navigate to="/" replace />;
  // Opslag med tags (Offentlig debat, flicks): man kan også melde forkert kategori
  // Debatversionen først: samme opslag i feedet har ikke altid sine tags med
  const tags = discoverPosts.find((p) => p.id === post.id)?.tags ?? ('tags' in post ? (post.tags as string[] | undefined) : undefined);
  const reasons = tags?.length
    ? [
        { id: 'kategori', title: 'Forkert kategoriseret', hint: tags.length > 1 ? 'Et eller flere tags passer ikke' : `Passer ikke til #${tags[0]}` },
        ...reportReasons,
      ]
    : reportReasons;
  const { object } = pronouns(post.author);
  const needsText = reason === 'andet';
  const pickTags = reason === 'kategori' && (tags?.length ?? 0) > 1;
  const canSend = reason !== null && (!needsText || other.trim().length > 2) && (!pickTags || wrongTags.length > 0);

  if (sent) {
    return (
      <div className="modal-screen report">
        <CloseHeader title="Rapportér" onClose={close} />
        <main className="modal-screen__content">
          <h2 className="t-heading-m">Tak for din rapport</h2>
          <p className="t-body-s">
            Vi kigger på opslaget hurtigst muligt. Du får besked, når vi har taget stilling. Din rapport er anonym for {object}.
          </p>
          <Button block onClick={close}>
            Færdig
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="modal-screen report">
      <CloseHeader title="Rapportér" onClose={close} />
      <main className="modal-screen__content">
        <h2 id="report-q" className="t-heading-m">Hvad er der galt?</h2>
        <p className="t-caption modal-screen__muted">
          Opslag fra {post.author}. Din rapport er anonym for {object}.
        </p>
        <div className="choice-list" role="radiogroup" aria-labelledby="report-q">
          {reasons.map((r) => {
            const on = reason === r.id;
            return (
              <div key={r.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={['choice', on && 'choice--on'].filter(Boolean).join(' ')}
                  onClick={() => setReason(r.id)}
                >
                  <RadioDot on={on} size={22} />
                  <span className="choice__text">
                    <span className="t-label">{r.title}</span>
                    <span className="t-caption choice__hint">{r.hint}</span>
                  </span>
                </button>
                {/* Tags vises lige under valget */}
                {r.id === 'kategori' && pickTags && (
                  <div className="report__other report__tagpick">
                    <span id="report-tags" className="t-label">Hvilke tags passer ikke?</span>
                    <div className="report__tags" role="group" aria-labelledby="report-tags">
                      {tags!.map((t) => {
                        const on = wrongTags.includes(t);
                        return (
                          <Chip
                            key={t}
                            selected={on}
                            onClick={() => setWrongTags((w) => (on ? w.filter((x) => x !== t) : [...w, t]))}
                          >
                            {on && <Icon name="check" size={16} />}#{t}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {needsText && (
          <label className="report__other">
            <span className="t-label">Beskriv problemet</span>
            <textarea
              className="report__field"
              rows={3}
              placeholder="Fortæl kort, hvad der er galt"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              autoFocus
            />
          </label>
        )}
        <p className="t-caption modal-screen__muted" aria-live="polite">
          {reason === null
            ? 'Vælg en kategori for at sende rapporten.'
            : pickTags && wrongTags.length === 0
              ? 'Vælg mindst ét tag.'
              : needsText && !canSend
                ? 'Skriv et par ord om problemet.'
                : ''}
        </p>
        <Button block disabled={!canSend} onClick={() => setSent(true)}>
          Send rapport
        </Button>
      </main>
    </div>
  );
}
