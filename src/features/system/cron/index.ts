import { Cron, type CronOptions } from 'croner';
import { logger } from '@/lib/logger';
import { runAnalyticsRetentionJob } from './jobs/analytics-retention';
import { runAuthMaintenanceJob } from './jobs/auth-maintenance';
import { runProviderWebhookCleanupJob } from './jobs/provider-webhook-cleanup';
import { runUsageNoticeJob } from './jobs/usage-notices';

const CRON_STATE_KEY = '__taliviaCronScheduler';
const CRON_TIMEZONE = 'UTC';

interface TaliviaCronJob {
  name: string;
  schedule: string;
  run: () => Promise<unknown>;
}

interface TaliviaCronState {
  started: boolean;
  jobs: Cron[];
}

const cronJobs: TaliviaCronJob[] = [
  {
    name: 'provider-webhook-cleanup',
    schedule: '* * * * *',
    run: () => runProviderWebhookCleanupJob(),
  },
  {
    name: 'auth-maintenance',
    schedule: '15 3 * * *',
    run: () => runAuthMaintenanceJob(),
  },
  {
    name: 'analytics-retention',
    schedule: '30 3 * * *',
    run: () => runAnalyticsRetentionJob(),
  },
  {
    name: 'usage-notices',
    schedule: '0 4 * * *',
    run: () => runUsageNoticeJob(),
  },
];

function getCronState() {
  const state = globalThis as typeof globalThis & {
    [CRON_STATE_KEY]?: TaliviaCronState;
  };

  const cronState = state[CRON_STATE_KEY] ?? {
    started: false,
    jobs: [],
  };

  state[CRON_STATE_KEY] = cronState;

  return cronState;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function createCronOptions(job: TaliviaCronJob): CronOptions {
  return {
    catch: error => {
      logger.error('cron.job.failed', { job: job.name, error: getErrorMessage(error) });
    },
    name: `talivia:${job.name}`,
    protect: () => {
      logger.warn('cron.job.skipped', {
        job: job.name,
        reason: 'previous run still active',
      });
    },
    timezone: CRON_TIMEZONE,
    unref: true,
  };
}

export function startCronScheduler() {
  if (process.env.NODE_ENV !== 'production') {
    return [];
  }

  const state = getCronState();

  if (state.started) {
    return state.jobs;
  }

  state.started = true;
  state.jobs = cronJobs.map(
    job =>
      new Cron(job.schedule, createCronOptions(job), async () => {
        const startedAt = Date.now();

        console.info(`[cron] ${job.name} started`);
        const result = await job.run();
        console.info(`[cron] ${job.name} completed`, {
          durationMs: Date.now() - startedAt,
          result,
        });
      }),
  );

  console.info(`[cron] scheduler started`, {
    jobs: cronJobs.map(job => ({
      name: job.name,
      schedule: job.schedule,
      timezone: CRON_TIMEZONE,
    })),
  });

  return state.jobs;
}

export function getStartedCronJobs() {
  return getCronState().jobs;
}
