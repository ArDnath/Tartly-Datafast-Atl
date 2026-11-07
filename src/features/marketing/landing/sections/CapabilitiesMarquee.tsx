'use client';

import {
  ArrowUpRightIcon,
  BarChart3Icon,
  CreditCardIcon,
  FilterIcon,
  GitBranchIcon,
  LayersIcon,
  MousePointerClickIcon,
  RouteIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Marquee from 'react-fast-marquee';

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
    <section aria-labelledby="capabilities-title" className="mx-auto mt-24 max-w-7xl px-4 md:mt-32">
      <div className="flex flex-col items-center text-center">
        <p className="rounded-full border border-gray-200 bg-canvas px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-gray-500 uppercase">
          The report tour
        </p>
        <h2 id="capabilities-title" className="font-domine mt-4 text-3xl text-gray-900">
          WHAT YOU CAN ANSWER
        </h2>
        <p className="mt-4 max-w-xl text-center text-sm/6 text-gray-500">
          Eight questions between the first click and the payment. Every card is a live report in
          the workspace. Hover or tap to pause the tour and read one.
        </p>
      </div>

      {reducedMotion ? (
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-400">
        {WORKFLOW.map(({ label, icon: WorkflowIcon }) => (
          <span key={label} className="inline-flex items-center gap-1">
            <WorkflowIcon className="size-3" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function CapabilityCard({ item, fluid = false }: { item: Capability; fluid?: boolean }) {
  const Icon = item.icon;

  return (
    <article
      className={`flex h-[17rem] shrink-0 flex-col rounded-xl border border-gray-200 bg-canvas p-5 text-left shadow-[0_14px_34px_-16px_rgba(17,24,39,0.22),0_2px_6px_-2px_rgba(17,24,39,0.08)] ${
        fluid ? 'w-full' : 'mx-2 w-[19rem]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium tracking-wide text-gray-600 uppercase">
          <Icon className="size-3" />
          {item.tag}
        </span>
        <span className="text-[10px] text-gray-400">{item.availability}</span>
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-900">{item.question}</h3>
      <p className="mt-2 text-sm/6 text-gray-500">{item.answer}</p>

      <div className="mt-auto flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs text-gray-400">
        <ArrowUpRightIcon className="size-3.5" />
        <span>See it in the workspace</span>
      </div>
    </article>
  );
}
