'use client';

import Image from 'next/image';
import { BRAND } from '@/lib/brand';

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
  };

  return (
    <section className="mx-auto my-28 flex max-w-7xl flex-col items-center justify-center px-4 md:my-42">
      <h2 className="font-domine max-w-md bg-linear-to-r from-gray-900 to-gray-500 bg-clip-text text-center text-3xl text-transparent">
        Your revenue story is one script tag away
      </h2>
      <p className="mt-4 max-w-md text-center text-sm/6 text-gray-500">
        Connect your site and your payment provider. See which channels create paying customers
        before you spend another dollar on the ones that do not.
      </p>

      <button
        type="button"
        onClick={scrollToHero}
        style={{
          backgroundColor: BRAND.colors.blush,
          color: BRAND.colors.blushInk,
          outlineColor: BRAND.colors.blush,
        }}
        className="mt-6 flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px"
      >
        Start tracking revenue
      </button>

      <Image
        src="/images/landing/hand.png"
        alt=""
        width={200}
        height={200}
        className="hand-image mt-14 w-40 md:mt-20"
      />
    </section>
  );
}
