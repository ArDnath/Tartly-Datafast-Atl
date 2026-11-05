/**
 * Replay privacy helpers.
 *
 * These are plain functions so the recorder bundle and the unit tests agree on
 * the same defaults. Replay is masked by default; a site can ask for stricter
 * text masking with `data-mask-level="strict"`.
 */
export function getReplayMaskConfig(level = 'moderate') {
  switch (level) {
    case 'strict':
      return {
        maskAllInputs: true,
        maskTextSelector: '*',
      };
    default:
      return {
        maskAllInputs: true,
      };
  }
}

/**
 * `implicit` (the default) records without an extra consent gate. `required`
 * keeps the recorder idle until the host page grants consent through
 * `window.__taliviaConsent = true` or a `talivia:consent` event with
 * `{ granted: true }`. An explicit `granted: false` stops recording in either
 * mode.
 */
export function isReplayConsentGranted({ mode = 'implicit', granted = undefined } = {}) {
  if (granted !== undefined) {
    return granted === true;
  }

  return mode !== 'required';
}
