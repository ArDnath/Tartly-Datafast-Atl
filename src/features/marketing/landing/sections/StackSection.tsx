import Link from 'next/link';

interface StackTile {
  name: string;
  logo: string;
  href: string;
  /** Brand colour used for the tile tint and the hover label dot. */
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
 * Every tile keeps its logo in full colour against a soft brand tint and
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
        className="group/tile stack-tile relative flex size-full items-center justify-center rounded-lg border p-2 transition duration-300 hover:-translate-y-0.5 hover:shadow-sm focus-visible:-translate-y-0.5 focus-visible:shadow-sm"
      >
        <img
          src={tile.logo}
          alt=""
          loading="lazy"
          className="size-7 object-contain transition-transform duration-300 group-hover/tile:scale-110"
        />
        <span
          aria-hidden="true"
          className="stack-tip pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 flex -translate-x-1/2 translate-y-1 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap opacity-0 shadow-sm transition duration-200 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-visible/tile:translate-y-0 group-focus-visible/tile:opacity-100"
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
  title,
  tiles,
  footer,
}: {
  title: string;
  tiles: StackTile[];
  footer: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <h3 className="pb-7 text-center text-[10px] font-medium tracking-[0.14em] text-gray-400 uppercase">
        {title}
      </h3>
      <ul className="grid flex-1 grid-cols-4 justify-items-center gap-2 sm:flex sm:flex-wrap sm:content-start sm:justify-center">
        {tiles.map(tile => (
          <LogoTile key={tile.name} tile={tile} />
        ))}
      </ul>
      <p className="mt-2.5 text-[11px]/4 text-gray-400">{footer}</p>
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
      className="mx-auto mt-20 max-w-7xl px-4"
    >
      <div className="max-w-sm">
        <h2 id="stack-title" className="font-domine text-3xl font-extrabold text-gray-900">
          WORKS WITH YOUR STACK
        </h2>
        <p className="mt-3 text-sm/6 text-gray-500">
          Drop one script tag into the platform or framework you already deploy. Every guide
          generates the same snippet from the same website ID.
        </p>
      </div>

      <div className="mt-8 grid items-stretch gap-3 md:grid-cols-2">
        <StackPanel
          title="No code — site builders and CMS"
          tiles={SITE_PLATFORMS}
          footer="Plus any platform with a custom-code area."
        />
        <StackPanel
          title="Code — frameworks"
          tiles={CODE_FRAMEWORKS}
          footer="The same snippet works in any server-rendered template — PHP, Django, Express."
        />
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        Script-tag integration — native plugins and marketplace apps are not included yet. See the{' '}
        <Link href="/docs/install" className="underline">
          install guides
        </Link>
        . Payment providers have their own connect flow in settings.
      </p>
    </section>
  );
}
