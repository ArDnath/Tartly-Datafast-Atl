import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { BrandLockup } from './BrandLockup';

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Process', href: '/#process' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Install guide', href: '/docs/install' },
      { label: 'Compare', href: '/alternatives' },
      { label: 'Get started', href: '/signup' },
      { label: 'Log in', href: '/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Cookies', href: '/legal/cookies' },
      { label: 'Contact', href: `mailto:${BRAND.supportEmail}` },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-lp-line bg-lp-canvas px-6 pt-14 text-sm text-lp-fg-muted">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
          <div>
            <Link href="/" aria-label={BRAND.name}>
              <BrandLockup size={28} />
            </Link>
            <p className="mt-5 max-w-xs text-xs/6">{BRAND.description}</p>
            <a
              className="mt-4 inline-block font-mono text-[11px] font-semibold text-lp-ink underline decoration-lp-primary/40 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-lp-primary"
              href={`mailto:${BRAND.supportEmail}`}
            >
              {BRAND.supportEmail}
            </a>
          </div>

          {FOOTER_COLUMNS.map(column => (
            <div key={column.title} className="flex flex-col">
              <h2 className="lp-label mb-4 text-lp-ink">{column.title}</h2>
              <div className="flex flex-col space-y-2.5 text-[13px]">
                {column.links.map(link => (
                  <Link
                    key={link.label}
                    className="w-fit transition-colors hover:text-lp-primary"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-lp-line py-6 font-mono text-[10px] tracking-[0.1em] uppercase md:flex-row">
          <p className="text-center" suppressHydrationWarning>
            Copyright {new Date().getFullYear()} © {BRAND.legalEntity}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link className="transition-colors hover:text-lp-primary" href="/legal/privacy">
              Privacy
            </Link>
            <Link className="transition-colors hover:text-lp-primary" href="/legal/terms">
              Terms
            </Link>
            <Link className="transition-colors hover:text-lp-primary" href="/legal/cookies">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
