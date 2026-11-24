import Link from 'next/link';
import { Reveal } from '../motion/Reveal';

interface StackTile {
  name: string;
  logo: string;
  href: string;
  /** Brand colour used for the hover rule and the tile accent. */
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
 * Names are always visible next to the mark; the tile only changes weight on
 * hover so the section reads as a manifest, not a guessing game.
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
    <li>
      <Link
        href={tile.href}
        aria-label={tile.name}
        style={{ '--tile-tint': tile.tint } as React.CSSProperties}
        className="stack-tile group/tile flex items-center gap-1.5 rounded-md border py-1.5 pr-2 pl-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-primary"
      >
        <span className="stack-tile-mark flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-lp-line bg-lp-canvas">
          <img
            src={tile.logo}
            alt=""
            loading="lazy"
            className="size-3.5 object-contain transition-transform duration-200 motion-safe:group-hover/tile:scale-105"
          />
        </span>
        <span className="text-[11px] font-semibold whitespace-nowrap text-lp-ink/80 transition-colors duration-200 group-hover/tile:text-lp-ink">
          {tile.name}
        </span>
      </Link>
    </li>
  );
}

function StackLane({
  title,
  tiles,
  footer,
}: {
  title: string;
  tiles: StackTile[];
  footer: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-lp-card px-5 py-5 sm:px-6">
      <h3 className="lp-label text-lp-fg-muted">{title}</h3>

      <ul className="mt-4 flex flex-1 flex-wrap content-start gap-2">
        {tiles.map(tile => (
          <LogoTile key={tile.name} tile={tile} />
        ))}
      </ul>

      <p className="mt-5 border-t border-lp-line pt-3 text-[11px]/4 text-lp-fg-muted">{footer}</p>
    </div>
  );
}

/**
 * One script tag works everywhere HTML can be edited. The two groups share a
 * single surface so the section stays compact on small screens. Every tile
 * links to a page that already ships — do not add a tile before what it links
 * to exists.
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
              Paste it into your <code className="font-mono text-xs">&lt;head&gt;</code>. Works with
              every platform that lets you add custom code, and every framework that renders HTML.
            </p>
          </Reveal>
        </div>

        <Reveal delay={160} distance={22}>
          <div className="mt-8 overflow-hidden rounded-xl border border-lp-line bg-lp-card">
            <div className="flex flex-col gap-2 border-b border-lp-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="inline-flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="stack-socket-pip" aria-hidden="true" />
                <span className="text-lp-fg-muted">&lt;script defer src=</span>
                <span className="font-semibold text-lp-primary">"/t.js"</span>
                <span className="text-lp-fg-muted">&gt;</span>
              </span>
              <span className="text-xs text-lp-fg-muted">One snippet, no plugins.</span>
            </div>

            <div className="grid gap-px bg-lp-line md:grid-cols-2">
              <StackLane
                title="Site builders and CMS"
                tiles={SITE_PLATFORMS}
                footer="Plus any platform with a custom-code area."
              />
              <StackLane
                title="Frameworks"
                tiles={CODE_FRAMEWORKS}
                footer="The same snippet works in any server-rendered template."
              />
            </div>
          </div>
        </Reveal>

        <p className="mt-4 text-center text-xs/5 text-lp-fg-muted">
          Script tag integration only. Native plugins and marketplace apps are not included yet.{' '}
          <Link
            href="/docs/install"
            className="font-semibold text-lp-ink underline decoration-lp-primary/40 underline-offset-4 hover:decoration-lp-primary"
          >
            See the install guides
          </Link>
          . Providers connect in settings.
        </p>
      </div>
    </section>
  );
}
