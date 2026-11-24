'use client';

import { Check as CheckIcon } from '@/components/icons';

interface CodeCardProps {
  /** True once the card has entered the viewport (or motion is reduced). */
  live: boolean;
}

/**
 * Plate 1 — the install snippet, drawn as a tiny editor window.
 *
 * The four lines always exist in the markup, so the server HTML (and a page
 * without JavaScript) carries the complete snippet. Only a motion-ready page
 * hides them behind a clip-path, and only while the card is not yet live. The
 * reveal is a stepped wipe, which reads as typing without a timer or a render
 * loop, and the install status lands last.
 */
export function CodeCard({ live }: CodeCardProps) {
  return (
    <div className="lp-step-band lp-step-band--code">
      <div className="lp-step-window lp-process-code" data-live={live ? 'true' : 'false'}>
        <div className="lp-step-window-bar">
          <span className="lp-step-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="lp-step-window-name">index.html</span>
        </div>

        <div className="lp-step-code lp-process-code-body">
          <span className="lp-process-code-line">
            <span className="lp-step-code-dim">&lt;</span>
            <span className="lp-process-code-tag">script</span>
          </span>
          <span className="lp-process-code-line">
            {'  '}
            <span className="lp-step-code-attr">defer</span>{' '}
            <span className="lp-step-code-attr">src</span>
            <span className="lp-step-code-dim">="</span>
            <span className="lp-process-code-url">https://tartly.in/t.js</span>
            <span className="lp-step-code-dim">"</span>
          </span>
          <span className="lp-process-code-line">
            {'  '}
            <span className="lp-step-code-attr">data-site</span>
            <span className="lp-step-code-dim">="</span>
            <span className="lp-process-code-value">site_8f2a</span>
            <span className="lp-step-code-dim">"&gt;</span>
          </span>
          <span className="lp-process-code-line">
            <span className="lp-step-code-dim">&lt;/</span>
            <span className="lp-process-code-tag">script</span>
            <span className="lp-step-code-dim">&gt;</span>
          </span>
        </div>

        <div className="lp-process-code-status">
          <span className="lp-process-code-dot" aria-hidden="true" />
          <CheckIcon className="lp-process-code-check" strokeWidth={3} aria-hidden="true" />
          <span>Installed successfully</span>
        </div>
      </div>
    </div>
  );
}
