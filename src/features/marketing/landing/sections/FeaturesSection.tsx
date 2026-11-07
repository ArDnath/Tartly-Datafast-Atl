import { ChartSplineIcon, LayoutPanelTopIcon, NotebookPenIcon } from 'lucide-react';

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
    <section
      id="features"
      className="mx-auto mt-24 grid max-w-6xl grid-cols-1 divide-y divide-gray-200/70 overflow-hidden rounded-lg border border-gray-200/70 md:mt-42 lg:grid-cols-3 lg:divide-x lg:divide-y-0"
    >
      {FEATURES.map(item => (
        <article
          key={item.title}
          className="flex h-full flex-col items-start gap-4 p-6 pb-10 transition duration-300 hover:bg-gray-50 md:p-8 md:pb-14"
        >
          <div className="flex items-center gap-2 text-gray-500">
            <item.icon className="size-5" />
            <h2 className="text-base font-medium text-gray-800">{item.title}</h2>
          </div>
          <p className="max-w-72 text-sm/6 text-gray-500">{item.description}</p>
        </article>
      ))}
    </section>
  );
}
