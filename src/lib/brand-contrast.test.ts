import { describe, expect, test } from 'vitest';
import { BRAND } from './brand';

function channel(value: number) {
  const normalized = value / 255;

  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const value = hex.replace('#', '');
  const [red, green, blue] = (value.match(/\w\w/g) ?? []).map(part =>
    channel(Number.parseInt(part, 16)),
  );

  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Unsupported color: ${hex}`);
  }

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NORMAL_TEXT = 4.5;

describe('brand color contrast', () => {
  const pairs: [
    name: string,
    foreground: keyof typeof BRAND.colors,
    background: keyof typeof BRAND.colors,
  ][] = [
    ['body text on canvas', 'foreground', 'canvas'],
    ['body text on card', 'foreground', 'card'],
    ['muted text on card', 'mutedForeground', 'card'],
    ['muted text on raised surface', 'mutedForeground', 'muted'],
    ['blush signal on canvas', 'blush', 'canvas'],
    ['blush signal on card', 'blush', 'card'],
    ['warning on canvas', 'warning', 'canvas'],
    ['ink on blush', 'blushInk', 'blush'],
    ['ink on soft blush', 'blushInk', 'blushSoft'],
    ['body text on accent surface', 'foreground', 'accent'],
  ];

  for (const [name, foreground, background] of pairs) {
    test(`${name} meets WCAG AA for normal text`, () => {
      expect(contrast(BRAND.colors[foreground], BRAND.colors[background])).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      );
    });
  }
});
