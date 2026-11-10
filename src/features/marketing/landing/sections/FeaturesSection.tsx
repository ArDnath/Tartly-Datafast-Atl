import {
  GraphUp as ChartSplineIcon,
  ViewStructureUp as LayoutPanelTopIcon,
  PageEdit as NotebookPenIcon,
} from '@/components/icons';
import { BRAND } from '@/lib/brand';
import { Reveal } from '../motion/Reveal';

interface Feature {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: LayoutPanelTopIcon,
    title: 'Traffic and revenue together',
    description:
      'Visitors, pageviews, revenue, and conversion rate share one date range. No exports to stitch together.',
  },
  {
    icon: ChartSplineIcon,
    title: 'First- and last-touch attribution',
    description:
      'Every payment is matched to the visit, referrer, campaign, and landing page that produced it.',
  },
  {
    icon: NotebookPenIcon,
    title: 'Funnels, goals, and journeys',
    description:
      'Track signups, trials, and purchases as goals. Follow the path from first click to paid, then fix the step that leaks.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="border-b border-lp-line bg-lp-canvas">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl lg:max-w-3xl">
            <Reveal>
              <p className="lp-eyebrow">Why {BRAND.name}</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="lp-display mt-3 text-3xl sm:text-4xl md:text-5xl">
                Traffic tells you who came.
                <br />
                <span className="text-lp-primary">Revenue tells you who paid.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <p className="max-w-sm text-sm/6 text-lp-fg-muted text-pretty md:text-right">
              Every report answers the same question: which source, campaign, or page produced a
              paying customer — and which one only produced a visit.
            </p>
          </Reveal>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((item, index) => (
            <Reveal key={item.title} delay={index * 90} className="h-full">
              <article className="lp-card-lift group flex h-full flex-col rounded-lg border border-lp-line bg-lp-card p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-md border border-lp-line bg-lp-canvas text-lp-ink transition-colors duration-200 group-hover:border-lp-primary group-hover:text-lp-primary">
                    <item.icon className="size-5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-lp-fg-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-black tracking-tight text-lp-ink">{item.title}</h3>
                <p className="mt-2.5 max-w-72 text-sm/6 text-lp-fg-muted">{item.description}</p>

                <div className="mt-auto pt-6">
                  <div className="h-0.5 w-20 origin-left scale-x-50 bg-lp-primary transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
