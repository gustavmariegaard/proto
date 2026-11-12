import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { initialNotifications, type Notification } from '../../data/account';
import './account.css';

// Huskes, mens appen er åben, så læste og besvarede notifikationer forbliver sådan.
let store = initialNotifications;

/** Notifikationer: nye øverst, tidligere nedenunder. Åbnes fra klokken i topbaren. */
export function Notifications() {
  const [list, setListState] = useState(store);

  const setList = (next: Notification[]) => {
    store = next;
    setListState(next);
  };

  const markRead = (id: string) => setList(list.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  const remove = (id: string) => setList(list.filter((n) => n.id !== id));
  const accept = (n: Notification) =>
    setList(
      list.map((x) =>
        x.id === n.id
          ? { ...x, unread: false, friendRequest: undefined, text: `Du og ${n.friendRequest!.name} er nu venner.`, to: '/find-folk' }
          : x,
      ),
    );

  const groups = [
    { id: 'nye', title: 'Nye', items: list.filter((n) => n.group === 'nye') },
    { id: 'tidligere', title: 'Tidligere', items: list.filter((n) => n.group === 'tidligere') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="acc-screen">
      <PageHeader title="Notifikationer" fallback="/" />

      <main className="acc-content">
        {groups.length === 0 && <p className="t-body-s acc-muted acc-center">Du har ingen notifikationer</p>}

        {groups.map((g) => (
          <section key={g.id} className="acc-list" aria-labelledby={`notif-${g.id}`}>
            <h2 id={`notif-${g.id}`} className="t-heading-s">
              {g.title}
            </h2>
            <ul className="acc-list">
              {g.items.map((n) => (
                <li key={n.id}>
                  {n.friendRequest ? (
                    <div className="notif">
                      <NotifRow n={n} />
                      <div className="notif__buttons">
                        <Button onClick={() => accept(n)}>Accepter</Button>
                        <Button variant="secondary" onClick={() => remove(n.id)}>
                          Afvis
                        </Button>
                        <Button variant="ghost" onClick={() => remove(n.id)}>
                          Ignorer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Link to={n.to ?? '/'} className="notif" onClick={() => markRead(n.id)}>
                      <NotifRow n={n} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}

function NotifRow({ n }: { n: Notification }) {
  return (
    <span className="notif__row">
      <Avatar name={n.text} tone={n.tone} src={n.avatarSrc} />
      <span className="notif__text">
        <span className="t-body-s">{n.text}</span>
        <span className="t-caption acc-muted">{n.time}</span>
      </span>
      <span className={['notif__dot', n.unread && 'notif__dot--on'].filter(Boolean).join(' ')}>
        {n.unread && <span className="visually-hidden">Ulæst</span>}
      </span>
    </span>
  );
}
