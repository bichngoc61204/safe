import { createSign } from 'node:crypto';
import { interactionFilter, parsePlaceTraffic, parseTrafficReports, realtimeRequests, trafficApiIssue, trafficRanges, trafficRequests } from '../src/lib/trafficReport.js';

const tokenUrl = 'https://oauth2.googleapis.com/token';
const jsonHeaders = { 'Content-Type': 'application/json' };
const analyticsScope = 'https://www.googleapis.com/auth/analytics.readonly';
const timeout = () => AbortSignal.timeout(8_000);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const cachedReports = new Map();

async function getEditorStatus(token, projectId) {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts.every(part => /^[\w-]+$/.test(part))) return 401;
  let uid;
  try {
    // The unverified claim identifies a path. Firestore verifies the token and enforces self-read.
    uid = JSON.parse(Buffer.from(parts[1], 'base64url').toString()).sub;
  } catch {
    return 401;
  }
  if (typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/')) return 401;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/editors/${encodeURIComponent(uid)}`;
  const role = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: timeout() });
  if (role.status === 401) return 401;
  if (role.status === 403 || role.status === 404) return 403;
  if (!role.ok) throw new Error('editorLookup');
  return (await role.json()).fields?.active?.booleanValue === true ? 200 : 403;
}

async function fetchReport({ property, email, privateKey, range }) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: email, scope: analyticsScope, aud: tokenUrl, iat: now, exp: now + 300,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url');
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    signal: timeout(),
  });
  if (!tokenResponse.ok) throw new Error('analyticsToken');
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) throw new Error('analyticsToken');
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${property}`;
  async function call(suffix, body) {
    const response = await fetch(`${base}${suffix}`, {
      method: body ? 'POST' : 'GET', headers: { ...jsonHeaders, Authorization: `Bearer ${accessToken}` },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: timeout(),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw Object.assign(Error('analyticsReport'), { httpStatus: response.status, apiCode: detail.error?.status });
    }
    return response.json();
  }
  // Optional panels fail independently so a realtime/custom-dimension issue cannot hide the main report.
  const requests = trafficRequests(range);
  const [liveRequest, minuteRequest] = realtimeRequests();
  const [core, live, minutes, metadata] = await Promise.allSettled([
    call(':batchRunReports', { requests }),
    call(':runRealtimeReport', liveRequest),
    call(':runRealtimeReport', minuteRequest),
    call('/metadata'),
  ]);
  if (core.status !== 'fulfilled') throw Error('analyticsReport');
  const main = parseTrafficReports(core.value.reports);
  const dimensions = metadata.status === 'fulfilled' && Array.isArray(metadata.value.dimensions) ? metadata.value.dimensions : null;
  let places = [], placesStatus = dimensions ? 'setup' : 'unavailable';
  if (dimensions?.some(item => item.apiName === 'customEvent:place_id')) {
    try {
      const result = await call(':runReport', {
        dateRanges: requests[0].dateRanges, dimensionFilter: interactionFilter,
        dimensions: [{ name: 'customEvent:place_id' }, { name: 'eventName' }], metrics: [{ name: 'eventCount' }], limit: 2000,
      });
      places = parsePlaceTraffic(result); placesStatus = 'ready';
      main.thresholded ||= Boolean(result.metadata?.subjectToThresholding || result.metadata?.dataLossFromOtherRow);
    } catch { placesStatus = 'unavailable'; }
  }
  let realtime = null, realtimeIssue = live.status === 'rejected' ? trafficApiIssue(live.reason) : null;
  let minuteIssue = minutes.status === 'rejected' ? trafficApiIssue(minutes.reason) : null;
  let liveMinutes = [];
  if (minutes.status === 'fulfilled') {
    try {
      liveMinutes = (minutes.value.rows || []).map(row => ({ minute: Number(row.dimensionValues[0].value), views: Number(row.metricValues[0].value) }));
      if (liveMinutes.some(row => !Number.isInteger(row.minute) || row.minute < 0 || row.minute > 29 || !Number.isSafeInteger(row.views) || row.views < 0)) throw Error('invalid');
    } catch { minuteIssue = { code: 'INVALID_RESPONSE', status: 0 }; liveMinutes = []; }
  }
  if (live.status === 'fulfilled') {
    const value = Number(live.value.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    if (Number.isSafeInteger(value) && value >= 0) realtime = { users: value, minutes: liveMinutes, minutesAvailable: !minuteIssue };
    else realtimeIssue = { code: 'INVALID_RESPONSE', status: 0 };
  }
  // A failure of the distinct-user query must not hide a valid page-view chart.
  if (!realtime && !minuteIssue) realtime = { users: null, minutes: liveMinutes, minutesAvailable: true };
  return {
    ...main, places, placesStatus, range, generatedAt: new Date().toISOString(),
    realtime, realtimeIssue, minuteIssue, propertyId: property,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method' });
  }
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.match(/^Bearer ([\w.-]{1,4096})$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'denied' });
  const range = new URL(req.url || '/', 'https://safemap.invalid').searchParams.get('range') || '7d';
  if (!Object.hasOwn(trafficRanges, range)) return res.status(400).json({ error: 'range' });
  const { VITE_FIREBASE_PROJECT_ID: projectId, GA4_PROPERTY_ID: property, GA4_CLIENT_EMAIL: email, GA4_PRIVATE_KEY: key } = process.env;
  if (!projectId) return res.status(503).json({ error: 'setup' });

  try {
    const status = await getEditorStatus(token, projectId);
    if (status !== 200) return res.status(status).json({ error: 'denied' });
    if (!/^\d+$/.test(property?.trim() ?? '') || !email?.trim() || !key?.trim()) return res.status(503).json({ error: 'setup' });
    const cacheKey = `${projectId}:${property.trim()}:${email.trim()}:${range}`;
    const cachedReport = cachedReports.get(cacheKey);
    if (cachedReport?.expires > Date.now()) return res.status(200).json(cachedReport.data);
    const data = await fetchReport({ property: property.trim(), email: email.trim(), privateKey: key.replace(/\\n/g, '\n'), range });
    if (cachedReports.size > 12) cachedReports.clear();
    cachedReports.set(cacheKey, { data, expires: Date.now() + 60_000 });
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'report' });
  }
}
