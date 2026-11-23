import { activityTime } from './adminActivity.js';

export function summarizeEditorActivity(events, since = 0) {
  const rows = new Map();
  for (const event of events) {
    if (!event || !Array.isArray(event.changes) || event.changes.some(change => !change
      || typeof change.id !== 'string' || !Array.isArray(change.fields)
      || change.fields.some(field => typeof field !== 'string'))) throw Error('accountActivityError');
    if (activityTime(event.createdAt) < since) continue;
    const key = event.actor || event.actorEmail || 'unknown';
    const row = rows.get(key) || { uid: event.actor, email: event.actorEmail, added: 0, edited: 0, status: 0, trash: 0, categories: 0, saves: 0, lastAt: '' };
    row.saves++;
    if (activityTime(event.createdAt) > activityTime(row.lastAt)) row.lastAt = event.createdAt;
    const seen = new Set();
    for (const change of event.changes || []) {
      if (seen.has(change.id)) continue;
      seen.add(change.id);
      const fields = change.fields || [];
      if (fields.includes('categories')) { row.categories++; continue; }
      if (fields.includes('created')) row.added++;
      else if (fields.includes('removed') || fields.includes('deletedAt')) row.trash++;
      else { row.edited++; if (fields.includes('status')) row.status++; }
    }
    rows.set(key, row);
  }
  return [...rows.values()];
}

function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('timestampValue' in value) return value.timestampValue;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, value]) => [key, decode(value)]));
  return null;
}

export function validActivityEvent(row) {
  return row && Number.isSafeInteger(row.revision) && row.revision > 0
    && typeof row.actor === 'string' && row.actor.length > 0 && row.actor.length <= 128
    && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt))
    && (row.actorEmail == null || typeof row.actorEmail === 'string')
    && Array.isArray(row.changes) && row.changes.length <= 201
    && row.changes.every(change => change && typeof change.id === 'string' && typeof change.name === 'string'
      && Array.isArray(change.fields) && change.fields.every(field => typeof field === 'string'));
}

// Project only audit metadata: avoid downloading hundreds of catalog snapshots.
// Page by revision, not offset; the result includes history beyond the UI's last 40.
export async function loadEditorActivity({ projectId, getIdToken, signal, onProgress, fetcher = fetch }) {
  const events = [];
  let cursor;
  do {
    signal?.throwIfAborted();
    const token = await getIdToken();
    if (!token) throw Error('accountDenied');
    const structuredQuery = {
      from: [{ collectionId: 'catalogHistory' }],
      select: { fields: ['actor', 'actorEmail', 'createdAt', 'changes', 'revision'].map(fieldPath => ({ fieldPath })) },
      orderBy: [{ field: { fieldPath: 'revision' }, direction: 'DESCENDING' }], limit: 200,
      ...(cursor ? { startAt: { values: [{ integerValue: String(cursor) }], before: false } } : {}),
    };
    const response = await fetcher(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ structuredQuery }), signal,
    });
    if (!response.ok) throw Error(response.status === 403 ? 'accountDenied' : 'accountActivityError');
    const result = await response.json();
    if (!Array.isArray(result)) throw Error('accountActivityError');
    const page = result.filter(row => row.document).map(row => decode({ mapValue: { fields: row.document.fields } }));
    if (page.some(row => !validActivityEvent(row))) throw Error('accountActivityError');
    if (page.length && cursor && page[0].revision >= cursor) throw Error('accountActivityError');
    events.push(...page);
    onProgress?.(events.length);
    if (page.length < 200) break;
    cursor = page.at(-1).revision;
  } while (true);
  return events;
}
