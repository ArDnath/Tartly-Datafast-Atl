import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { runDeploySmoke } from './deploy-smoke.mjs';

const VERSION = '0123456789abcdef0123456789abcdef01234567';

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function sendHtml(response, status = 200) {
  response.writeHead(status, { 'content-type': 'text/html' });
  response.end('<!doctype html><title>ok</title>');
}

function healthyHandler({ version = VERSION, database = 'up', publicStatus = 200 } = {}) {
  return (request, response) => {
    if (request.url === '/api/health/live') {
      sendJson(response, 200, { ok: true, service: 'tartly', version });
      return;
    }

    if (request.url === '/api/health/ready') {
      sendJson(response, database === 'up' ? 200 : 503, {
        ok: database === 'up',
        service: 'tartly',
        database,
        version,
      });
      return;
    }

    if (publicStatus === 302) {
      response.writeHead(302, { location: '/login' });
      response.end();
      return;
    }

    sendHtml(response, publicStatus);
  };
}

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    const closed = new Promise(resolve => server.close(resolve));
    server.closeAllConnections();
    await closed;
  }
}

test('passes when health reports the deployed SHA and public routes are 200', async () => {
  await withServer(healthyHandler(), async url => {
    const result = await runDeploySmoke({
      baseUrl: url,
      expectedVersion: VERSION,
      log: () => {},
    });

    assert.equal(result.expectedVersion, VERSION);
    assert.equal(result.checked, 8);
  });
});

test('fails when the running version differs from the deployed SHA', async () => {
  const stale = 'ffffffffffffffffffffffffffffffffffffffff';

  await withServer(healthyHandler({ version: stale }), async url => {
    await assert.rejects(
      runDeploySmoke({ baseUrl: url, expectedVersion: VERSION, log: () => {} }),
      /version is .* expected/,
    );
  });
});

test('fails when readiness reports the database down', async () => {
  await withServer(healthyHandler({ database: 'down' }), async url => {
    await assert.rejects(
      runDeploySmoke({ baseUrl: url, expectedVersion: VERSION, log: () => {} }),
      /expected 200, got 503/,
    );
  });
});

test('fails when a core public route returns 5xx', async () => {
  await withServer(healthyHandler({ publicStatus: 500 }), async url => {
    await assert.rejects(
      runDeploySmoke({ baseUrl: url, expectedVersion: VERSION, log: () => {} }),
      /expected 200, got 500/,
    );
  });
});

test('fails on an unexpected redirect instead of following it', async () => {
  await withServer(healthyHandler({ publicStatus: 302 }), async url => {
    await assert.rejects(
      runDeploySmoke({ baseUrl: url, expectedVersion: VERSION, log: () => {} }),
      /expected 200, got 302/,
    );
  });
});

test('rejects a missing expected version or base URL', async () => {
  await assert.rejects(runDeploySmoke({ baseUrl: 'https://tartly.in' }), /EXPECTED_VERSION/);
  await assert.rejects(
    runDeploySmoke({ expectedVersion: VERSION }),
    /DEPLOY_URL \(or APP_URL\) is required/,
  );
});
