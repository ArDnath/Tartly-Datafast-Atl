import { randomUUID } from 'node:crypto';
import { getActiveVisitors } from '@/features/analytics/server/queries/sql/getActiveVisitors';
import { getChannelMetrics } from '@/features/analytics/server/queries/sql/getChannelMetrics';
import { getRealtimeData } from '@/features/analytics/server/queries/sql/getRealtimeData';
import { getWebsiteDateRange } from '@/features/analytics/server/queries/sql/getWebsiteDateRange';
import { getWebsiteStats } from '@/features/analytics/server/queries/sql/getWebsiteStats';
import { getPageviewMetrics } from '@/features/analytics/server/queries/sql/pageviews/getPageviewMetrics';
import { getPageviewStats } from '@/features/analytics/server/queries/sql/pageviews/getPageviewStats';
import { getSessionMetrics } from '@/features/analytics/server/queries/sql/sessions/getSessionMetrics';
import { getSessionStats } from '@/features/analytics/server/queries/sql/sessions/getSessionStats';
import { runAnalyticsRetentionJob } from '@/features/system/cron/jobs/analytics-retention';
import prisma from '@/lib/prisma';

/**
 * Phase 7 analytics smoke test.
 *
 * This runs against the real PostgreSQL event store, seeds an isolated
 * website, checks the inherited metric queries, exercises retention, and
 * removes every seeded row. It is gated so CI (which runs tests before
 * migrations) skips it. Run it after `pnpm update-db`:
 *
 *   RUN_PHASE7_DB_SMOKE=1 pnpm exec vitest run --config vitest.phase7.config.ts \
 *     src/features/analytics/server/queries/phase7-analytics-smoke.test.ts
 */

type Assertion = { name: string; expected: unknown; actual: unknown };

const results: Assertion[] = [];

function assert(name: string, expected: unknown, actual: unknown) {
  const pass = JSON.stringify(expected) === JSON.stringify(actual);
  results.push({ name, expected, actual });

  if (!pass) {
    throw new Error(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function metric(rows: Array<{ x: string; y: number }>, key: string) {
  return Number(rows.find(row => row.x === key)?.y ?? 0);
}

const websiteId = randomUUID();
const visitorA = randomUUID();
const visitorB = randomUUID();
const visitorC = randomUUID();
const visitorLive = randomUUID();
const visitorOld = randomUUID();
const sessionA1 = randomUUID();
const sessionA2 = randomUUID();
const sessionB1 = randomUUID();
const sessionC1 = randomUUID();
const sessionLive = randomUUID();
const sessionOld = randomUUID();

const now = new Date();
const baseDay = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2, 0, 0, 0, 0),
);
const day = (hour: number, minute = 0) =>
  new Date(baseDay.getTime() + (hour * 60 + minute) * 60 * 1000);

const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);

async function seed() {
  await prisma.client.website.create({
    data: {
      id: websiteId,
      name: 'Phase 7 smoke',
      domain: 'phase7-smoke.example',
      replayEnabled: true,
    },
  });

  await prisma.client.visitor.createMany({
    data: [
      {
        id: visitorA,
        websiteId,
        token: 'phase7-a',
        firstSeenAt: day(10),
        lastSeenAt: day(11, 1),
        firstSource: 'google',
        firstMedium: 'organic',
        firstCampaign: 'brand',
        firstReferrerDomain: 'google.com',
        firstLandingPath: '/',
        firstCountry: 'US',
        firstDevice: 'desktop',
      },
      {
        id: visitorB,
        websiteId,
        token: 'phase7-b',
        firstSeenAt: day(12),
        lastSeenAt: day(12),
        firstCountry: 'US',
        firstDevice: 'desktop',
      },
      {
        id: visitorC,
        websiteId,
        token: 'phase7-c',
        firstSeenAt: day(13),
        lastSeenAt: day(13),
        firstReferrerDomain: 'blog.example.org',
        firstLandingPath: '/pricing',
        firstCountry: 'DE',
        firstDevice: 'mobile',
      },
      {
        id: visitorLive,
        websiteId,
        token: 'phase7-live',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        firstCountry: 'US',
        firstDevice: 'desktop',
      },
      {
        id: visitorOld,
        websiteId,
        token: 'phase7-old',
        firstSeenAt: oldDate,
        lastSeenAt: oldDate,
      },
    ],
  });

  await prisma.client.session.createMany({
    data: [
      {
        id: sessionA1,
        websiteId,
        visitorId: visitorA,
        browser: 'Chrome',
        os: 'Mac OS',
        device: 'desktop',
        screen: '1440x900',
        language: 'en',
        country: 'US',
        createdAt: day(10),
      },
      {
        id: sessionA2,
        websiteId,
        visitorId: visitorA,
        browser: 'Chrome',
        os: 'Mac OS',
        device: 'desktop',
        screen: '1440x900',
        language: 'en',
        country: 'US',
        createdAt: day(11),
      },
      {
        id: sessionB1,
        websiteId,
        visitorId: visitorB,
        browser: 'Firefox',
        os: 'Windows',
        device: 'desktop',
        screen: '1920x1080',
        language: 'en',
        country: 'US',
        createdAt: day(12),
      },
      {
        id: sessionC1,
        websiteId,
        visitorId: visitorC,
        browser: 'Safari',
        os: 'iOS',
        device: 'mobile',
        screen: '390x844',
        language: 'de',
        country: 'DE',
        createdAt: day(13),
      },
      {
        id: sessionLive,
        websiteId,
        visitorId: visitorLive,
        browser: 'Chrome',
        os: 'Linux',
        device: 'desktop',
        screen: '1440x900',
        language: 'en',
        country: 'US',
        createdAt: new Date(),
      },
      {
        id: sessionOld,
        websiteId,
        visitorId: visitorOld,
        browser: 'Chrome',
        os: 'Linux',
        device: 'desktop',
        screen: '1440x900',
        language: 'en',
        country: 'US',
        createdAt: oldDate,
      },
    ],
  });

  await prisma.client.visitor.updateMany({
    where: { id: visitorA },
    data: { firstSessionId: sessionA1, lastSessionId: sessionA2 },
  });
  await prisma.client.visitor.updateMany({
    where: { id: visitorB },
    data: { firstSessionId: sessionB1, lastSessionId: sessionB1 },
  });
  await prisma.client.visitor.updateMany({
    where: { id: visitorC },
    data: { firstSessionId: sessionC1, lastSessionId: sessionC1 },
  });
  await prisma.client.visitor.updateMany({
    where: { id: visitorLive },
    data: { firstSessionId: sessionLive, lastSessionId: sessionLive },
  });
  await prisma.client.visitor.updateMany({
    where: { id: visitorOld },
    data: { firstSessionId: sessionOld, lastSessionId: sessionOld },
  });

  const event = (
    sessionId: string,
    visitorId: string,
    createdAt: Date,
    urlPath: string,
    extra: Record<string, unknown> = {},
  ) => ({
    id: randomUUID(),
    websiteId,
    sessionId,
    visitorId,
    createdAt,
    urlPath,
    urlQuery: '',
    referrerDomain: '',
    hostname: 'phase7-smoke.example',
    eventType: 1,
    ...extra,
  });

  await prisma.client.websiteEvent.createMany({
    data: [
      event(sessionA1, visitorA, day(10), '/', {
        utmSource: 'google',
        utmMedium: 'organic',
        utmCampaign: 'brand',
        referrerDomain: 'google.com',
      }),
      event(sessionA1, visitorA, day(10, 1), '/pricing'),
      event(sessionA1, visitorA, day(10, 2), '/signup'),
      {
        ...event(sessionA1, visitorA, day(10, 3), '/signup', {
          eventType: 2,
          eventName: 'sign_up',
        }),
      },
      {
        ...event(sessionA1, visitorA, day(10, 4), '/', {
          eventType: 5,
        }),
      },
      // Imported/legacy rows can store NULL instead of an empty string. The
      // direct-channel query must treat both as direct.
      event(sessionA2, visitorA, day(11), '/', { referrerDomain: null, urlQuery: null }),
      event(sessionA2, visitorA, day(11, 1), '/pricing'),
      event(sessionB1, visitorB, day(12), '/'),
      event(sessionC1, visitorC, day(13), '/pricing', {
        referrerDomain: 'blog.example.org',
      }),
      event(sessionLive, visitorLive, new Date(), '/live'),
      event(sessionOld, visitorOld, oldDate, '/old'),
    ],
  });

  await prisma.client.sessionReplay.create({
    data: {
      id: randomUUID(),
      websiteId,
      sessionId: sessionA1,
      chunkIndex: 1,
      events: Buffer.from([91, 93]) as any,
      eventCount: 0,
      startedAt: day(10),
      endedAt: day(11),
    },
  });
}

async function cleanup() {
  await prisma.client.visitor.updateMany({
    where: { websiteId },
    data: { firstSessionId: null, lastSessionId: null },
  });
  await prisma.client.sessionReplay.deleteMany({ where: { websiteId } });
  await prisma.client.sessionReplaySaved.deleteMany({ where: { websiteId } });
  await prisma.client.eventData.deleteMany({ where: { websiteId } });
  await prisma.client.sessionData.deleteMany({ where: { websiteId } });
  await prisma.client.websiteEvent.deleteMany({ where: { websiteId } });
  await prisma.client.revenue.deleteMany({ where: { websiteId } });
  await prisma.client.session.deleteMany({ where: { websiteId } });
  await prisma.client.visitor.deleteMany({ where: { websiteId } });
  await prisma.client.website.deleteMany({ where: { id: websiteId } });
}

export async function runPhase7AnalyticsSmoke() {
  results.length = 0;
  let remainingEvents = 0;

  const filters = {
    startDate: day(0),
    endDate: new Date(day(0).getTime() + 24 * 60 * 60 * 1000),
    timezone: 'utc',
    unit: 'day',
  };

  try {
    await seed();

    const stats = await getWebsiteStats(websiteId, filters);
    assert('website pageviews', 7, Number(stats.pageviews));
    assert('website visitors', 3, Number(stats.visitors));
    assert('website visits', 4, Number(stats.visits));
    assert('website bounces', 2, Number(stats.bounces));
    assert('website total time', 180, Number(stats.totaltime));

    const pageviews = await getPageviewStats(websiteId, filters);
    assert(
      'pageview series total',
      7,
      pageviews.reduce((sum, row) => sum + Number(row.y), 0),
    );

    const sessions = await getSessionStats(websiteId, filters);
    assert(
      'visitor series total',
      3,
      sessions.reduce((sum, row) => sum + Number(row.y), 0),
    );

    const paths = await getPageviewMetrics(websiteId, { type: 'path' }, filters);
    assert('path / visitors', 2, metric(paths, '/'));
    assert('path /pricing visitors', 2, metric(paths, '/pricing'));
    assert('path /signup visitors', 1, metric(paths, '/signup'));

    const entries = await getPageviewMetrics(websiteId, { type: 'entry' }, filters);
    assert('landing page / visitors', 2, metric(entries, '/'));
    assert('landing page /pricing visitors', 1, metric(entries, '/pricing'));

    const exits = await getPageviewMetrics(websiteId, { type: 'exit' }, filters);
    assert('exit page /pricing visitors', 2, metric(exits, '/pricing'));
    assert('exit page /signup visitors', 1, metric(exits, '/signup'));

    const referrers = await getPageviewMetrics(websiteId, { type: 'referrer' }, filters);
    assert('referrer google.com visitors', 1, metric(referrers, 'google.com'));
    assert('referrer blog.example.org visitors', 1, metric(referrers, 'blog.example.org'));

    const utmSources = await getPageviewMetrics(websiteId, { type: 'utmSource' }, filters);
    assert('utm source google visitors', 1, metric(utmSources, 'google'));
    const utmCampaigns = await getPageviewMetrics(websiteId, { type: 'utmCampaign' }, filters);
    assert('utm campaign brand visitors', 1, metric(utmCampaigns, 'brand'));

    const browsers = await getSessionMetrics(websiteId, { type: 'browser' }, filters);
    assert('browser Chrome visitors', 1, metric(browsers, 'Chrome'));
    assert('browser Firefox visitors', 1, metric(browsers, 'Firefox'));
    assert('browser Safari visitors', 1, metric(browsers, 'Safari'));

    const countries = await getSessionMetrics(websiteId, { type: 'country' }, filters);
    assert('country US visitors', 2, metric(countries, 'US'));
    assert('country DE visitors', 1, metric(countries, 'DE'));

    const devices = await getSessionMetrics(websiteId, { type: 'device' }, filters);
    assert('device desktop visitors', 2, metric(devices, 'desktop'));
    assert('device mobile visitors', 1, metric(devices, 'mobile'));

    const oss = await getSessionMetrics(websiteId, { type: 'os' }, filters);
    assert('os Mac OS visitors', 1, metric(oss, 'Mac OS'));
    assert('os Windows visitors', 1, metric(oss, 'Windows'));
    assert('os iOS visitors', 1, metric(oss, 'iOS'));

    const screens = await getSessionMetrics(websiteId, { type: 'screen' }, filters);
    assert('screen 1440x900 visitors', 1, metric(screens, '1440x900'));

    const languages = await getSessionMetrics(websiteId, { type: 'language' }, filters);
    assert('language en visitors', 2, metric(languages, 'en'));
    assert('language de visitors', 1, metric(languages, 'de'));

    const channels = await getChannelMetrics(websiteId, filters);
    assert('channel direct visitors', 2, metric(channels, 'direct'));
    assert('channel organic search visitors', 1, metric(channels, 'organicSearch'));
    assert('channel referral visitors', 1, metric(channels, 'referral'));

    const range = await getWebsiteDateRange(websiteId);
    assert('date range start', oldDate.toISOString(), new Date(range.startDate).toISOString());
    assert('date range includes latest day', true, new Date(range.endDate) >= day(13));

    const realtime = await getRealtimeData(websiteId, {
      startDate: new Date(Date.now() - 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 60 * 1000),
      timezone: 'utc',
      unit: 'minute',
    });
    assert('realtime views at least one', true, realtime.totals.views >= 1);
    assert('realtime visitors at least one', true, realtime.totals.visitors >= 1);
    assert('realtime countries', 1, realtime.totals.countries);
    assert(
      'realtime /live event present',
      true,
      realtime.events.some(event => event.urlPath === '/live'),
    );

    const active = await getActiveVisitors(websiteId);
    assert('active visitors in last 5 minutes', 1, Number(active.visitors));

    const retention = await runAnalyticsRetentionJob({
      websiteIds: [websiteId],
      now: new Date(),
      dryRun: false,
    });
    assert('retention websites', 1, retention.websites);
    assert('retention old events', 1, retention.events);
    assert('retention old sessions', 1, retention.sessions);
    assert('retention replay rows', 1, retention.replays);

    remainingEvents = await prisma.client.websiteEvent.count({ where: { websiteId } });
    assert('recent events survive retention', 10, remainingEvents);
    const oldSessions = await prisma.client.session.count({ where: { id: sessionOld } });
    assert('old session removed', 0, oldSessions);
    const replaysLeft = await prisma.client.sessionReplay.count({ where: { websiteId } });
    assert('starter replay payload removed', 0, replaysLeft);
  } finally {
    await cleanup();
  }

  for (const result of results) {
    console.log(`PASS ${result.name}: ${JSON.stringify(result.actual)}`);
  }
  console.log(`\n${results.length} analytics assertions passed on PostgreSQL.`);

  return {
    assertions: results.length,
    remainingEvents,
  };
}
