import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Tag } from '../../components/Tag';
import { useSession } from '../../state/session';
import { latestPhotos, myFlicks, photoById, photoHeights, photos, pinnedPost, textPosts, type TextPost } from '../../data/profile';
import { Masonry, useMe, type Tile } from './shared';
import { useCollections } from './store';
import './Profile.css';

type Tab = 'alt' | 'tekst' | 'billeder' | 'flicks';

const tabs: { value: Tab; label: string }[] = [
  { value: 'alt', label: 'Alt' },
  { value: 'tekst', label: 'Tekst' },
  { value: 'billeder', label: 'Billeder' },
  { value: 'flicks', label: 'Flicks' },
];

/** Profil (i appens ramme). Fanerne Alt, Tekst, Billeder og Flicks huskes i adressen (?fane=). */
export function Profile() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const me = useMe();
  const { profile, setProfile } = useSession();
  const collections = useCollections();
  const raw = params.get('fane');
  const tab: Tab = tabs.some((t) => t.value === raw) ? (raw as Tab) : 'alt';

  const selectTab = (value: Tab) => setParams(value === 'alt' ? {} : { fane: value }, { replace: true });

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(index + dir + tabs.length) % tabs.length]!;
    selectTab(next.value);
    document.getElementById(`pf-tab-${next.value}`)?.focus({ preventScroll: true });
  };

  const photoTile = (id: string, height: number): Tile => {
    const photo = photoById(id)!;
    return {
      key: id,
      height,
      render: () => (
        <Link to={`/profil/billede/${id}`} className="pf-photo" aria-label="Åbn billede">
          <img src={photo.src} alt="" />
        </Link>
      ),
    };
  };

  return (
    <div className="profile">
      <section className="pf-identity" aria-label="Din profil">
        <span className="pf-ring" aria-hidden="true">
          <span className="pf-ring__avatar">
            <img src={me.avatar} alt="" />
          </span>
        </span>
        <div className="pf-identity__name">
          <h1 className="t-title-l">{me.name}</h1>
          <p className="t-caption pf-muted">{me.username}</p>
        </div>
        <IconButton icon="settings" label="Indstillinger" onClick={() => navigate('/indstillinger')} />
      </section>

      <p className="t-body-s">[Kort tekst om dig]</p>

      <div className="pf-stats">
        <div className="pf-stats__item">
          <span className="t-heading-m">—</span>
          <span className="t-caption pf-muted">Følgere</span>
        </div>
        <Link to="/profil/interesser" className="pf-stats__item pf-stats__item--link">
          <span className="t-heading-m">{me.interests.length}</span>
          <span className="t-caption pf-muted">Interesser</span>
        </Link>
      </div>

      {/* Som på Instagram: hele profilen er offentlig eller privat – ikke de enkelte opslag */}
      <section className="pf-privacy" aria-labelledby="pf-privacy">
        <h2 id="pf-privacy" className="t-heading-s">Hvem kan se din profil?</h2>
        <SegmentedControl
          label="Hvem kan se din profil?"
          value={profile.private ? 'privat' : 'offentlig'}
          onChange={(v) => setProfile({ ...profile, private: v === 'privat' })}
          options={[
            { value: 'offentlig', label: 'Offentlig' },
            { value: 'privat', label: 'Privat' },
          ]}
        />
        <p className="t-caption pf-muted" aria-live="polite">
          {profile.private
            ? 'Kun dine følgere kan se dine opslag, moments og flicks. Nye følgere skal godkendes af dig. Opslag i grupper ses stadig af gruppens medlemmer.'
            : 'Alle kan se dine opslag, moments og flicks. Opslag i grupper ses kun af gruppens medlemmer.'}
        </p>
      </section>

      <h2 className="t-heading-s">Samlinger</h2>
      <ul className="pf-collections">
        {collections.map((c) => (
          <li key={c.id} className="pf-collection">
            <Link to={`/profil/samling/${c.id}/vis`} aria-label={`Afspil samlingen ${c.title}`} className="pf-collection__link">
              <span className="pf-collection__photo">
                <img src={photoById(c.cover)?.src} alt="" />
              </span>
              <span className="t-label">{c.title}</span>
            </Link>
            <Link
              to={`/profil/samling/${c.id}/rediger`}
              className="pf-collection__edit"
              aria-label={`Rediger samlingen ${c.title}`}
            >
              <Icon name="edit" size={16} />
            </Link>
          </li>
        ))}
      </ul>

      <div className="pf-tabs" role="tablist" aria-label="Vis på profilen">
        {tabs.map((t, i) => (
          <button
            key={t.value}
            id={`pf-tab-${t.value}`}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            aria-controls="pf-panel"
            tabIndex={tab === t.value ? 0 : -1}
            className="pf-tab"
            onClick={() => selectTab(t.value)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="pf-panel" role="tabpanel" aria-labelledby={`pf-tab-${tab}`} className="pf-panel">
        {tab === 'alt' && (
          <>
            <h2 className="t-heading-s">Fastgjort</h2>
            <article className="pf-post">
              <Tag>Fastgjort</Tag>
              <p className="t-body">{pinnedPost.text}</p>
              <p className="t-caption pf-muted">{pinnedPost.note}</p>
            </article>
            <h2 className="t-heading-s">Seneste</h2>
            <TextCard post={textPosts[0]!} />
            <Masonry tiles={latestPhotos.map((p) => photoTile(p.id, p.height))} label="Seneste billeder" />
            <TextCard post={textPosts[1]!} />
          </>
        )}

        {tab === 'tekst' && textPosts.map((p) => <TextCard key={p.id} post={p} />)}

        {tab === 'billeder' && (
          <Masonry
            label="Dine billeder"
            tiles={photos.map((p, i) => photoTile(p.id, photoHeights[i % photoHeights.length]!))}
          />
        )}

        {tab === 'flicks' && (
          <Masonry
            label="Dine flicks"
            tiles={myFlicks.map((f) => ({
              key: f.id,
              height: f.height,
              render: () => (
                <Link to="/flicks" className="pf-photo pf-flick" aria-label={f.label}>
                  <img src={f.src} alt="" />
                  <Icon name="clip" className="pf-flick__icon" />
                </Link>
              ),
            }))}
          />
        )}
      </div>
    </div>
  );
}

function TextCard({ post }: { post: TextPost }) {
  return (
    <article className="pf-post">
      <p className="t-body">{post.text}</p>
      <p className="t-caption pf-muted">{post.time}</p>
    </article>
  );
}
