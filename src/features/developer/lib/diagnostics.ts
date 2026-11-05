/**
 * Pure installation diagnostics for the CLI and MCP server.
 *
 * The HTTP handlers collect facts; this module decides what they mean. Keeping
 * the decision pure makes every recommendation testable without a database.
 */

export interface InstallationFacts {
  websiteId: string;
  websiteDomain: string | null;
  apiKeyWebsiteId: string | null;
  eventCount: number;
  lastEventAt: Date | null;
  now?: Date;
}

export type DiagnosticStatus = 'ok' | 'warning' | 'error';

export interface DiagnosticCheck {
  id: string;
  status: DiagnosticStatus;
  message: string;
  fix?: string;
}

export interface InstallationDiagnosis {
  ok: boolean;
  checks: DiagnosticCheck[];
}

/** A tracker that has not reported in this window is treated as inactive. */
export const RECENT_EVENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function checkKeyScope(facts: InstallationFacts): DiagnosticCheck {
  if (!facts.apiKeyWebsiteId) {
    return {
      id: 'api-key-scope',
      status: 'error',
      message: 'This API key is not scoped to a website.',
      fix: 'Create a website API key in Settings → Websites → API keys.',
    };
  }

  if (facts.apiKeyWebsiteId !== facts.websiteId) {
    return {
      id: 'api-key-scope',
      status: 'error',
      message: 'The API key belongs to a different website.',
      fix: 'Use the key created for this website, or verify the other website ID.',
    };
  }

  return {
    id: 'api-key-scope',
    status: 'ok',
    message: 'The API key is scoped to this website.',
  };
}

function checkEvents(facts: InstallationFacts): DiagnosticCheck {
  if (facts.eventCount === 0) {
    return {
      id: 'events',
      status: 'error',
      message: 'No events have been received yet.',
      fix: 'Load a tracked page in a browser, then verify that /api/send returns a successful response.',
    };
  }

  return {
    id: 'events',
    status: 'ok',
    message: `${facts.eventCount.toLocaleString('en-US')} event${
      facts.eventCount === 1 ? '' : 's'
    } received.`,
  };
}

function checkRecency(facts: InstallationFacts): DiagnosticCheck {
  if (!facts.lastEventAt) {
    return {
      id: 'recency',
      status: 'warning',
      message: 'There is no timestamp for the latest event.',
    };
  }

  const now = facts.now ?? new Date();
  const age = now.getTime() - facts.lastEventAt.getTime();

  if (age > RECENT_EVENT_WINDOW_MS) {
    return {
      id: 'recency',
      status: 'warning',
      message: 'The last event is more than 7 days old.',
      fix: 'Check that the tracker is still installed and that ad blockers or CSP rules are not blocking it.',
    };
  }

  return {
    id: 'recency',
    status: 'ok',
    message: 'The tracker reported an event within the last 7 days.',
  };
}

function checkDomain(facts: InstallationFacts): DiagnosticCheck {
  if (!facts.websiteDomain) {
    return {
      id: 'domain',
      status: 'warning',
      message: 'No domain is configured for this website.',
      fix: 'Add the production domain in website settings so attribution and share links are correct.',
    };
  }

  return {
    id: 'domain',
    status: 'ok',
    message: `Domain is set to ${facts.websiteDomain}.`,
  };
}

export function diagnoseInstallation(facts: InstallationFacts): InstallationDiagnosis {
  const checks = [
    checkKeyScope(facts),
    checkDomain(facts),
    checkEvents(facts),
    checkRecency(facts),
  ];

  return {
    ok: checks.every(check => check.status !== 'error'),
    checks,
  };
}
