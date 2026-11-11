import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  const tx = new Proxy({} as Record<string, any>, {
    get(target, model: string) {
      if (!target[model]) {
        target[model] = new Proxy(
          {},
          {
            get(_, method: string) {
              return vi.fn(async () => {
                calls.push(`${model}.${method}`);
                return method === 'findMany' ? [] : undefined;
              });
            },
          },
        );
      }

      return target[model];
    },
  });

  return {
    calls,
    tx,
    transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: false,
  },
}));

const { deleteWebsite } = await import('./website');

beforeEach(() => {
  mocks.calls.length = 0;
  vi.clearAllMocks();
});

test('breaks visitor-session links before deleting sessions and visitors', async () => {
  await deleteWebsite('website-1');

  const updateVisitor = mocks.calls.indexOf('visitor.updateMany');
  const deleteSession = mocks.calls.indexOf('session.deleteMany');
  const deleteVisitor = mocks.calls.indexOf('visitor.deleteMany');

  expect(updateVisitor).toBeGreaterThan(-1);
  expect(deleteSession).toBeGreaterThan(updateVisitor);
  expect(deleteVisitor).toBeGreaterThan(deleteSession);
});
