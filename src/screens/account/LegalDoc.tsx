import { PageHeader } from '../../components/PageHeader';
import { legalDocs, type LegalKind } from '../../data/settings';
import './account.css';

/** Privatlivspolitik eller databehandleraftale, åbnes fra Indstillinger. */
export function LegalDoc({ kind }: { kind: LegalKind }) {
  const doc = legalDocs[kind];
  return (
    <div className="acc-screen">
      <PageHeader title={doc.title} fallback="/indstillinger" />
      <main className="acc-content">
        <article className="legal-doc">
          <p className="t-caption acc-muted">Prototype-tekst · Sidst opdateret 24. november 2026</p>
          <p className="t-body">{doc.intro}</p>
          {doc.sections.map(([heading, text], i) => (
            <section key={heading} className="legal-doc__section">
              <h2 className="t-heading-s">
                {i + 1}. {heading}
              </h2>
              <p className="t-body-s acc-muted">{text}</p>
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
