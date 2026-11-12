import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { pronouns, reportReasons } from '../../data/create';
import { posts } from '../../data/sample';
import { CloseHeader, RadioDot, useClose } from '../create/parts';
import '../create/parts.css';
import './Report.css';

/** Rapportér et opslag: vælg en grund og fortsæt. Åbnes med /opslag/:id/rapporter. */
export function Report() {
  const { id } = useParams();
  const close = useClose(id ? `/opslag/${id}` : '/');
  const post = posts.find((p) => p.id === id);
  const [reason, setReason] = useState(reportReasons[0]!.id);

  if (!post) return <Navigate to="/" replace />;
  const { object } = pronouns(post.author);

  return (
    <div className="modal-screen report">
      <CloseHeader title="Rapportér" onClose={close} />
      <main className="modal-screen__content">
        <h2 id="report-q" className="t-heading-m">Hvad er der galt?</h2>
        <p className="t-caption modal-screen__muted">
          Opslag fra {post.author}. Din rapport er anonym for {object}.
        </p>
        <div className="choice-list" role="radiogroup" aria-labelledby="report-q">
          {reportReasons.map((r) => {
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
              </div>
            );
          })}
        </div>
        <Button block onClick={close}>
          Fortsæt
        </Button>
      </main>
    </div>
  );
}
