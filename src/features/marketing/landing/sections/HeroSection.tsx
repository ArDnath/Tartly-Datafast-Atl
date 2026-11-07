'use client';

import { ArrowRightIcon, GlobeIcon, TrendingUpIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { FREE_TRIAL_DAYS, FREE_TRIAL_EVENTS, formatMonthlyPrice, PLANS } from '@/lib/plans';

const PLACEHOLDERS = ['website.com', 'app.yoursaas.com', 'store.yourshop.com', 'blog.yoursite.dev'];

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
    <section id="home" className="flex flex-col items-center justify-center">
      <div className="mt-28 flex items-center gap-2 text-gray-500 md:mt-32">
        <TrendingUpIcon className="size-4.5" />
        <span>Revenue-first analytics for indie SaaS</span>
      </div>

      <h1 className="m-2 max-w-3xl text-center text-4xl/11 font-extrabold tracking-[-0.04em] text-gray-900 sm:text-5xl/17 md:text-[64px]/20">
        See which channels actually make money
      </h1>

      <p className="mt-2 max-w-lg text-center text-base text-gray-500">
        Connect your site and your payment provider. See the referrers, campaigns, and pages behind
        every payment — then fix the ones that do not pay.
      </p>

      <form
        action="/signup"
        method="get"
        className="mt-9 flex w-full max-w-80 flex-col items-center gap-2 sm:max-w-72"
      >
        <div className="group flex w-full items-stretch overflow-hidden rounded-lg border border-gray-200 bg-canvas shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition focus-within:border-gray-300 focus-within:ring-4 focus-within:ring-gray-100">
          <span
            aria-hidden="true"
            className="flex w-12 shrink-0 items-center justify-center border-r border-gray-200 bg-gray-50 text-gray-400 transition group-focus-within:bg-canvas group-focus-within:text-gray-500"
          >
            <GlobeIcon className="size-5 transition duration-150 group-focus-within:scale-105" />
          </span>
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
            className="h-12 min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
          />
        </div>

        <button
          type="submit"
          style={{
            backgroundColor: BRAND.colors.blush,
            color: BRAND.colors.blushInk,
            outlineColor: BRAND.colors.blush,
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-medium transition hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px"
        >
          Start tracking
          <ArrowRightIcon className="size-4" />
        </button>

        <p className="mt-1.5 text-center text-xs/5 text-gray-400">
          <span className="block">
            {FREE_TRIAL_DAYS}-day free trial · {FREE_TRIAL_EVENTS.toLocaleString('en-US')} events
          </span>
          <span className="block">
            Then Starter {formatMonthlyPrice(starter)}/mo. No card required.
          </span>
        </p>
      </form>

      <p className="sr-only">
        {BRAND.name} tracks traffic and matches payments to the visits that produced them.
      </p>
    </section>
  );
}
