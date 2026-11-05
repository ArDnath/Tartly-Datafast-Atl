import { expect, test } from 'vitest';
import { buildActivationFunnel } from './activation';

test('activation funnel reports real stage counts and conversion rates', () => {
  const funnel = buildActivationFunnel({
    users: 100,
    workspaces: 80,
    websites: 60,
    websites_with_events: 40,
    websites_with_payments: 20,
    websites_with_attribution: 10,
    events: 1234,
    payments: 56,
  });

  expect(funnel.stages.map(stage => stage.key)).toEqual([
    'signup',
    'workspace',
    'website',
    'first_event',
    'payment_connected',
    'attributed_payment',
  ]);
  expect(funnel.stages.map(stage => stage.count)).toEqual([100, 80, 60, 40, 20, 10]);
  expect(funnel.stages[1].fromStartPercent).toBe(80);
  expect(funnel.stages[1].stepPercent).toBe(80);
  expect(funnel.stages[3].stepPercent).toBe(66.7);
  expect(funnel.totals).toEqual({ events: 1234, payments: 56 });
});

test('activation funnel handles an empty installation without dividing by zero', () => {
  const funnel = buildActivationFunnel({
    users: 0,
    workspaces: 0,
    websites: 0,
    websites_with_events: 0,
    websites_with_payments: 0,
    websites_with_attribution: 0,
    events: 0,
    payments: 0,
  });

  for (const stage of funnel.stages) {
    expect(stage.count).toBe(0);
    expect(stage.fromStartPercent).toBe(0);
    expect(stage.stepPercent).toBe(0);
  }
});

test('bigint counts from PostgreSQL are converted to safe numbers', () => {
  const funnel = buildActivationFunnel({
    users: BigInt(7),
    workspaces: BigInt(6),
    websites: BigInt(5),
    websites_with_events: BigInt(4),
    websites_with_payments: BigInt(3),
    websites_with_attribution: BigInt(2),
    events: BigInt(99),
    payments: BigInt(8),
  });

  expect(funnel.stages[0].count).toBe(7);
  expect(funnel.totals.events).toBe(99);
});
