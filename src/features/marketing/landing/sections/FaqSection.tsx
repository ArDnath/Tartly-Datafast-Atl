import Link from 'next/link';
import { NavArrowDown as ChevronDownIcon } from '@/components/icons';
import { BRAND } from '@/lib/brand';
import {
  FREE_TRIAL_DAYS,
  FREE_TRIAL_EVENTS,
  FREE_TRIAL_WEBSITES,
  formatMonthlyPrice,
  PLANS,
} from '@/lib/plans';
import { Reveal } from '../motion/Reveal';

const starter = PLANS[0];
const pro = PLANS[1];

const FAQS = [
  {
    question: `How does ${BRAND.name} match revenue to traffic?`,
    answer:
      'Each payment is matched to the visit that produced it, so you can see the source, campaign, landing page, and the pages seen before checkout. First-touch and last-touch views are both included.',
  },
  {
    question: 'What do I install?',
    answer:
      'One script tag. The install guides cover WordPress, Shopify, Webflow, Framer, Wix, Squarespace, Ghost, Google Tag Manager, Next.js, React, Vite, Astro, Remix, and plain HTML.',
  },
  {
    question: 'Which payment providers can I connect?',
    answer:
      'Stripe, Dodo Payments, Lemon Squeezy, Polar, and Yolfi, plus a manual payment API for custom checkout systems. Provider credentials are encrypted at rest.',
  },
  {
    question: 'Is there a free trial?',
    answer: `${FREE_TRIAL_DAYS} days, ${FREE_TRIAL_EVENTS.toLocaleString('en-US')} events, and ${FREE_TRIAL_WEBSITES} website. No credit card required.`,
  },
  {
    question: 'What does it cost after the trial?',
    answer: `Starter is ${formatMonthlyPrice(starter)} per month at the default traffic tier. Pro is ${formatMonthlyPrice(pro)} per month. Move the pricing slider to match your monthly traffic, or switch to yearly billing for two months free.`,
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Cancellation is scheduled for the end of the current billing period, so you keep access until the period you already paid for ends.',
  },
] as const;

/**
 * Objection handling at the point of decision. Native details keep the answers
 * keyboard accessible and work without JavaScript; the only motion is the
 * chevron and a short answer fade on the shared curve.
 */
export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-b border-lp-line bg-lp-canvas">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <div className="text-center">
          <Reveal>
            <p className="lp-eyebrow">FAQ</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 id="faq-title" className="lp-display mt-3 text-3xl sm:text-4xl md:text-5xl">
              Questions before you start
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mx-auto mt-4 max-w-lg text-sm/6 text-lp-fg-muted text-pretty">
              The short answers. The install guide and docs cover the longer version.
            </p>
          </Reveal>
        </div>

        <div className="mt-9 border-t border-lp-line">
          {FAQS.map((item, index) => (
            <Reveal key={item.question} delay={index * 60}>
              <details className="group border-b border-lp-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-base font-black tracking-tight text-lp-ink sm:text-lg">
                    {item.question}
                  </span>
                  <ChevronDownIcon
                    className="size-4 shrink-0 text-lp-fg-muted transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-180 motion-reduce:transition-none"
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                </summary>
                <p className="lp-faq-answer max-w-2xl pb-5 text-sm/6 text-lp-fg-muted">
                  {item.answer}
                </p>
              </details>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <p className="mt-6 text-center text-xs text-lp-fg-muted">
            Still deciding?{' '}
            <Link
              href="/pricing"
              className="font-semibold text-lp-ink underline decoration-lp-primary/40 underline-offset-4 hover:decoration-lp-primary"
            >
              Compare the plans
            </Link>{' '}
            or{' '}
            <Link
              href="/docs/install"
              className="font-semibold text-lp-ink underline decoration-lp-primary/40 underline-offset-4 hover:decoration-lp-primary"
            >
              read the install guide
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
