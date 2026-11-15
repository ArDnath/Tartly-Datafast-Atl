import { expect, test } from 'vitest';
import { getClientEventId } from './event-id';

test('the same tenant and client key produce the same stored event id', () => {
  expect(getClientEventId('website-1', 'order-4821')).toBe(
    getClientEventId('website-1', 'order-4821'),
  );
});

test('two tenants may use the same client key without colliding', () => {
  expect(getClientEventId('website-1', 'order-4821')).not.toBe(
    getClientEventId('website-2', 'order-4821'),
  );
});
