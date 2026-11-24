import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { PostCard, type Post } from '../../components/PostCard';
import { isVideo } from '../../components/StoryViewer';
import './ProfileContent.css';

export type Highlight = { id: string; title: string; cover?: string; href: string; hasVideo?: boolean };
export type ProfileFlick = { id: string; src: string; href: string; views?: string };

type Tab = 'opslag' | 'debat' | 'flicks';

type Props = {
  /** Highlights: gemte moments (moments vises kun her på profilen) */
  highlights: Highlight[];
  /** Opslag til følgere (privat eller offentlig profil) */
  posts: Post[];
  /** Indlæg i Offentlig debat (med score og tags) */
  debate: Post[];
  flicks: ProfileFlick[];
  /** Din egen profil: knapper til at lave nyt */
  own?: boolean;
  /** Navn til tomme tilstande, fx "Mette" */
  name: string;
  /** Privat profil, du ikke følger: kun Debat er åben */
  locked?: boolean;
};

/**
 * Fælles opbygning af profiler:
 * 1. Highlights (runde bobler) – moments, man har gemt
 * 2. Faner: Opslag · Debat · Flicks
 */
export function ProfileContent({ highlights, posts, debate, flicks, own = false, name, locked = false }: Props) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get('fane');
  // Låst profil: Debat er altid offentlig, så den vises som udgangspunkt
  const tab: Tab = raw === 'debat' || raw === 'flicks' || raw === 'opslag' ? raw : locked ? 'debat' : 'opslag';
  const [openAll, setOpenAll] = useState(false);
  // Opslag som gitter (Instagram/VSCO) eller liste. Gitter er standard.
  const [view, setView] = useState<'gitter' | 'liste'>('gitter');

  const tabs: { value: Tab; label: string; icon: IconName; count: number }[] = [
    { value: 'opslag', label: 'Opslag', icon: 'layout-list', count: posts.length },
    { value: 'debat', label: 'Debat', icon: 'compass', count: debate.length },
    { value: 'flicks', label: 'Flicks', icon: 'clip', count: flicks.length },
  ];

  const card = (p: Post) => (
    <PostCard
      key={p.id}
      post={p}
      onComment={() => navigate(`/opslag/${p.id}?kommentarer`)}
      onShare={() => navigate(`/opslag/${p.id}/del`)}
      onReport={() => navigate(`/opslag/${p.id}/rapporter`)}
    />
  );

  const shownPosts = openAll ? posts : posts.slice(0, 6);

  return (
    <>
      {!locked && (highlights.length > 0 || own) && (
        <section className="pc-highlights" aria-label="Highlights">
          <ul className="pc-highlights__row">
            {own && (
              <li>
                <Link to="/profil/samling/ny" className="pc-highlight pc-highlight--new" aria-label="Ny highlight">
                  <span className="pc-highlight__ring">
                    <Icon name="plus" />
                  </span>
                  <span className="t-caption pc-highlight__title">Ny</span>
                </Link>
              </li>
            )}
            {highlights.map((h) => (
              <li key={h.id}>
                <Link to={h.href} className="pc-highlight" aria-label={`Afspil ${h.title}`}>
                  <span className="pc-highlight__ring">
                    {h.cover && !isVideo(h.cover) ? <img src={h.cover} alt="" /> : <Icon name="clip" />}
                  </span>
                  <span className="t-caption pc-highlight__title">{h.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pc-tabs" role="tablist" aria-label="Vis på profilen">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className="pc-tab"
            onClick={() => setParams(t.value === (locked ? 'debat' : 'opslag') ? {} : { fane: t.value }, { replace: true })}
          >
            <Icon name={locked && t.value !== 'debat' ? 'lock' : t.icon} size={18} />
            <span>{t.label}</span>
            {!(locked && t.value !== 'debat') && <span className="pc-tab__count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pc-panel">
        {locked && tab !== 'debat' && (
          <div className="pc-locked">
            <span className="pc-locked__icon" aria-hidden="true">
              <Icon name="lock" size={22} />
            </span>
            <p className="t-heading-s">Profilen er privat</p>
            <p className="t-body-s">
              Følg {name} for at se {tab === 'opslag' ? 'opslag' : 'flicks'} og highlights. Indlæg i Offentlig debat er altid synlige.
            </p>
          </div>
        )}
        {!locked && tab === 'opslag' &&
          (posts.length === 0 ? (
            <Empty
              text={own ? 'Du har ikke delt noget endnu.' : `${name} har ikke delt noget endnu.`}
              action={own ? { label: 'Skriv et opslag', to: '/opret' } : undefined}
            />
          ) : (
            <>
              <div className="pc-view" role="group" aria-label="Visning">
                <button type="button" className="pc-view__btn" aria-pressed={view === 'gitter'} aria-label="Vis som gitter" onClick={() => setView('gitter')}>
                  <Icon name="layout-grid" size={20} />
                </button>
                <button type="button" className="pc-view__btn" aria-pressed={view === 'liste'} aria-label="Vis som liste" onClick={() => setView('liste')}>
                  <Icon name="layout-list" size={20} />
                </button>
              </div>
              {view === 'gitter' ? (
                <ul className="pc-grid">
                  {posts.map((p) => (
                    <li key={p.id}>
                      <Link to={`/opslag/${p.id}`} className={['pc-tile', typeof p.image !== 'string' && 'pc-tile--text'].filter(Boolean).join(' ')} aria-label={`Opslag: ${p.text.slice(0, 60)}`}>
                        {typeof p.image === 'string' ? (
                          <img src={p.image} alt="" loading="lazy" />
                        ) : (
                          <span className="pc-tile__text">{p.text}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
              <>
              {shownPosts.map(card)}
              {posts.length > shownPosts.length && (
                <button type="button" className="t-label pc-more" onClick={() => setOpenAll(true)}>
                  Vis alle {posts.length} opslag
                </button>
              )}
              </>
              )}
            </>
          ))}

        {tab === 'debat' && (
          <>
            <p className="t-caption pc-note">
              <Icon name="compass" size={14} />
              {own ? 'Dine indlæg i Offentlig debat. Alle kan se og stemme på dem.' : `${genitive(name)} indlæg i Offentlig debat.`}
            </p>
            {debate.length === 0 ? (
              <Empty
                text={own ? 'Du har ikke deltaget i debatten endnu.' : `${name} har ikke deltaget i debatten endnu.`}
                action={own ? { label: 'Skriv i Offentlig debat', to: '/opret?sted=debat' } : undefined}
              />
            ) : (
              debate.map(card)
            )}
          </>
        )}

        {!locked && tab === 'flicks' &&
          (flicks.length === 0 ? (
            <Empty
              text={own ? 'Du har ikke lavet nogen flicks endnu.' : `${name} har ingen flicks endnu.`}
              action={own ? { label: 'Lav en flick', to: '/flicks/ny' } : undefined}
            />
          ) : (
            <ul className="pc-flicks">
              {flicks.map((f) => (
                <li key={f.id}>
                  <Link to={f.href} className="pc-flick" aria-label="Afspil flick">
                    <img src={f.src} alt="" />
                    <span className="pc-flick__views t-caption-strong">
                      <Icon name="clip" size={14} /> {f.views}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </>
  );
}

function Empty({ text, action }: { text: string; action?: { label: string; to: string } }) {
  return (
    <div className="pc-empty">
      <p className="t-body-s">{text}</p>
      {action && (
        <Link to={action.to} className="t-label pc-empty__action">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Dansk ejefald: "Mette" → "Mettes", "Lars" → "Lars'" */
function genitive(name: string) {
  return /[sxz]$/i.test(name) ? `${name}'` : `${name}s`;
}
