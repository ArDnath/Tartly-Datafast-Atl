import { expect, test } from 'vitest';
import { getReplayMaskConfig, isReplayConsentGranted } from './privacy';

test('moderate replay masking is the default and masks every input', () => {
  expect(getReplayMaskConfig()).toEqual({ maskAllInputs: true });
  expect(getReplayMaskConfig('moderate')).toEqual({ maskAllInputs: true });
  expect(getReplayMaskConfig('unexpected')).toEqual({ maskAllInputs: true });
});

test('strict replay masking also masks all text', () => {
  expect(getReplayMaskConfig('strict')).toEqual({
    maskAllInputs: true,
    maskTextSelector: '*',
  });
});

test('implicit consent records without an extra gate; required consent stays closed until granted', () => {
  expect(isReplayConsentGranted()).toBe(true);
  expect(isReplayConsentGranted({ mode: 'implicit' })).toBe(true);
  expect(isReplayConsentGranted({ mode: 'required' })).toBe(false);
  expect(isReplayConsentGranted({ mode: 'required', granted: false })).toBe(false);
  expect(isReplayConsentGranted({ mode: 'required', granted: true })).toBe(true);
  // An explicit decision from the host page wins in either mode.
  expect(isReplayConsentGranted({ mode: 'implicit', granted: false })).toBe(false);
  expect(isReplayConsentGranted({ mode: 'implicit', granted: true })).toBe(true);
});
