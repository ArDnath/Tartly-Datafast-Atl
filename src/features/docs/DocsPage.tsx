'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/brand/BrandMark';
import { BRAND } from '@/lib/brand';
import { DOCS_HOME, REVENUE_GUIDES, type DocsGuide } from './content';
import styles from './Docs.module.css';

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

function DocsNav({ activeSlug }: { activeSlug?: string }) {
  return (
    <nav className={styles.sidebar} aria-label="Documentation">
      <Link
        href="/docs"
        className={activeSlug ? styles.sidebarLink : styles.sidebarLinkActive}
        aria-current={activeSlug ? undefined : 'page'}
      >
        Overview
      </Link>
      <span className={styles.sidebarLabel}>Revenue guides</span>
      {REVENUE_GUIDES.map(guide => (
        <Link
          key={guide.slug}
          href={`/docs/revenue-guides/${guide.slug}`}
          className={activeSlug === guide.slug ? styles.sidebarLinkActive : styles.sidebarLink}
          aria-current={activeSlug === guide.slug ? 'page' : undefined}
        >
          {guide.title}
        </Link>
      ))}
      <span className={styles.sidebarLabel}>Install</span>
      <Link href="/docs#install" className={styles.sidebarLink}>
        Tracker snippet
      </Link>
      <Link href="/pricing" className={styles.sidebarLink}>
        Plans and limits
      </Link>
    </nav>
  );
}

function GuidePage({ guide }: { guide: DocsGuide }) {
  const index = REVENUE_GUIDES.findIndex(item => item.slug === guide.slug);
  const next = REVENUE_GUIDES[(index + 1) % REVENUE_GUIDES.length];

  return (
    <article className={styles.article}>
      <p className={styles.eyebrow}>Revenue guide</p>
      <h1 className={styles.title}>{guide.title}</h1>
      <p className={styles.lead}>{guide.summary}</p>
      <p className={styles.recommended}>{guide.recommendedFor}</p>

      <section aria-labelledby="connect-title">
        <h2 id="connect-title" className={styles.sectionTitle}>
          Connect
        </h2>
        <ol className={styles.steps}>
          {guide.connectSteps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="attribution-title">
        <h2 id="attribution-title" className={styles.sectionTitle}>
          Attribution
        </h2>
        <p className={styles.body}>{guide.attribution}</p>
      </section>

      {guide.warning && (
        <aside className={styles.callout} aria-label="Compatibility note">
          {guide.warning}
        </aside>
      )}

      {guide.officialLinks.length > 0 && (
        <section aria-labelledby="official-title">
          <h2 id="official-title" className={styles.sectionTitle}>
            Official provider links
          </h2>
          <ul className={styles.links}>
            {guide.officialLinks.map(link => (
              <li key={link.url}>
                <ExternalLink href={link.url}>{link.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className={styles.articleFooter}>
        <Link href="/docs" className={styles.secondary}>
          All guides
        </Link>
        <Link href={`/docs/revenue-guides/${next.slug}`} className={styles.primary}>
          Next: {next.title}
        </Link>
      </footer>
    </article>
  );
}

function DocsOverview() {
  return (
    <article className={styles.article}>
      <p className={styles.eyebrow}>Documentation</p>
      <h1 className={styles.title}>{DOCS_HOME.title}</h1>
      <p className={styles.lead}>{DOCS_HOME.summary}</p>

      <section id="install" aria-labelledby="start-title">
        <h2 id="start-title" className={styles.sectionTitle}>
          Start here
        </h2>
        <ol className={styles.steps}>
          <li>Create a workspace and add your website in the app.</li>
          <li>
            Copy the tracker snippet from the website settings and place it in the page head. The
            snippet uses <code>/script.js</code> and the website&apos;s <code>data-website-id</code>.
          </li>
          <li>Open the live verification step. It reads the event store; there is no fake success.</li>
          <li>Connect a payment provider on the same website settings page.</li>
        </ol>
      </section>

      <section aria-labelledby="guides-title">
        <h2 id="guides-title" className={styles.sectionTitle}>
          Revenue guides
        </h2>
        <div className={styles.cardGrid}>
          {REVENUE_GUIDES.map(guide => (
            <Link
              key={guide.slug}
              href={`/docs/revenue-guides/${guide.slug}`}
              className={styles.guideCard}
            >
              <h3>{guide.title}</h3>
              <p>{guide.summary}</p>
              <span>Read the guide</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="context-title">
        <h2 id="context-title" className={styles.sectionTitle}>
          Two billing contexts
        </h2>
        <p className={styles.body}>
          Payment providers connected here are <strong>analytics integrations</strong>: they let
          RevenueLens measure the revenue your customers generate. They are not used to charge your
          RevenueLens subscription. Platform billing is separate and will appear under Plan and
          usage when it ships.
        </p>
      </section>
    </article>
  );
}

export function DocsPage({ guide }: { guide?: DocsGuide }) {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brandLink} aria-label={BRAND.name}>
          <BrandWordmark />
        </Link>
        <nav className={styles.navLinks} aria-label="Main">
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs" aria-current="page">
            Docs
          </Link>
          <Link href="/login" className={styles.navCta}>
            Sign in
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <DocsNav activeSlug={guide?.slug} />
        {guide ? <GuidePage guide={guide} /> : <DocsOverview />}
      </main>

      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} {BRAND.legalEntity}
        </span>
        <nav aria-label="Footer">
          <Link href="/pricing">Pricing</Link>
          {' · '}
          <Link href="/signup">Sign up</Link>
          {' · '}
          <Link href="/login">Sign in</Link>
        </nav>
      </footer>
    </div>
  );
}
