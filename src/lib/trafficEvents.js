import { trafficEvents } from './trafficReport.js';

// Deliberately accept only a public catalog ID; never forward GPS, searches or contact data.
export function trafficPayload(event, placeId) {
  if (!trafficEvents.includes(event) || typeof placeId !== 'string' || !placeId || placeId.length > 100) return null;
  return { place_id: placeId };
}

export function createTrafficTracker({ enabled, app, loadSDK, isPublic, origin }) {
  let pending, analytics, sdk, pageSent = false;
  const queue = [];
  const send = (event, params = {}) => {
    if (isPublic()) sdk.logEvent(analytics, event, { ...params, page_location: `${origin}/` });
  };
  async function start() {
    if (!enabled || !isPublic()) return;
    if (!pending) pending = (async () => {
      sdk = await loadSDK();
      if (!await sdk.isSupported() || !isPublic()) return;
      analytics = sdk.initializeAnalytics(app, { config: { send_page_view: false } });
    })().catch(() => {}).finally(() => { if (!analytics) pending = null; });
    await pending;
    if (!analytics || !isPublic()) { queue.length = 0; return; }
    if (!pageSent) { pageSent = true; send('page_view'); }
    while (queue.length) { const [event, params] = queue.shift(); send(event, params); }
  }
  return {
    start,
    track(event, placeId) {
      const payload = trafficPayload(event, placeId);
      if (!enabled || !isPublic() || !payload) return;
      if (analytics && pageSent) { try { send(event, payload); } catch { /* Measurement must never interrupt the map. */ } return; }
      if (queue.length < 20) queue.push([event, payload]);
      void start().catch(() => {});
    },
  };
}
