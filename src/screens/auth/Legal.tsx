import { BackButton } from '../../components/BackButton';
import { legal } from '../../data/onboarding';
import { AuthPage } from '../../layout/AuthPage';
import './Info.css';

/** Vilkår eller privatlivspolitik. */
export function Legal({ kind }: { kind: keyof typeof legal }) {
  const doc = legal[kind];
  return (
    <AuthPage top={30} gap={14}>
      <header className="info__header">
        <BackButton />
        <h1 className="info__h1">{doc.title}</h1>
      </header>
      <article className="info__article info__article--legal">
        <p className="t-caption info__muted">Sidst opdateret: [dato]</p>
        {doc.sections.map(([heading, text]) => (
          <section key={heading}>
            <h2 className="t-heading-m">{heading}</h2>
            <p className="t-body-s info__muted">{text}</p>
          </section>
        ))}
      </article>
    </AuthPage>
  );
}
