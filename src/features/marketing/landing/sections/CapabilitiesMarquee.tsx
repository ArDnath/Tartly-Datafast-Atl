'use client';

import { useEffect, useState } from 'react';
import Marquee from 'react-fast-marquee';
import {
  ArrowUpRight as ArrowUpRightIcon,
  StatsReport as BarChart3Icon,
  CreditCard as CreditCardIcon,
  Filter as FilterIcon,
  GitBranch as GitBranchIcon,
  MultiplePages as LayersIcon,
  CursorPointer as MousePointerClickIcon,
  MapsArrow as RouteIcon,
  Trophy as TargetIcon,
  StatUp as TrendingUpIcon,
  Group as UsersIcon,
} from '@/components/icons';
import { Parallax } from '../motion/Parallax';
import { Reveal } from '../motion/Reveal';

interface Capability {
  question: string;
  answer: string;
  tag: string;
  availability: string;
  icon: typeof BarChart3Icon;
}

const CAPABILITIES: Capability[] = [
  {
    question: 'Which channel pays?',
    answer:
      'Open revenue by channel for any date range. Each row shows visitors, revenue, and the source that brought them.',
    tag: 'Attribution',
    availability: 'Starter and Pro',
    icon: BarChart3Icon,
  },
  {
    question: 'What did a customer do first?',
    answer:
      'First-touch attribution keeps the visit that created the lead, including the referrer, campaign, and landing page.',
    tag: 'First touch',
    availability: 'Starter and Pro',
    icon: MousePointerClickIcon,
  },
  {
    question: 'What closed the sale?',
    answer:
      'Last-touch attribution shows the visit closest to payment, so you can see what actually converted.',
    tag: 'Last touch',
    availability: 'Starter and Pro',
    icon: CreditCardIcon,
  },
  {
    question: 'Where does the funnel leak?',
    answer:
      'Goals and funnels show the drop between visit, signup, checkout, and payment. Fix the step that loses the most.',
    tag: 'Funnels',
    availability: 'Starter and Pro',
    icon: FilterIcon,
  },
  {
    question: 'What happened before checkout?',
    answer:
      'Open a session to see pageviews, events, and the payment in one ordered timeline, with the source attached.',
    tag: 'Journeys',
    availability: 'Pro',
    icon: RouteIcon,
  },
  {
    question: 'Which page earns?',
    answer:
      'The landing-page report ranks pages by revenue, not only traffic, so a popular page that never pays is obvious.',
    tag: 'Pages',
    availability: 'Starter and Pro',
    icon: LayersIcon,
  },
  {
    question: 'Which campaign pays?',
    answer:
      'Group every payment by UTM source, medium, and campaign. Stop paying for clicks that never become customers.',
    tag: 'Campaigns',
    availability: 'Starter and Pro',
    icon: TargetIcon,
  },
  {
    question: 'Do customers come back?',
    answer:
      'Cohorts and retention show whether the customers you win keep paying, not just whether the first payment landed.',
    tag: 'Retention',
    availability: 'Pro',
    icon: UsersIcon,
  },
];

const WORKFLOW = [
  { label: 'Connect', icon: GitBranchIcon },
  { label: 'Track', icon: TrendingUpIcon },
  { label: 'Decide', icon: BarChart3Icon },
];

const FIRST_ROW = CAPABILITIES.slice(0, 4);
const SECOND_ROW = CAPABILITIES.slice(4);

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

export function CapabilitiesMarquee() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      aria-labelledby="capabilities-title"
      className="relative overflow-hidden border-b border-lp-line bg-lp-card/40"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Parallax className="absolute -inset-16 lp-dots opacity-40" speed={0.05} max={34} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <p className="lp-eyebrow-pink">The report tour</p>
          </Reveal>
          <Reveal delay={80}>
            <h2
              id="capabilities-title"
              className="lp-display mt-3 text-3xl sm:text-4xl md:text-5xl"
            >
              WHAT YOU CAN <span className="lp-highlight-pink">ANSWER</span>
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 max-w-xl text-center text-sm/6 text-lp-fg-muted">
              Eight questions between the first click and the payment. Every card is a live report
              in the workspace. Hover or tap to pause the tour and read one.
            </p>
          </Reveal>
        </div>

        <Reveal delay={180}>
          {reducedMotion ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map(item => (
                <CapabilityCard key={item.question} item={item} fluid />
              ))}
            </div>
          ) : (
            <div className="marquee-fade mt-12 space-y-4">
              <Marquee autoFill pauseOnClick pauseOnHover play speed={32}>
                {FIRST_ROW.map(item => (
                  <CapabilityCard key={item.question} item={item} />
                ))}
              </Marquee>
              <Marquee autoFill direction="right" pauseOnClick pauseOnHover play speed={32}>
                {SECOND_ROW.map(item => (
                  <CapabilityCard key={item.question} item={item} />
                ))}
              </Marquee>
            </div>
          )}
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 font-mono text-[10px] tracking-[0.12em] text-lp-fg-muted uppercase">
            {WORKFLOW.map(({ label, icon: WorkflowIcon }, index) => (
              <span key={label} className="inline-flex items-center gap-2">
                <WorkflowIcon
                  className="size-3 text-lp-primary"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
                {label}
                {index < WORKFLOW.length - 1 && (
                  <span className="ml-2 text-lp-line" aria-hidden="true">
                    /
                  </span>
                )}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CapabilityCard({ item, fluid = false }: { item: Capability; fluid?: boolean }) {
  const Icon = item.icon;

  return (
    <article
      className={`lp-card-lift group flex h-[16.5rem] shrink-0 flex-col rounded-lg border border-lp-line bg-lp-card p-5 text-left ${
        fluid ? 'w-full' : 'mx-2 w-[19rem]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-lp-pink/60 bg-lp-pink-soft/70 px-2 py-1 font-mono text-[9px] font-bold tracking-[0.12em] text-lp-pink-ink uppercase">
          <Icon className="size-3" strokeWidth={2.4} aria-hidden="true" />
          {item.tag}
        </span>
        <span className="font-mono text-[9px] tracking-[0.06em] text-lp-fg-muted uppercase">
          {item.availability}
        </span>
      </div>

      <h3 className="mt-4 text-base font-black tracking-tight text-lp-ink">{item.question}</h3>
      <p className="mt-2 text-[13px]/5 text-lp-fg-muted">{item.answer}</p>

      <div className="mt-auto flex items-center gap-1.5 border-t border-lp-line pt-3 font-mono text-[9px] font-semibold tracking-[0.08em] text-lp-fg-muted uppercase transition-colors group-hover:text-lp-primary">
        <ArrowUpRightIcon className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
        <span>See it in the workspace</span>
      </div>
    </article>
  );
}
