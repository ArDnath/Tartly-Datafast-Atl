import Link from 'next/link';
import { ArrowUpRight as ArrowUpRightIcon, Plus as PlusIcon } from '@/components/icons';
import { BRAND } from '@/lib/brand';
import { formatMonthlyPrice, PLANS } from '@/lib/plans';
import { Reveal } from '../motion/Reveal';

const starter = PLANS[0];
const pro = PLANS[1];

const FAQS = [
  {
    question: `How does ${BRAND.name} match revenue to traffic?`,
    answer:
      'The tracker assigns each visitor a session ID. When a payment fires, that ID is attached to it. So every payment carries its full visit history: source, campaign, landing page, and pages seen before checkout. First-touch and last-touch views are both included.',
  },
  {
    question: 'What do I actually install?',
    answer:
      'One <script> tag in your <head>. The install guide covers WordPress, Shopify, Webflow, Framer, Wix, Squarespace, Ghost, Google Tag Manager, Next.js, React, Vite, Astro, Remix, and plain HTML. If your platform lets you add custom code, it works.',
  },
  {
    question: 'Which payment providers can I connect?',
    answer:
      'Stripe, Dodo Payments, Lemon Squeezy, Polar, and Yolfi. For anything else — your own checkout, a custom flow — the manual payment API accepts POST requests. Credentials are encrypted at rest.',
  },
  {
    question: 'Is there a free plan?',
    answer:
      'No. There are two paid plans, Starter and Pro, and no free tier or trial. Create your first website before checkout so the workspace is ready as soon as payment is confirmed.',
  },
  {
    question: 'What does it cost?',
    answer: `Starter is ${formatMonthlyPrice(starter)}/mo. Pro is ${formatMonthlyPrice(pro)}/mo. Both scale with traffic — move the pricing slider to see the price at your event volume. Annual billing takes two months off.`,
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Cancellation is scheduled for the end of the current billing period, so you keep access until the period you already paid for ends.',
  },
] as const;

const SIDE_LINKS = [
  { label: 'Compare plans', href: '/pricing' },
  { label: 'Read the install guide', href: '/docs/install' },
];

/**
 * Objection handling at the point of decision. Native details keep the answers
 * keyboard accessible and work without JavaScript; the only motion is the
 * toggle rotate and a short answer fade on the shared curve. The numbered
 * ledger on the right is the reading order, so the list stays scannable at a
 * glance instead of reading as a wall of rows.
 */
export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-b border-lp-line bg-lp-canvas">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Reveal>
              <p className="lp-eyebrow">FAQ</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 id="faq-title" className="lp-display mt-3 text-3xl sm:text-4xl">
                Questions before you start
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-4 max-w-xs text-sm/6 text-lp-fg-muted text-pretty">
                If something's not here, the docs are.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-6 border-y border-lp-line">
                {SIDE_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between gap-3 border-b border-lp-line py-3 text-sm font-semibold text-lp-ink last:border-b-0"
                  >
                    {link.label}
                    <ArrowUpRightIcon
                      className="size-4 text-lp-fg-muted transition-[color,translate] duration-200 ease-out group-hover:text-lp-primary motion-safe:group-hover:translate-x-0.5"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="flex flex-col gap-3">
            {FAQS.map((item, index) => (
              <Reveal key={item.question} delay={index * 50}>
                <details className="lp-faq-item group">
                  <summary className="flex cursor-pointer list-none items-start gap-4 p-5 text-left [&::-webkit-details-marker]:hidden">
                    <span aria-hidden="true" className="lp-faq-index w-5 shrink-0 pt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-base font-black tracking-tight text-lp-ink sm:text-lg">
                      {item.question}
                    </span>
                    <span aria-hidden="true" className="lp-faq-toggle shrink-0">
                      <PlusIcon className="lp-faq-icon size-3.5" strokeWidth={2.4} />
                    </span>
                  </summary>
                  <p className="lp-faq-answer max-w-2xl px-5 pb-5 text-sm/6 text-lp-fg-muted sm:pl-[3.5rem]">
                    {item.answer}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
