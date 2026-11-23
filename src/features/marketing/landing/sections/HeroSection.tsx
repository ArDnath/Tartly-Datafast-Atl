'use client';

import { useEffect, useRef, useState } from 'react';
import { ThreeDButton } from '@/components/evil-buttons/3d-button';
import { Globe as GlobeIcon } from '@/components/icons';
import { BRAND } from '@/lib/brand';
import { formatMonthlyPrice, PLANS } from '@/lib/plans';
import FoldText from '../motion/FoldText';
import { Parallax } from '../motion/Parallax';
import RotatingText, { type RotatingTextHandle } from '../motion/RotatingText';
import { HeroPreview } from './HeroPreview';

const PLACEHOLDERS = ['website.com', 'app.yoursaas.com', 'store.yourshop.com', 'blog.yoursite.dev'];

/*
 * The word the reader can press. Every option is something this product
 * actually reports, so the sentence stays true whichever one is showing.
 */
const SWAP_WORDS = ['channels', 'campaigns', 'pages'];
const REVENUE_WORDS = ['money', 'revenue', 'profit'];

function SwapHighlight({
  label,
  icon,
  words,
  index,
  onChange,
}: {
  label: string;
  words: readonly string[];
  icon?: string;
  index: number;
  onChange: (index: number) => void;
}) {
  const word = words[index] ?? words[0] ?? '';

  return (
    <button
      type="button"
      className="lp-swap"
      title={`Change ${label}`}
      aria-label={`Change ${label} (currently ${word})`}
      onClick={() => onChange((index + 1) % words.length)}
    >
      {icon ? (
        <span className="lp-swap-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="lp-swap-stack" aria-hidden="true">
        {words.map((option, optionIndex) => (
          <span key={option} className={optionIndex === index ? 'is-on' : undefined}>
            {option}
          </span>
        ))}
      </span>
    </button>
  );
}

function RotatingChannelHighlight({
  index,
  onChange,
}: {
  index: number;
  onChange: (index: number) => void;
}) {
  const rotatingTextRef = useRef<RotatingTextHandle>(null);
  const word = SWAP_WORDS[index] ?? SWAP_WORDS[0];

  return (
    <button
      type="button"
      className="lp-swap"
      title="Change the channel word"
      aria-label={`Change the channel word (currently ${word})`}
      onClick={() => rotatingTextRef.current?.next()}
    >
      <RotatingText
        ref={rotatingTextRef}
        texts={SWAP_WORDS}
        effect="slide"
        direction="up"
        highlight={false}
        auto
        pauseOnHover
        rotationInterval={4200}
        staggerFrom="last"
        staggerDuration={0.04}
        splitLevelClassName="lp-rotating-word-window"
        mainClassName="lp-rotating-text"
        onNext={onChange}
      />
    </button>
  );
}

const foldTextProps = {
  foldStyle: 'paper' as const,
  splitBy: 'char' as const,
  hinge: 'top' as const,
  foldAngle: 92,
  duration: 0.65,
  stagger: 0.045,
  staggerFrom: 'start' as const,
  ease: 'power3.out',
  trigger: 'mount' as const,
  hoverRefold: true,
  refoldRadius: 140,
  refoldAngle: 45,
  perspective: 700,
  creaseShading: 0.45,
  fontSize: 'inherit',
  fontWeight: 'inherit',
};

/*
 * The original hand-drawn note, restored as it was: same 300x220 viewBox,
 * same tilted script label and the same long S-curve arrow. Only the colour
 * (orange arrow, ink label) and the draw-in animation are new.
 *
 * The rotation sits on a wrapping group because the label's CSS fade animates
 * `transform`, which would otherwise replace the SVG transform attribute. Both
 * strokes carry pathLength="1", so the draw-in needs no measurement in
 * JavaScript.
 *
 * The original anchor lands the note's left edge on the preview's right edge;
 * below 1440px the label runs off the viewport, so the note is only shown from
 * there up.
 */
function DemoAnnotation() {
  return (
    <div className="lp-demo-note pointer-events-none absolute top-0 left-[calc(50%+36rem)] z-20 -mt-1 hidden -translate-y-full select-none min-[1440px]:block">
      <svg
        className="h-auto w-72 overflow-visible"
        viewBox="0 0 300 220"
        fill="none"
        aria-hidden="true"
      >
        <g transform="rotate(20 88 42)">
          <text
            className="lp-demo-note-text"
            x="88"
            y="42"
            fontFamily="'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive"
            fontSize="23"
            fontWeight="500"
            letterSpacing="0.4"
          >
            interactive demo
          </text>
        </g>
        <g>
          <path
            className="lp-demo-note-line"
            pathLength={1}
            d="M166 82C138 99 101 117 99 138C97 157 133 157 151 169C170 182 153 194 129 200C99 207 60 211 18 218"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="lp-demo-note-head"
            pathLength={1}
            d="M40 201 18 218 44 220"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}

export function HeroSection() {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(PLACEHOLDERS[0].length);
  const [deleting, setDeleting] = useState(false);
  const [channelIndex, setChannelIndex] = useState(0);
  const [revenueIndex, setRevenueIndex] = useState(0);
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
    <section
      id="home"
      className="lp-hero-section relative overflow-hidden border-b border-lp-line bg-lp-canvas"
    >
      {/*
        The cream ground is never empty: a dotted field drifts behind the copy,
        and the right third carries a hatched panel whose left edge dissolves
        into the page. Both are decorative and sit under the content.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Parallax className="absolute -inset-16 lp-dots opacity-65" speed={0.06} max={40} />
      </div>

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

      <div className="lp-hero relative z-10 mx-auto w-full max-w-5xl px-5 sm:px-6">
        <h1
          aria-label={`See which ${SWAP_WORDS[channelIndex]} actually make ${REVENUE_WORDS[revenueIndex]}`}
          className="lp-hero-title lp-hero-rise"
          style={{ animationDelay: '80ms' }}
        >
          <span className="lp-hero-line lp-hero-line-first">
            <FoldText text="See which" className="lp-fold-copy" {...foldTextProps} />{' '}
            <RotatingChannelHighlight index={channelIndex} onChange={setChannelIndex} />
          </span>
          <span className="lp-hero-line lp-hero-line-soft">
            <FoldText text="actually" className="lp-fold-copy lp-hero-fade" {...foldTextProps} />{' '}
            <span className="lp-mark-swirl">
              <FoldText text="make" className="lp-fold-copy" {...foldTextProps} />{' '}
              <SwapHighlight
                label="the revenue word"
                icon="💸"
                words={REVENUE_WORDS}
                index={revenueIndex}
                onChange={setRevenueIndex}
              />
              {/* Hand-drawn underline that wipes in after the words land. */}
              <svg
                className="lp-mark-swirl-line"
                viewBox="0 0 300 24"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{ animationDelay: '1100ms' }}
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
          </span>
        </h1>

        <p className="lp-hero-hint lp-hero-rise" style={{ animationDelay: '220ms' }}>
          Tap a highlighted word to swap it <span aria-hidden="true">↗</span>
        </p>

        <p className="lp-hero-lede lp-hero-rise" style={{ animationDelay: '300ms' }}>
          <b>Connect your site and your payment provider.</b> See the referrers, campaigns, and
          pages behind every payment — then fix the ones that do not pay.
        </p>

        <form
          action="/signup"
          method="get"
          className="lp-hero-form lp-hero-rise"
          style={{ animationDelay: '390ms' }}
        >
          <input type="hidden" name="returnUrl" value="/onboarding" />
          <div className="lp-hero-input-wrap lp-hero-pill relative">
            <GlobeIcon
              className="lp-hero-input-icon pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-lp-fg-muted"
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
              className="lp-hero-input lp-hero-pill-input"
            />
            <ThreeDButton type="submit" className="lp-hero-3d">
              Start tracking
            </ThreeDButton>
          </div>
        </form>

        <p className="lp-hero-byline lp-hero-rise" style={{ animationDelay: '470ms' }}>
          <span>No free tier</span>
          <span aria-hidden="true" className="lp-hero-dot">
            ·
          </span>
          <span>
            Starter from <b className="lp-hero-price">{formatMonthlyPrice(starter)}/mo</b>
          </span>
          <span aria-hidden="true" className="lp-hero-dot">
            ·
          </span>
          <span>Paid access starts after checkout · cancel anytime</span>
        </p>

        <p className="sr-only">
          {BRAND.name} tracks traffic and matches payments to the visits that produced them.
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 md:px-6 md:pb-16">
        <DemoAnnotation />
        <div
          className="lp-hero-preview-in relative mx-auto w-full max-w-6xl"
          style={{ animationDelay: '620ms' }}
        >
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
