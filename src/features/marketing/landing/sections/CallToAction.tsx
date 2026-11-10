'use client';

import Image from 'next/image';
import { ArrowRight as ArrowRightIcon, Check as CheckIcon } from '@/components/icons';
import { Parallax } from '../motion/Parallax';
import { Reveal } from '../motion/Reveal';

export function CallToAction() {
  const scrollToHero = () => {
    const input = document.getElementById('website');
    if (!(input instanceof HTMLInputElement)) {
      window.location.assign('/signup?trial=1');
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    input.focus({ preventScroll: true });
    input.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });

    // Carry the click across the page: a one-shot ring lands on the field the
    // visitor should type into now that the form is back on screen.
    input.classList.remove('lp-attention');
    if (!prefersReducedMotion) {
      // Restart the animation even when the class was already present.
      void input.offsetWidth;
      input.classList.add('lp-attention');
      input.addEventListener('animationend', () => input.classList.remove('lp-attention'), {
        once: true,
      });
    }
  };

  return (
    <section className="relative overflow-hidden bg-lp-card/40 py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0 lp-dots opacity-40" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <Reveal className="relative overflow-hidden rounded-lg border border-lp-line bg-lp-canvas p-7 md:p-12 lg:p-14">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <Parallax
              className="absolute -inset-y-16 right-0 w-1/3 lp-hatch-pink opacity-60"
              speed={0.05}
              max={30}
            />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-lp-canvas/0 to-lp-canvas"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="lp-eyebrow-pink">Start today</p>
              <h2 className="lp-display mt-3 text-3xl sm:text-4xl md:text-5xl">
                Your revenue story is <span className="lp-mark">one script tag</span> away
              </h2>
              <p className="mt-4 max-w-md text-sm/6 text-lp-fg-muted">
                Connect your site and your payment provider. See which channels create paying
                customers before you spend another dollar on the ones that do not.
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:w-auto lg:items-end">
              <button
                type="button"
                onClick={scrollToHero}
                className="lp-btn-shadow flex h-14 w-full items-center justify-center gap-2 rounded-md bg-lp-primary px-8 text-sm font-black tracking-[0.14em] whitespace-nowrap text-white uppercase lg:w-auto"
              >
                Start tracking revenue
                <ArrowRightIcon className="size-4" strokeWidth={3} aria-hidden="true" />
              </button>

              {/* Points back up at the primary CTA so the invitation reads as one gesture. */}
              <Image
                src="/images/landing/hand.png"
                alt=""
                aria-hidden="true"
                width={350}
                height={586}
                className="lp-hand h-auto w-20 self-center md:w-24"
              />

              <p className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-lp-fg-muted uppercase">
                <CheckIcon className="size-3 text-emerald-600" strokeWidth={3} aria-hidden="true" />
                No card required · cancel anytime
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
