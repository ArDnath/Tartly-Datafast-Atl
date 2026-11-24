import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight as ArrowRightIcon } from '@/components/icons';
import { Reveal } from '../motion/Reveal';

interface FounderCard {
  photo: string;
  alt: string;
  title: string;
  copy: string;
}

/**
 * Line illustrations, not photographs: nobody in these frames is a customer and
 * no quote is attributed to them. Each drawing is transparent PNG, so the cream
 * page shows through and there is no white plate and no blend mode. The
 * captions describe the kind of team the product is built for, in the second
 * person.
 */
const CARDS: FounderCard[] = [
  {
    photo: '/images/landing/who-solo.png',
    alt: 'Line illustration of a founder seated among a lightbulb, gears, and a revenue chart',
    title: 'Solo founder',
    copy: 'One tag. See which channel paid.',
  },
  {
    photo: '/images/landing/who-team.png',
    alt: 'Line illustration of four teammates celebrating around laptops and a code board',
    title: 'Small engineering team',
    copy: 'Traffic, trials, and revenue in one view.',
  },
  {
    photo: '/images/landing/who-agency.png',
    alt: 'Line illustration of the wordmark xyz.com agency flanked by emphasis marks',
    title: 'Small agency',
    copy: 'One isolated workspace per client.',
  },
];

/**
 * The audience band. The heading is a three-line statement, one line per card,
 * with the last line carrying the emphasis; the plates below hold the
 * photograph alone and the captions sit underneath. The row closes on a single
 * call to action, so the section answers "who is this for" and then asks.
 */
export function FounderBand() {
  return (
    <section
      id="who-its-for"
      aria-labelledby="who-title"
      className="border-b border-lp-line bg-lp-canvas"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28">
        <Reveal delay={80}>
          <h2 id="who-title" className="lp-who-statement mt-5">
            <span className="lp-who-line">Built for the solo founder</span>
            <span className="lp-who-line">Built for the small engineering team</span>
            <span className="lp-who-line" data-emphasis="true">
              Built for the small agency
            </span>
          </h2>
        </Reveal>

        <div className="lp-who-grid">
          {CARDS.map((card, index) => (
            <Reveal key={card.title} delay={index * 90} distance={20} className="h-full">
              <figure className="lp-who-card">
                <div className="lp-who-frame">
                  <Image
                    src={card.photo}
                    alt={card.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="lp-who-photo"
                  />
                </div>

                <figcaption className="lp-who-caption">
                  <h3 className="lp-who-title">{card.title}</h3>
                  <p className="lp-who-copy">{card.copy}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-14 flex justify-center md:mt-16">
          <Link
            href="/signup"
            className="lp-btn-shadow inline-flex h-12 items-center justify-center gap-2 rounded-md bg-lp-primary px-7 text-[13px] font-black tracking-[0.14em] whitespace-nowrap text-white uppercase"
          >
            Start now
            <ArrowRightIcon className="size-4" strokeWidth={3} aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
