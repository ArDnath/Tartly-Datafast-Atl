'use client';

import { useEffect, useState } from 'react';
import {
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  Check as CheckIcon,
  Globe as GlobeIcon,
} from '@/components/icons';
import { BRAND } from '@/lib/brand';
import { formatMonthlyPrice, PLANS } from '@/lib/plans';
import { Parallax } from '../motion/Parallax';
import StarBorder from '../motion/StarBorder';
import { HeroPreview } from './HeroPreview';

const PLACEHOLDERS = ['website.com', 'app.yoursaas.com', 'store.yourshop.com', 'blog.yoursite.dev'];

const HERO_WORDS = ['See', 'which', 'channels', 'actually'];
const HERO_WORD_DELAY = 55;
const HERO_WORD_BASE_DELAY = 80;
const HERO_WORD_DURATION = 760;
// The swirl starts once the last headline word ("money") has finished landing.
const HERO_SWIRL_DELAY =
  HERO_WORD_BASE_DELAY + (HERO_WORDS.length + 1) * HERO_WORD_DELAY + HERO_WORD_DURATION + 40;

function heroWordDelay(index: number) {
  return `${HERO_WORD_BASE_DELAY + index * HERO_WORD_DELAY}ms`;
}

function DemoAnnotation() {
  return (
    <div className="pointer-events-none absolute top-0 left-[calc(50%+36rem)] z-20 -mt-1 hidden -translate-y-full select-none text-[#a52a2a] lg:block">
      <svg
        className="h-auto w-72 overflow-visible"
        viewBox="0 0 300 220"
        fill="none"
        aria-hidden="true"
      >
        <text
          x="88"
          y="42"
          transform="rotate(20 88 42)"
          fill="currentColor"
          fontFamily="'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive"
          fontSize="23"
          fontWeight="500"
          letterSpacing="0.4"
        >
          interactive demo
        </text>
        <path
          d="M166 82C138 99 101 117 99 138C97 157 133 157 151 169C170 182 153 194 129 200C99 207 60 211 18 218"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M40 201 18 218 44 220"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function HeroSection() {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(PLACEHOLDERS[0].length);
  const [deleting, setDeleting] = useState(false);
  const starter = PLANS[0];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCharIndex(PLACEHOLDERS[0].length);
      return;
    }

    const currentWord = PLACEHOLDERS[textIndex];

    if (!deleting && charIndex === currentWord.length) {
      const pause = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(pause);
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setTextIndex(prev => (prev + 1) % PLACEHOLDERS.length);
      return;
    }

    const timeout = setTimeout(
      () => {
        setCharIndex(prev => prev + (deleting ? -1 : 1));
      },
      deleting ? 26 : 55,
    );

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, textIndex]);

  const animatedPlaceholder = PLACEHOLDERS[textIndex].substring(0, charIndex);

  return (
    <section id="home" className="relative overflow-hidden border-b border-lp-line">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Parallax className="absolute -inset-16 lp-dots opacity-65" speed={0.06} max={40} />
      </div>

      {/* Hatched panel on the right, like the tracerHQ hero texture. */}
      <div
        className="pointer-events-none absolute top-0 right-0 hidden h-full w-1/3 overflow-hidden border-l border-lp-line bg-lp-canvas/40 lg:block"
        aria-hidden="true"
      >
        <Parallax
          className="absolute -inset-y-16 inset-x-0 lp-hatch opacity-80"
          speed={0.04}
          max={28}
        />
        {/* Narrow seam fade only; the rest of the hatch stays crisp. */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-lp-canvas to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-24 pb-10 text-center md:pt-28 md:pb-12">
        <StarBorder
          as="div"
          radius={9999}
          thickness={1}
          color="#ff4f00"
          trailColor="#f2b4cb"
          duration={8}
          trailLength={0.3}
          glow={0.9}
          sparkle
          hover="lap"
          clickPulse={false}
          theme="light"
          backgroundColor="rgba(251, 227, 236, 0.6)"
          borderColor="rgba(242, 180, 203, 0.8)"
          textColor="#8f2f52"
          className="lp-hero-in select-none text-[10px] font-bold tracking-[0.1em] uppercase sm:text-[11px]"
          style={{
            animationDelay: '0ms',
            padding: '6px 16px 6px 12px',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span className="flex items-center gap-1.5 text-lp-pink-ink">
            <ActivityIcon className="size-3.5 text-lp-pink-ink" strokeWidth={2.6} />
            First + last touch
          </span>
          <span className="h-3.5 w-px bg-lp-pink/50" aria-hidden="true" />
          <span className="text-lp-fg-muted">Revenue-first analytics for indie SaaS</span>
        </StarBorder>

        <h1
          aria-label="See which channels actually make money"
          className="lp-display mt-6 max-w-4xl text-[42px] sm:text-6xl md:text-[76px]"
        >
          {HERO_WORDS.map((word, index) => (
            <span key={word}>
              <span className="lp-hero-word" style={{ animationDelay: heroWordDelay(index) }}>
                {word}
              </span>{' '}
            </span>
          ))}
          <span className="lp-mark-swirl">
            <span
              className="lp-hero-word"
              style={{ animationDelay: heroWordDelay(HERO_WORDS.length) }}
            >
              make
            </span>{' '}
            <span
              className="lp-hero-word"
              style={{ animationDelay: heroWordDelay(HERO_WORDS.length + 1) }}
            >
              money
            </span>
            <svg
              className="lp-mark-swirl-line"
              viewBox="0 0 300 24"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ animationDelay: `${HERO_SWIRL_DELAY}ms` }}
            >
              <path
                d="M6 17C50 17 80 5 130 8c25 1.5 38 4 30 9-8 5-28 0-20-8 10-10 40-6 70-2 30 4 60 8 84 2"
                stroke="currentColor"
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
        </h1>

        <p
          className="lp-hero-in mt-5 max-w-xl text-base leading-relaxed font-medium text-lp-fg-muted md:text-lg"
          style={{ animationDelay: '400ms' }}
        >
          Connect your site and your payment provider. See the referrers, campaigns, and pages
          behind every payment — then fix the ones that do not pay.
        </p>

        <form
          action="/api/auth/google"
          method="get"
          className="lp-hero-in mt-7 flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row"
          style={{ animationDelay: '500ms' }}
        >
          <input type="hidden" name="returnUrl" value="/onboarding" />
          <div className="relative flex-1">
            <GlobeIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-lp-fg-muted"
              aria-hidden="true"
            />
            <label htmlFor="website" className="sr-only">
              Your website
            </label>
            <input
              id="website"
              name="website"
              type="text"
              autoComplete="url"
              required
              placeholder={animatedPlaceholder}
              className="h-14 w-full rounded-md border border-lp-line bg-lp-card pr-4 pl-10 text-[15px] font-medium text-lp-ink transition-colors placeholder:text-lp-fg-muted/60 hover:border-lp-fg-muted/50 focus:border-lp-primary focus:outline-none focus:ring-2 focus:ring-lp-primary/15"
            />
          </div>
          <button
            type="submit"
            className="lp-btn-shadow flex h-14 shrink-0 items-center justify-center gap-2 rounded-md bg-lp-primary px-7 text-sm font-black tracking-[0.14em] whitespace-nowrap text-white uppercase"
          >
            Start tracking
            <ArrowRightIcon className="size-4" strokeWidth={3} aria-hidden="true" />
          </button>
        </form>

        <div
          className="lp-hero-in mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-lp-fg-muted"
          style={{ animationDelay: '600ms' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" />
            No free tier
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" />
            Starter from {formatMonthlyPrice(starter)}/mo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" />
            Paid access starts after checkout · cancel anytime
          </span>
        </div>

        <p className="sr-only">
          {BRAND.name} tracks traffic and matches payments to the visits that produced them.
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 md:px-6 md:pb-12">
        <DemoAnnotation />
        <div className="relative mx-auto w-full max-w-6xl">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
