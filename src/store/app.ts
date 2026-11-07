import { create } from 'zustand';
import {
  DATE_RANGE_CONFIG,
  DEFAULT_DATE_RANGE_VALUE,
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  TIMEZONE_CONFIG,
} from '@/lib/constants';
import { getTimezone } from '@/lib/date';
import { getItem } from '@/lib/storage';

/**
 * The initial state must be identical on the server and in the browser.
 * Reading localStorage or the browser timezone here makes the first client
 * render disagree with the server HTML, which React reports as a hydration
 * error. Client-only preferences are applied by `hydrateAppStore()` after
 * mount instead.
 */
const DEFAULT_TIMEZONE = 'UTC';

const initialState = {
  locale: DEFAULT_LOCALE,
  timezone: DEFAULT_TIMEZONE,
  localTimezone: DEFAULT_TIMEZONE,
  dateRangeValue: DEFAULT_DATE_RANGE_VALUE,
  share: null,
  shareToken: null,
  user: null,
  config: null,
};

const store = create(() => ({ ...initialState }));

/**
 * Apply browser-only preferences once the app has hydrated. Call this from a
 * client-only effect (see `Providers`), never during render.
 */
export function hydrateAppStore() {
  store.setState({
    locale: getItem(LOCALE_CONFIG) || DEFAULT_LOCALE,
    timezone: getItem(TIMEZONE_CONFIG) || getTimezone(),
    localTimezone: getTimezone(),
    dateRangeValue: getItem(DATE_RANGE_CONFIG) || DEFAULT_DATE_RANGE_VALUE,
  });
}

export function setTimezone(timezone: string) {
  store.setState({ timezone });
}

export function setLocale(locale: string) {
  store.setState({ locale });
}

export function setShareData(share: object | null, shareToken: { token?: string } | null) {
  store.setState({ share, shareToken });
}

export function setUser(user: object) {
  store.setState({ user });
}

export function setConfig(config: object) {
  store.setState({ config });
}

export function setDateRangeValue(dateRangeValue: string) {
  store.setState({ dateRangeValue });
}

export const useApp = store;
