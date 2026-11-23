import Link from 'next/link';
import { ArrowRight as ArrowRightIcon } from '@/components/icons';
import { Parallax } from '../motion/Parallax';
import { Reveal } from '../motion/Reveal';
import { WordReveal } from '../motion/WordReveal';

const TAGLINE =
  'Traffic is a vanity metric. Revenue is the signal that tells you where to spend next.';

/**
 * The mandatory large-type moment: a two-line benefit statement that turns on
 * word by word as the reader scrolls. It sits between the argument (features)
 * and the proof (how it works), never directly under the hero.
 */
export function TaglineReveal() {
  return (
    <section
      id="tagline"
      aria-labelledby="tagline-title"
      className="relative overflow-hidden border-b border-lp-line bg-lp-canvas"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Parallax
          className="absolute -inset-16 lp-hairline-grid opacity-30"
          speed={0.04}
          max={26}
        />
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-lp-pink-soft/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:py-24">
        <Reveal>
          <p className="lp-eyebrow text-center">The revenue lens</p>
        </Reveal>

        <WordReveal
          as="h2"
          id="tagline-title"
          text={TAGLINE}
          className="lp-display mt-6 text-center text-3xl text-pretty sm:text-4xl md:text-5xl lg:text-6xl"
        />

        <Reveal delay={120} className="mt-10 flex justify-center md:mt-12">
          <Link
            href="/login"
            className="lp-btn-shadow flex h-12 items-center justify-center gap-2 rounded-md bg-lp-primary px-7 text-[13px] font-black tracking-[0.14em] whitespace-nowrap text-white uppercase"
          >
            Get started
            <ArrowRightIcon className="size-4" strokeWidth={3} aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
