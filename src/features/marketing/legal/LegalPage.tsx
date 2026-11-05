import Link from 'next/link';
import { BrandWordmark } from '@/components/brand/BrandMark';
import { BRAND } from '@/lib/brand';
import {
  LEGAL_DOCUMENTS,
  LEGAL_DRAFT_NOTICE,
  type LegalDocument,
} from '@/features/marketing/legal/legal-content';
import styles from './Legal.module.css';

export function LegalIndexPage() {
  return (
    <LegalShell title="Legal" summary="Draft policies for review. Not legal advice.">
      <div className={styles.notice}>{LEGAL_DRAFT_NOTICE}</div>
      <ul className={styles.index}>
        {LEGAL_DOCUMENTS.map(document => (
          <li key={document.slug}>
            <Link href={`/legal/${document.slug}`}>{document.title}</Link>
            <span>{document.summary}</span>
          </li>
        ))}
      </ul>
    </LegalShell>
  );
}

export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <LegalShell title={document.title} summary={document.summary}>
      <div className={styles.notice}>{LEGAL_DRAFT_NOTICE}</div>
      <p className={styles.updated}>Last updated {document.updated}</p>
      {document.sections.map(section => (
        <section key={section.heading} className={styles.section}>
          <h2>{section.heading}</h2>
          {section.body.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <p className={styles.back}>
        <Link href="/legal">All legal documents</Link>
      </p>
    </LegalShell>
  );
}

function LegalShell({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" aria-label={BRAND.name} className={styles.brand}>
          <BrandWordmark />
        </Link>
        <nav aria-label="Main" className={styles.links}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <main className={styles.main}>
        <h1>{title}</h1>
        <p className={styles.summary}>{summary}</p>
        {children}
      </main>
      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} {BRAND.legalEntity}
        </span>
        <span>
          <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/terms">Terms</Link> ·{' '}
          <Link href="/legal/acceptable-use">Acceptable use</Link>
        </span>
      </footer>
    </div>
  );
}
