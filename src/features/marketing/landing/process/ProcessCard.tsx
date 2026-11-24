'use client';

import Image from 'next/image';
import { useState } from 'react';
import { NavArrowDown as NavArrowDownIcon } from '@/components/icons';
import { Reveal } from '../motion/Reveal';
import { useInView } from './useInView';

export type ProcessCardProps = {
  stepKey: string;
  index: number;
  title: string;
  description: string;
  detail: string;
  photo: string;
  delay: number;
  visual: (live: boolean, stillDelay: number) => React.ReactNode;
};

/**
 * One step of the process story.
 *
 * The shell is still the shipped `.lp-step-*` plate; this component only adds
 * the interaction. A mouse can click anywhere on the card, while keyboard and
 * assistive-tech users get a real expand button whose accessible name is unique
 * per step. The detail region animates its grid row from `0fr` to `1fr` and is
 * `inert` while collapsed, so its copy cannot be tabbed into or read early.
 *
 * The visual is a render function because the code plate needs the live flag:
 * it types only after the card is on screen.
 */
export function ProcessCard({
  stepKey,
  index,
  title,
  description,
  detail,
  photo,
  delay,
  visual,
}: ProcessCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { ref, live } = useInView<HTMLDivElement>();
  const detailId = `lp-process-detail-${stepKey}`;
  // One source of truth for the plate beat: CSS reads it as a custom property,
  // the revenue count-up receives the same value as a prop.
  const stillDelay = 260 + index * 90;

  return (
    <Reveal
      as="article"
      delay={delay}
      distance={28}
      className="lp-step-shell lp-process-item w-full max-w-lg lg:min-w-0 lg:max-w-none lg:flex-1"
    >
      <div
        ref={ref}
        className="lp-step-card lp-process-card"
        data-step={stepKey}
        data-expanded={expanded ? 'true' : 'false'}
        data-live={live ? 'true' : 'false'}
        style={{ '--lp-still-delay': `${stillDelay}ms` } as React.CSSProperties}
        onClick={() => setExpanded(value => !value)}
      >
        <figure className="lp-step-figure lp-process-figure">
          <Image
            src={photo}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 80vw, 100vw"
            className="lp-step-photo"
          />
          {visual(live, stillDelay)}
          <span aria-hidden="true" className="lp-step-veil" />
          <span aria-hidden="true" className="lp-step-grain" />
        </figure>

        <div className="lp-step-body lp-process-body">
          <h3 className="lp-step-title">
            <span className="lp-step-num">{index + 1}.</span> {title}
          </h3>
          <p className="lp-step-copy">{description}</p>

          <button
            type="button"
            className="lp-process-toggle"
            aria-expanded={expanded}
            aria-controls={detailId}
            aria-label={`${expanded ? 'Hide' : 'Show'} details for ${title}`}
            onClick={event => {
              // The button sits inside the card's click target. Stopping the
              // bubble keeps one press from toggling twice.
              event.stopPropagation();
              setExpanded(value => !value);
            }}
          >
            <span>{expanded ? 'Hide details' : 'Show details'}</span>
            <NavArrowDownIcon
              className="lp-process-toggle-icon"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </button>

          <div
            id={detailId}
            className="lp-process-detail"
            data-expanded={expanded ? 'true' : 'false'}
          >
            <div className="lp-process-detail-inner" inert={!expanded}>
              <p className="lp-process-detail-copy">{detail}</p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
