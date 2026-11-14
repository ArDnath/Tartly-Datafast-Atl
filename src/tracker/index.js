(window => {
  const {
    screen: { width, height },
    navigator: { language, doNotTrack: ndnt, msDoNotTrack: msdnt },
    location,
    document,
    history,
    top,
    doNotTrack,
  } = window;
  const { currentScript, referrer } = document;
  if (!currentScript) return;

  const { hostname, href, origin } = location;

  let localStorage;
  let sessionStorage;
  try {
    localStorage = href.startsWith('data:') ? undefined : window.localStorage;
    sessionStorage = href.startsWith('data:') ? undefined : window.sessionStorage;
  } catch {
    /* (DOMException) SecurityError: Access is denied for this document. */
  }

  const _data = 'data-';
  const _false = 'false';
  const _true = 'true';
  const attr = currentScript.getAttribute.bind(currentScript);
  const config = value => attr(`${_data}${value}`);

  const website = config('website-id');
  const hostUrl = config('host-url');
  const beforeSend = config('before-send');
  const tag = config('tag') || undefined;
  const autoTrack = config('auto-track') !== _false;
  const dnt = config('do-not-track') === _true;
  const excludeSearch = config('exclude-search') === _true;
  const excludeHash = config('exclude-hash') === _true;
  const allowedDomainConfig = config('domains') || '';
  const crossDomainConfig = config('cross-domain-domains') || '';
  const credentials = config('fetch-credentials') || 'omit';
  const perf = config('performance') === _true;
  const trackOutbound = config('track-outbound') === _true;
  const trackDownloads = config('track-downloads') === _true;
  const consentRequired = config('consent') === 'required';

  const domains = allowedDomainConfig
    .split(',')
    .map(n => n.trim())
    .filter(Boolean);
  const crossDomains = crossDomainConfig
    .split(',')
    .map(n => n.trim().toLowerCase())
    .filter(Boolean);
  const host =
    hostUrl || '__COLLECT_API_HOST__' || currentScript.src.split('/').slice(0, -1).join('/');
  const endpoint = `${host.replace(/\/$/, '')}__COLLECT_API_ENDPOINT__`;
  const screen = `${width}x${height}`;
  const eventDataRegex = /^data-talivia-event-([\w-_]+)$/;
  const eventNameAttribute = `${_data}talivia-event`;
  const visibleEventNameAttribute = `${_data}talivia-visible`;
  const visibleThresholdAttribute = `${visibleEventNameAttribute}-threshold`;
  const visibleDelayAttribute = `${visibleEventNameAttribute}-delay`;
  const defaultVisibleThreshold = 0.5;
  const delayDuration = 300;
  const sessionStorageKey = 'talivia.session';
  const linkerParam = '_tlv';
  const dodoSessionIdParam = 'metadata_talivia_session_id';
  const lemonSqueezySessionIdParam = 'checkout[custom][talivia_session_id]';
  const stripeClientReferenceParam = 'client_reference_id';
  const collectorContextEvent = 'talivia:collector-context';
  const collectorContextRequestEvent = 'talivia:request-collector-context';
  const sessionMaxAgeMs = 30 * 60 * 1000;

  /* Helper functions */

  let fallbackKeyCounter = 0;

  const createKey = prefix => {
    const cryptoApi = window.crypto;

    if (typeof cryptoApi?.randomUUID === 'function') {
      return `${prefix}_${cryptoApi.randomUUID()}`;
    }

    if (typeof cryptoApi?.getRandomValues === 'function') {
      const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
      let random = '';

      for (let index = 0; index < bytes.length; index += 1) {
        random += `0${bytes[index].toString(16)}`.slice(-2);
      }

      return `${prefix}_${random}`;
    }

    // Very old browsers without Web Crypto still get a collision-resistant
    // fallback without Math.random.
    fallbackKeyCounter += 1;
    return `${prefix}_${Date.now().toString(36)}${fallbackKeyCounter.toString(36)}`;
  };

  const publishCollectorContext = () => {
    document.dispatchEvent(
      new CustomEvent(collectorContextEvent, {
        detail: { cache },
      }),
    );
  };

  // Cookieless identity: the tracker stores no persistent identifier. A random
  // session token lives only in this tab's sessionStorage (or in memory when
  // storage is blocked) and expires after 30 minutes of inactivity. Visitor
  // uniqueness is derived server-side from a rotating salted hash.
  const getSessionId = () => {
    const now = Date.now();
    let stored;

    try {
      stored = sessionStorage?.getItem(sessionStorageKey);
    } catch {
      stored = undefined;
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          typeof parsed?.id === 'string' &&
          parsed.id &&
          typeof parsed.lastSeen === 'number' &&
          now - parsed.lastSeen < sessionMaxAgeMs
        ) {
          sessionId = parsed.id;
        }
      } catch {
        /* A malformed value is replaced below. */
      }
    }

    if (
      !sessionId ||
      (typeof sessionLastSeen === 'number' && now - sessionLastSeen >= sessionMaxAgeMs)
    ) {
      sessionId = createKey('s');
      cache = undefined;
      publishCollectorContext();
      linkerToken = undefined;
      linkerExpiresAt = undefined;
    }

    sessionLastSeen = now;

    try {
      sessionStorage?.setItem(sessionStorageKey, JSON.stringify({ id: sessionId, lastSeen: now }));
    } catch {
      /* Storage can be blocked; the in-memory session still works. */
    }

    return sessionId;
  };

  const hostnameMatches = (candidate, configured) =>
    candidate === configured || candidate.endsWith(`.${configured}`);

  const getIncomingLinker = () => {
    try {
      const parsed = new URL(location.href);
      const value = parsed.searchParams.get(linkerParam);

      if (!value) return undefined;

      parsed.searchParams.delete(linkerParam);
      history.replaceState(history.state, '', `${parsed.pathname}${parsed.search}${parsed.hash}`);
      return value;
    } catch {
      return undefined;
    }
  };

  const getCrossDomainUrl = el => {
    if (el?.tagName !== 'A' || !el.href) return undefined;

    try {
      const targetUrl = new URL(el.href, location.href);
      const targetHostname = targetUrl.hostname.toLowerCase();
      const isAllowed = crossDomains.some(item => hostnameMatches(targetHostname, item));

      if (!isAllowed || !/^https?:$/.test(targetUrl.protocol)) return undefined;

      return targetUrl;
    } catch {
      return undefined;
    }
  };

  const hasFreshLinker = () =>
    linkerToken && linkerExpiresAt && linkerExpiresAt > Date.now() + 15000;

  const decorateCrossDomainLink = el => {
    const targetUrl = getCrossDomainUrl(el);
    if (!targetUrl || !hasFreshLinker()) return false;

    targetUrl.searchParams.set(linkerParam, linkerToken);
    el.href = targetUrl.toString();
    return true;
  };

  const decorateDodoPaymentLink = el => {
    if (el?.tagName !== 'A' || !el.href) return;

    try {
      const targetUrl = new URL(el.href, location.href);
      const dodoHostname = targetUrl.hostname.toLowerCase();
      const isDodoPaymentLink =
        (dodoHostname === 'checkout.dodopayments.com' ||
          dodoHostname === 'test.checkout.dodopayments.com') &&
        targetUrl.pathname.startsWith('/buy/');

      if (!isDodoPaymentLink || !/^https?:$/.test(targetUrl.protocol)) return;

      targetUrl.searchParams.set(dodoSessionIdParam, getSessionId());
      el.href = targetUrl.toString();
    } catch {
      /* Invalid or unsupported link. */
    }
  };

  const decorateStripePaymentLink = el => {
    if (el?.tagName !== 'A' || !el.href) return;

    try {
      const targetUrl = new URL(el.href, location.href);
      const isStripePaymentLink =
        targetUrl.hostname.toLowerCase() === 'buy.stripe.com' &&
        targetUrl.pathname !== '/' &&
        /^https?:$/.test(targetUrl.protocol);

      if (isStripePaymentLink && !targetUrl.searchParams.has(stripeClientReferenceParam)) {
        targetUrl.searchParams.set(stripeClientReferenceParam, getSessionId());
        el.href = targetUrl.toString();
      }
    } catch {
      /* Invalid or unsupported link. */
    }
  };

  const decorateLemonSqueezyCheckoutLink = el => {
    if (el?.tagName !== 'A' || !el.href) return;

    try {
      const targetUrl = new URL(el.href, location.href);
      const isLemonSqueezyCheckoutLink =
        targetUrl.hostname.toLowerCase().endsWith('.lemonsqueezy.com') &&
        targetUrl.pathname.startsWith('/checkout/buy/') &&
        /^https?:$/.test(targetUrl.protocol);

      if (!isLemonSqueezyCheckoutLink) return;

      targetUrl.searchParams.set(lemonSqueezySessionIdParam, getSessionId());
      el.href = targetUrl.toString();
    } catch {
      /* Invalid or unsupported link. */
    }
  };

  const decorateCheckoutLink = el => {
    decorateCrossDomainLink(el);
    decorateDodoPaymentLink(el);
    decorateLemonSqueezyCheckoutLink(el);
    decorateStripePaymentLink(el);
  };

  const normalize = raw => {
    if (!raw) return raw;
    try {
      const u = new URL(raw, location.href);
      if (excludeSearch) u.search = '';
      if (excludeHash) u.hash = '';
      return u.toString();
    } catch {
      return raw;
    }
  };

  const getPayload = () => ({
    website,
    screen,
    language,
    title: document.title,
    hostname,
    url: currentUrl,
    referrer: currentRef,
    tag,
    id: identity ? identity : undefined,
    sessionId: getSessionId(),
    linker: incomingLinker,
  });

  const hasDoNotTrack = () => {
    const dnt = doNotTrack || ndnt || msdnt;
    return dnt === 1 || dnt === '1' || dnt === 'yes';
  };

  /* Event handlers */

  const handlePush = (_state, _title, url) => {
    if (!url) return;

    if (typeof flushPerformance === 'function') {
      flushPerformance();
    }

    currentRef = currentUrl;
    currentUrl = normalize(new URL(url, location.href).toString());

    if (currentUrl !== currentRef) {
      setTimeout(() => {
        track();
        resetVisibilityTracking();
        initVisibilityTracking();
      }, delayDuration);
    }
  };

  const handlePathChanges = () => {
    const hook = (_this, method, callback) => {
      const orig = _this[method];
      return (...args) => {
        callback.apply(null, args);
        return orig.apply(_this, args);
      };
    };

    history.pushState = hook(history, 'pushState', handlePush);
    history.replaceState = hook(history, 'replaceState', handlePush);
  };

  const handleClicks = () => {
    const downloadExtensionPattern =
      /\.(7z|avi|csv|dmg|docx?|exe|gz|mp3|mp4|pdf|pptx?|rar|rtf|tar|tgz|txt|wav|xlsx?|zip)$/i;

    const getDownloadInfo = href => {
      try {
        const target = new URL(href, location.href);
        if (!/^https?:$/.test(target.protocol)) return undefined;

        const match = target.pathname.match(downloadExtensionPattern);
        if (!match) return undefined;

        return { url: target.toString(), extension: match[1].toLowerCase() };
      } catch {
        return undefined;
      }
    };

    const getOutboundInfo = href => {
      try {
        const target = new URL(href, location.href);
        if (!/^https?:$/.test(target.protocol) || target.hostname === hostname) {
          return undefined;
        }

        return { url: target.toString(), domain: target.hostname };
      } catch {
        return undefined;
      }
    };

    const getEventName = el => el.getAttribute(eventNameAttribute);

    const trackElement = async el => {
      const eventName = getEventName(el);
      if (eventName) {
        const eventData = {};

        el.getAttributeNames().forEach(name => {
          const match = name.match(eventDataRegex);
          if (match) eventData[match[1]] = el.getAttribute(name);
        });

        return track(eventName, eventData);
      }
    };
    const onClick = async e => {
      const el = e.target;
      const parentElement = el.closest('a,button');
      if (!parentElement) return trackElement(el);

      const { href, target } = parentElement;
      const crossDomainUrl = getCrossDomainUrl(parentElement);
      const needsFreshLinker = crossDomainUrl && !hasFreshLinker();
      const hasEvent = Boolean(getEventName(parentElement));
      const external =
        target === '_blank' || e.ctrlKey || e.shiftKey || e.metaKey || (e.button && e.button === 1);

      if (needsFreshLinker) {
        e.preventDefault();
        await refreshLinker();
      }

      decorateCheckoutLink(parentElement);

      if (parentElement.tagName === 'BUTTON') {
        return hasEvent ? trackElement(parentElement) : undefined;
      }

      // Opt-in automatic events. Manual data-talivia-event takes precedence so
      // one click is never counted twice. cross-domain links stay part of the
      // same measured journey and are not counted as outbound.
      if (parentElement.tagName === 'A' && href && !hasEvent) {
        const download = trackDownloads ? getDownloadInfo(href) : undefined;

        if (download) {
          track('file-download', download);
        } else if (trackOutbound && !crossDomainUrl) {
          const outbound = getOutboundInfo(href);
          if (outbound) track('outbound-link', outbound);
        }
      }

      if (parentElement.tagName === 'A' && href) {
        if (hasEvent && !external) e.preventDefault();
        if (hasEvent) await trackElement(parentElement);

        if (needsFreshLinker || (hasEvent && !external)) {
          const destination = parentElement.href;
          if (external) {
            window.open(destination, target || '_blank');
          } else {
            (target === '_top' ? top.location : location).href = destination;
          }
        }
      }
    };
    document.addEventListener(
      'pointerdown',
      e => {
        const link = e.target?.closest?.('a');
        if (getCrossDomainUrl(link) && !hasFreshLinker()) refreshLinker();
        decorateCheckoutLink(link);
      },
      true,
    );
    document.addEventListener('click', onClick, true);
  };

  const getVisibleThreshold = el => {
    const threshold = Number.parseFloat(el.getAttribute(visibleThresholdAttribute));

    return Number.isFinite(threshold) && threshold >= 0.1 && threshold <= 1
      ? threshold
      : defaultVisibleThreshold;
  };

  const getVisibleDelay = el => {
    const delay = Number.parseInt(el.getAttribute(visibleDelayAttribute), 10);

    return Number.isFinite(delay) && delay >= 0 ? delay : 0;
  };

  const handleVisibleEntries = (entries, observer) => {
    entries.forEach(entry => {
      const state = visibleElements.get(entry.target);
      if (!state) return;

      if (visibleEventNames.has(state.name)) {
        observer.unobserve(entry.target);
        visibleElements.delete(entry.target);
        return;
      }

      state.isVisible = entry.isIntersecting && entry.intersectionRatio >= state.threshold;
      state.visibilityPercentage = Math.round(entry.intersectionRatio * 100);

      if (!state.isVisible) {
        if (state.timeout !== undefined) {
          clearTimeout(state.timeout);
          state.timeout = undefined;
        }
        return;
      }

      if (state.timeout !== undefined) return;

      const sendVisibleEvent = () => {
        state.timeout = undefined;

        if (!state.isVisible || visibleEventNames.has(state.name)) return;

        visibleEventNames.add(state.name);
        observer.unobserve(entry.target);
        visibleElements.delete(entry.target);
        track(state.name, {
          visibility_percentage: state.visibilityPercentage,
          threshold: state.threshold,
          delay: state.delay,
        });
      };

      if (state.delay) {
        state.timeout = setTimeout(sendVisibleEvent, state.delay);
      } else {
        sendVisibleEvent();
      }
    });
  };

  const getVisibilityObserver = threshold => {
    let observer = visibilityObservers.get(threshold);

    if (!observer) {
      observer = new IntersectionObserver(entries => handleVisibleEntries(entries, observer), {
        threshold,
      });
      visibilityObservers.set(threshold, observer);
    }

    return observer;
  };

  const observeVisibleElement = el => {
    const name = el.getAttribute(visibleEventNameAttribute);
    if (!name || visibleElements.has(el)) return;

    const threshold = getVisibleThreshold(el);
    const delay = getVisibleDelay(el);
    const observer = getVisibilityObserver(threshold);

    visibleElements.set(el, {
      name,
      threshold,
      delay,
      timeout: undefined,
      isVisible: false,
      visibilityPercentage: 0,
    });
    observer.observe(el);
  };

  const observeVisibleNode = node => {
    if (node.nodeType === 1 && node.matches(`[${visibleEventNameAttribute}]`)) {
      observeVisibleElement(node);
    }

    node.querySelectorAll?.(`[${visibleEventNameAttribute}]`).forEach(observeVisibleElement);
  };

  const initVisibilityTracking = () => {
    if (typeof IntersectionObserver !== 'function') return;

    document.querySelectorAll(`[${visibleEventNameAttribute}]`).forEach(observeVisibleElement);

    if (visibilityMutationObserver || typeof MutationObserver !== 'function') return;

    visibilityMutationObserver = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(observeVisibleNode);
      });
    });
    visibilityMutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  const resetVisibilityTracking = () => {
    visibilityObservers.forEach(observer => {
      observer.disconnect();
    });
    visibilityObservers.clear();

    visibleElements.forEach(state => {
      if (state.timeout !== undefined) clearTimeout(state.timeout);
    });
    visibleElements.clear();
    visibleEventNames.clear();
  };

  /* Tracking functions */

  const trackingDisabled = () =>
    disabled ||
    !website ||
    !consentGranted ||
    localStorage?.getItem('talivia.disabled') ||
    (allowedDomainConfig && !domains.some(item => hostnameMatches(hostname, item))) ||
    (dnt && hasDoNotTrack());

  const send = async (payload, type = 'event') => {
    if (trackingDisabled()) return;

    const callback = window[beforeSend];

    if (typeof callback === 'function') {
      payload = await Promise.resolve(callback(type, payload));
    }

    if (!payload) return;

    try {
      const res = await fetch(endpoint, {
        keepalive: true,
        method: 'POST',
        body: JSON.stringify({ type, payload }),
        headers: {
          'Content-Type': 'application/json',
          ...(typeof cache !== 'undefined' && {
            'x-talivia-cache': cache,
          }),
        },
        credentials,
      });

      const data = await res.json();
      if (data) {
        disabled = !!data.disabled;
        cache = data.cache;
        publishCollectorContext();
        linkerToken = data.linker;
        linkerExpiresAt = data.linkerExpiresAt;
        incomingLinker = undefined;
      }
      return data;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      /* no-op */
    }
  };

  const refreshLinker = () => {
    if (!refreshLinkerPromise) {
      refreshLinkerPromise = send(getPayload(), 'linker').finally(() => {
        refreshLinkerPromise = undefined;
      });
    }

    return refreshLinkerPromise;
  };

  const init = () => {
    if (!initialized) {
      initialized = true;
      track();
      handlePathChanges();
      handleClicks();
      initVisibilityTracking();
      if (perf) initPerformance();
    }
  };

  const track = (name, data) => {
    if (typeof name === 'string') return send({ ...getPayload(), name, data });
    if (typeof name === 'object') return send({ ...name });
    if (typeof name === 'function') return send(name(getPayload()));
    return send(getPayload());
  };

  const identify = (id, data) => {
    if (typeof id === 'string') {
      identity = id;
    }

    cache = '';
    publishCollectorContext();
    return send(
      {
        ...getPayload(),
        data: typeof id === 'object' ? id : data,
      },
      'identify',
    );
  };

  // Optional consent gate. With data-consent="required" nothing leaves the
  // browser until the host grants consent. Granting sends the current pageview;
  // revoking stops all later sends but cannot recall events already sent.
  const setConsent = granted => {
    const next = !!granted;
    if (next === consentGranted) return;

    consentGranted = next;

    if (next) {
      if (!initialized && autoTrack) {
        init();
      } else {
        track();
      }
    }
  };

  /* Performance */

  const initPerformance = () => {
    const metrics = {};
    let sent = false;
    let timeoutId;
    let isInitialLoad = true;
    let activationStart = 0;
    let pageStartTime = 0;

    const observe = (type, callback) => {
      try {
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(callback);
        });
        observer.observe({ type, buffered: true });
      } catch {
        /* not supported */
      }
    };

    // TTFB
    observe('navigation', entry => {
      activationStart = entry.activationStart || 0;
      metrics.ttfb = Math.max(entry.responseStart - activationStart, 0);
    });

    // FCP
    observe('paint', entry => {
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = Math.max(entry.startTime - activationStart, 0);
      }
    });

    // LCP
    observe('largest-contentful-paint', entry => {
      metrics.lcp = Math.max(entry.startTime - activationStart, 0);
    });

    // CLS - session windows algorithm (gap < 1s, max 5s duration; report worst window)
    let clsSessionValue = 0;
    let clsSessionEntries = [];
    observe('layout-shift', entry => {
      if (!entry.hadRecentInput) {
        const lastEntry = clsSessionEntries[clsSessionEntries.length - 1];
        const firstEntry = clsSessionEntries[0];
        if (
          lastEntry &&
          entry.startTime - lastEntry.startTime - lastEntry.duration < 1000 &&
          entry.startTime - firstEntry.startTime < 5000
        ) {
          clsSessionValue += entry.value;
          clsSessionEntries.push(entry);
        } else {
          clsSessionValue = entry.value;
          clsSessionEntries = [entry];
        }
        if (clsSessionValue > (metrics.cls || 0)) {
          metrics.cls = clsSessionValue;
        }
      }
    });

    // INP - group by interactionId, 98th percentile, 40ms threshold
    let interactions = {};
    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.interactionId) {
            const existing = interactions[entry.interactionId];
            if (!existing || entry.duration > existing) {
              interactions[entry.interactionId] = entry.duration;
            }
            const values = Object.values(interactions).sort((a, b) => b - a);
            if (values.length) {
              const p98Index = Math.floor(Math.max(values.length, 10) * 0.02);
              metrics.inp = values[Math.min(p98Index, values.length - 1)];
            }
          }
        });
      });
      observer.observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch {
      /* not supported */
    }

    const getEntriesByType = type => {
      try {
        return window.performance?.getEntriesByType?.(type) || [];
      } catch {
        return [];
      }
    };

    const applyFallbackMetrics = () => {
      if (!isInitialLoad) return;

      if (metrics.ttfb === undefined) {
        const navigation = getEntriesByType('navigation')?.[0];
        if (navigation) {
          metrics.ttfb = Math.max(navigation.responseStart - (navigation.activationStart || 0), 0);
        }
      }

      if (metrics.fcp === undefined) {
        const fcpEntry = getEntriesByType('paint')?.find(
          entry => entry.name === 'first-contentful-paint',
        );
        if (fcpEntry) {
          metrics.fcp = Math.max(fcpEntry.startTime - activationStart, 0);
        }
      }

      if (metrics.lcp === undefined) {
        const lcpEntries = getEntriesByType('largest-contentful-paint');
        const lcpEntry = lcpEntries?.[lcpEntries.length - 1];
        if (lcpEntry) {
          metrics.lcp = Math.max(lcpEntry.startTime - activationStart, 0);
        }
      }
    };

    const sendPerformance = () => {
      if (sent) return;

      applyFallbackMetrics();
      metrics.duration = Math.round(performance.now() - pageStartTime);

      sent = true;
      if (timeoutId) clearTimeout(timeoutId);
      send({ ...getPayload(), ...metrics }, 'performance');
    };

    flushPerformance = () => {
      sendPerformance();
      isInitialLoad = false;
      Object.keys(metrics).forEach(k => {
        delete metrics[k];
      });
      activationStart = 0;
      pageStartTime = performance.now();
      clsSessionValue = 0;
      clsSessionEntries = [];
      interactions = {};
      sent = false;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(sendPerformance, 10000);
    };
    timeoutId = setTimeout(sendPerformance, 10000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendPerformance();
    });
    window.addEventListener('pagehide', sendPerformance);
  };

  /* Start */

  const trackerApi = {
    track,
    identify,
    getSessionId,
    setConsent,
  };

  if (!window.talivia) {
    window.talivia = trackerApi;
  }

  let incomingLinker = getIncomingLinker();
  let currentUrl = normalize(location.href);
  let currentRef = normalize(referrer.startsWith(origin) ? '' : referrer);

  let initialized = false;
  let disabled = false;
  let consentGranted = !consentRequired;
  let cache;
  let sessionId;
  let sessionLastSeen;
  let linkerToken;
  let linkerExpiresAt;
  let refreshLinkerPromise;
  let identity;
  let flushPerformance;
  let visibilityMutationObserver;
  const visibilityObservers = new Map();
  const visibleElements = new Map();
  const visibleEventNames = new Set();

  document.addEventListener(collectorContextRequestEvent, publishCollectorContext);

  document.addEventListener('talivia:consent', event => {
    const detail = event?.detail;
    const granted = typeof detail === 'boolean' ? detail : detail?.consent;

    if (typeof granted === 'boolean') {
      setConsent(granted);
    }
  });

  if (autoTrack && !trackingDisabled()) {
    if (document.readyState === 'complete') {
      init();
    } else {
      document.addEventListener('readystatechange', init, true);
    }
  }
})(window);
