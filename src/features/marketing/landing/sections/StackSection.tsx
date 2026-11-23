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
        className="stack-tile group/tile flex items-center gap-2 rounded-md border py-1.5 pr-2.5 pl-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-primary"
      >
        <span className="stack-tile-mark flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-lp-line bg-lp-canvas">
          <img
            src={tile.logo}
            alt=""
            loading="lazy"
            className="size-4 object-contain transition-transform duration-300 motion-safe:group-hover/tile:scale-110"
          />
        </span>
        <span className="text-[11px] font-bold whitespace-nowrap text-lp-ink/80 transition-colors duration-200 group-hover/tile:text-lp-ink">
          {tile.name}
        </span>
      </Link>
    </li>
  );
}

function StackLane({
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
    <div className="flex h-full flex-col bg-lp-card p-6 md:p-7">
      <div className="flex items-baseline justify-between gap-3 border-b border-lp-line pb-3">
        <h3 className="lp-label text-lp-fg-muted">{title}</h3>
        <span className="font-mono text-[10px] font-bold text-lp-primary">{index}</span>
      </div>

      <ul className="mt-5 flex flex-1 flex-wrap content-start gap-2">
        {tiles.map(tile => (
          <LogoTile key={tile.name} tile={tile} />
        ))}
      </ul>

      <p className="mt-5 border-t border-lp-line pt-3 text-[11px]/4 text-lp-fg-muted">{footer}</p>
    </div>
  );
}

/**
 * One script tag is the socket; every no-code platform and framework that
 * accepts it is a lane on the same manifest surface. The connector and the
 * single surface say "same snippet, different host" without a second pair of
 * floating cards. Every tile links to a page that already ships — do not add a
 * tile before what it links to exists.
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

        <Reveal delay={160}>
          <div className="mt-10 flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-lp-line bg-lp-card px-4 py-2 font-mono text-[11px] shadow-xs">
              <span className="stack-socket-pip" aria-hidden="true" />
              <span className="text-lp-fg-muted">&lt;script</span>
              <span className="text-lp-fg-muted">defer src=</span>
              <span className="font-semibold text-lp-primary">"/t.js"</span>
              <span className="text-lp-fg-muted">&gt;</span>
            </span>
            <span className="h-6 w-px bg-lp-line" aria-hidden="true" />
            <span className="stack-socket-node" aria-hidden="true" />
          </div>
        </Reveal>

        <Reveal delay={200} distance={22}>
          <div className="relative overflow-hidden rounded-xl border border-lp-line">
            <div className="grid gap-px bg-lp-line md:grid-cols-2">
              <StackLane
                index="01"
                title="No code — site builders and CMS"
                tiles={SITE_PLATFORMS}
                footer="Plus any platform with a custom-code area."
              />
              <StackLane
                index="02"
                title="Code — frameworks"
                tiles={CODE_FRAMEWORKS}
                footer="The same snippet works in any server-rendered template — PHP, Django, Express."
              />
            </div>
          </div>
        </Reveal>

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
