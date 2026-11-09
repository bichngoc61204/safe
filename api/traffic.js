import { createSign } from 'node:crypto';

const tokenUrl = 'https://oauth2.googleapis.com/token';
const jsonHeaders = { 'Content-Type': 'application/json' };
const analyticsScope = 'https://www.googleapis.com/auth/analytics.readonly';
const timeout = () => AbortSignal.timeout(8_000);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
let cachedReport;

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

async function fetchReport({ property, email, privateKey }) {
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
  const common = {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
    dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'EXACT', value: '/' } } },
  };
  const result = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`, {
    method: 'POST',
    headers: { ...jsonHeaders, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ requests: [
      { ...common, metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }] },
      { ...common, dimensions: [{ name: 'date' }], metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }], keepEmptyRows: true },
    ] }),
    signal: timeout(),
  });
  if (!result.ok) throw new Error('analyticsReport');
  const { reports } = await result.json();
  if (reports?.length !== 2) throw new Error('analyticsReport');
  const totals = reports[0].rows?.[0]?.metricValues;
  return {
    views: Number(totals?.[0]?.value ?? 0),
    users: Number(totals?.[1]?.value ?? 0),
    days: (reports[1].rows ?? []).map(row => ({
      date: row.dimensionValues[0].value, views: Number(row.metricValues[0].value),
    })),
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
  const { VITE_FIREBASE_PROJECT_ID: projectId, GA4_PROPERTY_ID: property, GA4_CLIENT_EMAIL: email, GA4_PRIVATE_KEY: key } = process.env;
  if (!projectId) return res.status(503).json({ error: 'setup' });

  try {
    const status = await getEditorStatus(token, projectId);
    if (status !== 200) return res.status(status).json({ error: 'denied' });
    if (!/^\d+$/.test(property ?? '') || !email || !key) return res.status(503).json({ error: 'setup' });
    if (cachedReport?.expires > Date.now()) return res.status(200).json(cachedReport.data);
    const data = await fetchReport({ property, email, privateKey: key.replace(/\\n/g, '\n') });
    cachedReport = { data, expires: Date.now() + 5 * 60_000 };
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'report' });
  }
}
