import { FigureStage } from '../figures/FigureStage';
import { Reveal } from '../motion/Reveal';
import { StorySteps, type StoryStep } from './StorySteps';

/* ------------------------------------------------------------------ */
/* Feature data                                                        */
/* ------------------------------------------------------------------ */

const FEATURES: StoryStep[] = [
  {
    key: 'revenue-columns',
    title: 'Traffic, meet revenue',
    description: 'Every channel, its visitors, and the dollars it paid.',
    visual: (
      <FigureStage
        id="revenue-columns"
        describe="Twelve revenue columns on a plinth, moving in a swell. Point at one to hold it still."
      />
    ),
  },
  {
    key: 'attribution-rails',
    title: 'Every payment, traced',
    description: 'First touch or last, the source is attached.',
    visual: (
      <FigureStage
        id="attribution-rails"
        describe="A Y-junction: first touch and last touch merge into one leg carrying the payment."
      />
    ),
  },
  {
    key: 'funnel-steps',
    title: 'See where they drop',
    description: 'Signup, trial, payment — one funnel.',
    visual: (
      <FigureStage
        id="funnel-steps"
        describe="Three terraces narrowing as they descend, each step named on the drawing."
      />
    ),
  },
];

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="border-b border-lp-line bg-lp-canvas"
    >
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-20 md:pt-16 md:pb-28">
        <div className="mx-auto max-w-xl text-center lg:max-w-2xl">
          <Reveal delay={100}>
            <h2 id="features-title" className="lp-display text-2xl sm:text-3xl md:text-4xl">
              Traffic tells you who came.
              <br />
              <span className="text-lp-primary">Revenue tells you who paid.</span>
            </h2>
          </Reveal>
        </div>

        <div className="mt-10 md:mt-12">
          <StorySteps steps={FEATURES} variant="stacked" />
        </div>
      </div>
    </section>
  );
}
