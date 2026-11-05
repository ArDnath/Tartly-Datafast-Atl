import Link from 'next/link';
import { BrandWordmark } from '@/components/brand/BrandMark';
import { BRAND } from '@/lib/brand';
import { ALTERNATIVES, PRICE_COMPARISON, getAlternative } from './alternatives-content';
import styles from '../Landing.module.css';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brandLink} aria-label={BRAND.name}>
          <BrandWordmark />
        </Link>
        <nav className={styles.navLinks} aria-label="Main">
          <Link href="/pricing">Pricing</Link>
          <Link href="/alternatives">Compare</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className={styles.navCta}>
            Get started
          </Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} {BRAND.legalEntity}
        </span>
        <nav aria-label="Footer">
          <Link href="/pricing">Pricing</Link>
          {' · '}
          <Link href="/alternatives">Compare</Link>
          {' · '}
          <Link href="/docs">Docs</Link>
          {' · '}
          <Link href="/legal">Legal</Link>
        </nav>
      </footer>
    </div>
  );
}

export function AlternativesIndexPage() {
  return (
    <Shell>
      <section className={styles.section} aria-labelledby="compare-title">
        <span className={styles.eyebrow}>Honest comparison</span>
        <h1 id="compare-title" className={styles.title}>
          Choose the analytics tool that matches your job.
        </h1>
        <p className={styles.subtitle}>
          Prices were fetched on 2026-11-06 and are not normalised by pageview or event limits.
          Compare the plan, not only the headline.
        </p>
        <div className={styles.proofGrid}>
          {ALTERNATIVES.map(item => (
            <article key={item.slug} className={styles.proof}>
              <h3>
                <Link href={`/alternatives/${item.slug}`}>{item.name}</Link>
              </h3>
              <p>{item.summary}</p>
              <p>
                <strong>{item.price}</strong>
              </p>
            </article>
          ))}
        </div>
        <p>
          <Link href="/pricing">See {BRAND.name} pricing</Link>
        </p>
      </section>
    </Shell>
  );
}

export function AlternativePage({ slug }: { slug: string }) {
  const item = getAlternative(slug);

  if (!item) {
    return null;
  }

  return (
    <Shell>
      <section className={styles.section} aria-labelledby="alternative-title">
        <span className={styles.eyebrow}>Comparison</span>
        <h1 id="alternative-title" className={styles.title}>
          {BRAND.name} vs {item.name}
        </h1>
        <p className={styles.subtitle}>{item.summary}</p>
        <div className={styles.actions}>
          <Link href="/signup" className={styles.primary}>
            Start with {BRAND.name}
          </Link>
          <Link href="/pricing" className={styles.secondary}>
            See pricing
          </Link>
        </div>
        <p>
          <strong>{item.name}:</strong> {item.price}
          <br />
          <a href={item.sourceUrl} rel="noreferrer noopener" target="_blank">
            Source (checked 2026-11-06)
          </a>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="facts-title">
        <h2 id="facts-title" className={styles.sectionTitle}>
          What {item.name} does well
        </h2>
        <div className={styles.proofGrid}>
          {item.facts.map(fact => (
            <article key={fact} className={styles.proof}>
              <p>{fact}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="honest-title">
        <h2 id="honest-title" className={styles.sectionTitle}>
          Where {BRAND.name} is not the right choice
        </h2>
        <div className={styles.proofGrid}>
          {item.caveats.map(caveat => (
            <article key={caveat} className={styles.proof}>
              <p>{caveat}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="price-title">
        <h2 id="price-title" className={styles.sectionTitle}>
          Price comparison
        </h2>
        <p className={styles.sectionSubtitle}>
          Entry prices as displayed on each vendor page on 2026-11-06. Limits differ.
        </p>
        <div className={styles.proofGrid}>
          {PRICE_COMPARISON.map(row => (
            <article key={row.name} className={styles.proof}>
              <h3>{row.name}</h3>
              <p>
                <strong>{row.price}</strong>
              </p>
              <p>{row.note}</p>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}
