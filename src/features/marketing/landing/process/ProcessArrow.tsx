/**
 * The connector between two process cards.
 *
 * A hand-drawn line rather than an icon: the shaft and the head are separate
 * paths so `process.css` can draw them in sequence, and the dot is a third
 * element that travels the shaft once. The wrapper's `data-revealed` state
 * (written by `Reveal`) is the only trigger, so the arrow is never animated
 * twice and is already complete without JavaScript.
 */
export function ProcessArrow() {
  return (
    <svg
      className="lp-process-arrow-svg"
      viewBox="0 0 56 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="lp-process-arrow-line"
        d="M1 8h46"
        pathLength={1}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        className="lp-process-arrow-head"
        d="M42.5 3 48 8l-5.5 5"
        pathLength={1}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="lp-process-arrow-dot" cx={1} cy={8} r={2} fill="currentColor" />
    </svg>
  );
}
