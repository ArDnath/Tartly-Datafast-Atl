#!/usr/bin/env node
/**
 * Tartly MCP server (stdio, no dependencies).
 *
 * Configure it in an MCP client:
 *
 *   {
 *     "mcpServers": {
 *       "tartly": {
 *         "command": "node",
 *         "args": ["scripts/tartly-mcp.mjs"],
 *         "env": {
 *           "TARTLY_URL": "http://localhost:3000",
 *           "TARTLY_API_KEY": "…"
 *         }
 *       }
 *     }
 *   }
 *
 * The API key is read from the environment and never returned in a tool
 * result. Every tool is read-only.
 */

import { createInterface } from 'node:readline';

const PROTOCOL_VERSION = '2024-11-05';
const DEFAULT_URL = 'http://localhost:3000';

const TOOLS = [
  {
    name: 'verify_installation',
    description:
      'Check whether the tracker for the API key’s website has stored at least one real event.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_recent_events',
    description: 'List the most recent pageviews for the API key’s website.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'diagnose_installation',
    description:
      'Run read-only installation checks: API key scope, domain, received events, recency, and fixes.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

function config() {
  const apiKey = (process.env.TARTLY_API_KEY || '').trim();
  const url = (process.env.TARTLY_URL || DEFAULT_URL).replace(/\/$/, '');

  if (!apiKey) {
    throw new Error('TARTLY_API_KEY is required.');
  }

  return { apiKey, url };
}

async function api(path) {
  const { apiKey, url } = config();
  const response = await fetch(`${url}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${payload?.error?.message || 'request failed'}`);
  }

  return payload;
}

async function callTool(name, args) {
  if (name === 'verify_installation') {
    return api('/api/developer/verify');
  }

  if (name === 'list_recent_events') {
    const limit = Number.isInteger(args?.limit) ? Math.min(Math.max(args.limit, 1), 100) : 20;
    return api(`/api/developer/events?limit=${limit}`);
  }

  if (name === 'diagnose_installation') {
    return api('/api/developer/diagnose');
  }

  throw new Error(`Unknown tool: ${name}`);
}

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function replyError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

async function handle(message) {
  const { id, method, params } = message;

  if (method === 'initialize') {
    return reply(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'tartly', version: '1.0.0' },
    });
  }

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    return undefined;
  }

  if (method === 'ping') {
    return reply(id, {});
  }

  if (method === 'tools/list') {
    return reply(id, { tools: TOOLS });
  }

  if (method === 'tools/call') {
    try {
      const result = await callTool(params?.name, params?.arguments);

      return reply(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: false,
      });
    } catch (error) {
      return reply(id, {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : 'Tool call failed.',
          },
        ],
        isError: true,
      });
    }
  }

  return replyError(id, -32601, `Method not found: ${method}`);
}

const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
let queue = Promise.resolve();

lines.on('line', line => {
  const trimmed = line.trim();

  if (!trimmed) {
    return;
  }

  queue = queue.then(async () => {
    let message;

    try {
      message = JSON.parse(trimmed);
    } catch {
      replyError(null, -32700, 'Parse error');
      return;
    }

    if (message?.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      replyError(message?.id ?? null, -32600, 'Invalid Request');
      return;
    }

    try {
      await handle(message);
    } catch (error) {
      replyError(
        message.id ?? null,
        -32603,
        error instanceof Error ? error.message : 'Internal error',
      );
    }
  });
});
