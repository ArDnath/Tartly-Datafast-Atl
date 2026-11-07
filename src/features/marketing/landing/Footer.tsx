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
    <footer className="w-full border-t border-gray-200 bg-canvas px-6 pt-10 text-sm text-slate-500 md:px-16 lg:px-24 xl:px-32">
      <div className="grid grid-cols-1 gap-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" aria-label={BRAND.name}>
            <BrandLockup size={28} />
          </Link>
          <p className="mt-6 max-w-xs text-sm/7">{BRAND.description}</p>
          <a
            className="mt-3 inline-block text-sm text-gray-500 transition hover:text-gray-800"
            href={`mailto:${BRAND.supportEmail}`}
          >
            {BRAND.supportEmail}
          </a>
        </div>

        {FOOTER_COLUMNS.map(column => (
          <div key={column.title} className="flex flex-col">
            <div className="flex flex-col space-y-2.5 text-sm">
              <h2 className="mb-5 font-semibold text-gray-800">{column.title}</h2>
              {column.links.map(link => (
                <Link key={link.label} className="transition hover:text-slate-600" href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-slate-200 py-4 md:flex-row">
        <p className="text-center" suppressHydrationWarning>
          Copyright {new Date().getFullYear()} © {BRAND.legalEntity}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/legal/privacy">Privacy Policy</Link>
          <Link href="/legal/terms">Terms of Service</Link>
          <Link href="/legal/cookies">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
}
