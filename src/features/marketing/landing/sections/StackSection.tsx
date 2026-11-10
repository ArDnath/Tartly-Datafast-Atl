import Link from 'next/link';
import { Reveal } from '../motion/Reveal';

interface StackTile {
  name: string;
  logo: string;
  href: string;
  /** Brand colour used for the hover rule and the tooltip dot. */
  tint: string;
}

/**
 * Site builders and CMS platforms that accept the tracker script through
 * their custom-code area, and the frameworks covered by the install guides.
 * The integration for the first group is the script tag itself — there are no
 * native plugins or marketplace apps in this repository yet, so the copy must
 * keep saying that instead of implying datafast-style native integrations.
 *
 * Logos: colored marks fetched from SVGL (the official brand logos) for
 * React, Astro, Framer, HTML5, WordPress, Shopify, Webflow, Remix, Next.js,
 * and Vite; monochrome Simple Icons remain for Wix, Squarespace, Ghost, and
 * Google Tag Manager, which have no colored square mark in that source.
 * Every tile keeps its logo in full colour against a neutral cream chip and
 * reveals the platform name in a tooltip on hover or keyboard focus.
 */
const SITE_PLATFORMS: StackTile[] = [
  {
    name: 'WordPress',
    logo: '/images/frameworks/wordpress.svg',
    href: '/docs/install',
    tint: '#21759b',
  },
  {
    name: 'Shopify',
    logo: '/images/frameworks/shopify.svg',
    href: '/docs/install',
    tint: '#95bf47',
  },
  {
    name: 'Webflow',
    logo: '/images/frameworks/webflow.svg',
    href: '/docs/install',
    tint: '#146ef5',
  },
  {
    name: 'Framer',
    logo: '/images/frameworks/framer.svg',
    href: '/docs/install',
    tint: '#0055ff',
  },
  { name: 'Wix', logo: '/images/frameworks/wix.svg', href: '/docs/install', tint: '#0c6efc' },
  {
    name: 'Squarespace',
    logo: '/images/frameworks/squarespace.svg',
    href: '/docs/install',
    tint: '#1f1f1f',
  },
  { name: 'Ghost', logo: '/images/frameworks/ghost.svg', href: '/docs/install', tint: '#15171a' },
  {
    name: 'Google Tag Manager',
    logo: '/images/frameworks/googletagmanager.svg',
    href: '/docs/install',
    tint: '#246fdb',
  },
];

const CODE_FRAMEWORKS: StackTile[] = [
  {
    name: 'Next.js',
    logo: '/images/frameworks/nextdotjs.svg',
    href: '/docs/install',
    tint: '#1f1f1f',
  },
  { name: 'React', logo: '/images/frameworks/react.svg', href: '/docs/install', tint: '#087ea4' },
  { name: 'Vite', logo: '/images/frameworks/vite.svg', href: '/docs/install', tint: '#646cff' },
  { name: 'Astro', logo: '/images/frameworks/astro.svg', href: '/docs/install', tint: '#ff5d01' },
  { name: 'Remix', logo: '/images/frameworks/remix.svg', href: '/docs/install', tint: '#121212' },
  {
    name: 'Plain HTML',
    logo: '/images/frameworks/html5.svg',
    href: '/docs/install',
    tint: '#e34f26',
  },
];

function LogoTile({ tile }: { tile: StackTile }) {
  return (
    <li className="relative size-14">
      <Link
        href={tile.href}
        aria-label={tile.name}
        style={{ '--tile-tint': tile.tint } as React.CSSProperties}
        className="group/tile stack-tile relative flex size-full items-center justify-center rounded-md border p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-primary"
      >
        <img
          src={tile.logo}
          alt=""
          loading="lazy"
          className="size-7 object-contain transition-transform duration-300 group-hover/tile:scale-110"
        />
        <span
          aria-hidden="true"
          className="stack-tip pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 flex -translate-x-1/2 translate-y-1 items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-visible/tile:translate-y-0 group-focus-visible/tile:opacity-100"
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: tile.tint }}
            aria-hidden="true"
          />
          {tile.name}
        </span>
      </Link>
    </li>
  );
}

function StackPanel({
  index,
  title,
  tiles,
  footer,
}: {
  index: string;
  title: string;
  tiles: StackTile[];
  footer: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-lp-line bg-lp-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-lp-line pb-4">
        <h3 className="lp-label text-lp-fg-muted">{title}</h3>
        <span className="font-mono text-[10px] font-bold text-lp-primary">{index}</span>
      </div>

      <ul className="grid flex-1 grid-cols-4 content-start justify-items-center gap-2 py-5 sm:flex sm:flex-wrap sm:justify-start">
        {tiles.map(tile => (
          <LogoTile key={tile.name} tile={tile} />
        ))}
      </ul>

      <p className="border-t border-lp-line pt-3 text-[11px]/4 text-lp-fg-muted">{footer}</p>
    </div>
  );
}

/**
 * Two compact panels, side by side on md+: every no-code platform the script
 * accepts, and every framework the install guides cover. Payment providers
 * are not listed here; they have their own section. Every tile links to a
 * page that already ships — do not add a tile before what it links to exists.
 */
export function StackSection() {
  return (
    <section
      id="integrations"
      aria-labelledby="stack-title"
      className="border-b border-lp-line bg-lp-canvas"
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Reveal>
              <p className="lp-eyebrow">Integrations</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 id="stack-title" className="lp-display mt-3 text-3xl sm:text-4xl md:text-5xl">
                WORKS WITH YOUR STACK
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <p className="max-w-md text-sm/6 text-lp-fg-muted md:text-right">
              Drop one script tag into the platform or framework you already deploy. Every guide
              generates the same snippet from the same website ID.
            </p>
          </Reveal>
        </div>

        <div className="mt-9 grid items-stretch gap-4 md:grid-cols-2">
          <Reveal className="h-full">
            <StackPanel
              index="01"
              title="No code — site builders and CMS"
              tiles={SITE_PLATFORMS}
              footer="Plus any platform with a custom-code area."
            />
          </Reveal>
          <Reveal delay={100} className="h-full">
            <StackPanel
              index="02"
              title="Code — frameworks"
              tiles={CODE_FRAMEWORKS}
              footer="The same snippet works in any server-rendered template — PHP, Django, Express."
            />
          </Reveal>
        </div>

        <p className="mt-4 text-center text-[11px] text-lp-fg-muted">
          Script-tag integration — native plugins and marketplace apps are not included yet. See the{' '}
          <Link
            href="/docs/install"
            className="font-semibold text-lp-ink underline decoration-lp-primary/40 underline-offset-4 hover:decoration-lp-primary"
          >
            install guides
          </Link>
          . Payment providers have their own connect flow in settings.
        </p>
      </div>
    </section>
  );
}
