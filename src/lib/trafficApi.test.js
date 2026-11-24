import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import handler from '../../api/traffic.js';

const token = ['header', Buffer.from(JSON.stringify({ sub: 'editor-fixture' })).toString('base64url'), 'signature'].join('.');
function request({ auth = true, range = '7d', method = 'GET' } = {}) {
  const req = { method, url: `/api/traffic?range=${range}`, headers: auth ? { authorization: `Bearer ${token}` } : {} };
  const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.data = value; return this; } };
  return { req, res, run: async () => { await handler(req, res); return res; } };
}
const environment = ['VITE_FIREBASE_PROJECT_ID', 'GA4_PROPERTY_ID', 'GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY'];

test('traffic API authenticates before reporting, handles configuration and isolates optional reports', async () => {
  const originalFetch = globalThis.fetch;
  const previous = Object.fromEntries(environment.map(key => [key, process.env[key]]));
  let calls = [], denied = false, failCore = false, dimensionReady = false, failLive = true;
  const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey;
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, body: options.body });
      if (url.includes('firestore.googleapis.com')) return Response.json(denied ? {} : { fields: { active: { booleanValue: true } } }, { status: denied ? 403 : 200 });
      if (url.includes('oauth2.googleapis.com')) return Response.json({ access_token: 'fixture-access-token' });
      if (url.endsWith(':batchRunReports')) {
        if (failCore) return Response.json({}, { status: 403 });
        const requests = JSON.parse(options.body).requests;
        assert.equal(requests.length, 5);
        assert.equal(requests[0].dateRanges[0].endDate, 'today');
        return Response.json({ reports: [
          { rows: [{ metricValues: [9, 3, 4, 2].map(value => ({ value: String(value) })) }], metadata: { timeZone: 'Asia/Ho_Chi_Minh' } },
          {}, {}, {}, {},
        ] });
      }
      if (url.endsWith('/metadata')) return Response.json({ dimensions: dimensionReady ? [{ apiName: 'customEvent:place_id' }] : [] });
      if (url.endsWith(':runReport')) return Response.json({ rows: [{ dimensionValues: [{ value: 'a' }, { value: 'place_open' }], metricValues: [{ value: '6' }] }] });
      if (url.endsWith(':runRealtimeReport')) return Response.json(failLive ? {} : { rows: [] }, { status: failLive ? 429 : 200 });
      assert.fail('Unexpected network request');
    };
    assert.equal((await request({ auth: false }).run()).statusCode, 401); assert.equal(calls.length, 0);
    assert.equal((await request({ method: 'POST' }).run()).statusCode, 405);
    assert.equal((await request({ range: '__proto__' }).run()).statusCode, 400);
    environment.forEach(key => delete process.env[key]);
    assert.equal((await request().run()).statusCode, 503);
    process.env.VITE_FIREBASE_PROJECT_ID = 'fixture';
    assert.equal((await request().run()).statusCode, 503);
    Object.assign(process.env, { GA4_PROPERTY_ID: '123456789', GA4_CLIENT_EMAIL: 'fixture@example.invalid', GA4_PRIVATE_KEY: privateKey });
    denied = true; calls = [];
    assert.equal((await request().run()).statusCode, 403); assert.equal(calls.length, 1);
    denied = false;
    const basic = await request().run();
    assert.equal(basic.statusCode, 200); assert.equal(basic.data.views, 9);
    assert.equal(basic.data.realtime, null); assert.equal(basic.data.placesStatus, 'setup');
    assert.equal(basic.headers['Cache-Control'], 'no-store');
    calls = []; await request().run();
    assert.equal(calls.length, 1, 'Cached report still verifies editor on every request');
    dimensionReady = true; failLive = false;
    const detailed = await request({ range: 'today' }).run();
    assert.equal(detailed.statusCode, 200); assert.equal(detailed.data.placesStatus, 'ready');
    assert.equal(detailed.data.places[0].opens, 6); assert.equal(detailed.data.realtime.users, 0);
    failCore = true;
    const failed = await request({ range: '30d' }).run();
    assert.equal(failed.statusCode, 502); assert.equal(failed.data.error, 'report');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of environment) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
});
