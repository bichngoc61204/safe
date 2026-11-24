import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trafficRequests, parseTrafficReports, parsePlaceTraffic, trafficCalendar, validateTrafficReport, dailyTrafficState, realtimeRequests, trafficApiIssue } from './trafficReport.js';
import { createTrafficTracker, trafficPayload } from './trafficEvents.js';

const row = (dimensions, metrics) => ({ dimensionValues: dimensions.map(value => ({ value })), metricValues: metrics.map(value => ({ value: String(value) })) });
const reports = () => [
  { rows: [row([], [23, 12, 16, 7])], metadata: { timeZone: 'Asia/Ho_Chi_Minh' } },
  { rows: [row(['20261124'], [23, 12])] },
  { rows: [row(['Da Nang', 'Da Nang', 'Vietnam'], [10])] },
  { rows: [row(['mobile'], [9])] },
  { rows: [row(['place_open'], [20]), row(['phone_click'], [2])] },
];
const complete = () => ({ ...parseTrafficReports(reports()), places: [], placesStatus: 'setup', realtime: null, range: '7d', generatedAt: '2026-11-24T14:00:00Z' });

test('traffic periods include today; all core reports exclude admin and accept only expected event names', () => {
  for (const [range, start] of [['today', 'today'], ['7d', '6daysAgo'], ['30d', '29daysAgo']]) {
    const requests = trafficRequests(range);
    assert.equal(requests.length, 5);
    assert.deepEqual(requests[0].dateRanges, [{ startDate: start, endDate: 'today' }]);
    assert.equal(requests[0].dimensionFilter.filter.stringFilter.value, '/');
    assert.equal(requests[4].dimensionFilter.andGroup.expressions[0].filter.stringFilter.value, '/');
    assert.ok(requests[4].dimensionFilter.andGroup.expressions[1].filter.inListFilter.values.includes('place_open'));
  }
});

test('GA4 parsing preserves distinct total users, groups place events and discloses thresholding', () => {
  const source = reports(); source[2].metadata = { subjectToThresholding: true };
  const report = parseTrafficReports(source);
  assert.equal(report.users, 12); assert.equal(report.views, 23); assert.equal(report.thresholded, true);
  assert.deepEqual(report.cities[0], { city: 'Da Nang', region: 'Da Nang', country: 'Vietnam', users: 10 });
  assert.deepEqual(parsePlaceTraffic({ rows: [row(['a', 'place_open'], [6]), row(['a', 'route_request'], [2]), row(['a', 'directions_external'], [3]), row(['b', 'place_open'], [8]), row(['(not set)', 'place_open'], [12]), row(['a', 'untrusted_event'], [999])] }), [
    { id: 'b', opens: 8, routes: 0, calls: 0, saves: 0, shares: 0 },
    { id: 'a', opens: 6, routes: 5, calls: 0, saves: 0, shares: 0 },
  ]);
  assert.throws(() => parseTrafficReports([]), /analyticsReport/);
  source[0].rows[0].metricValues[0].value = '-1';
  assert.throws(() => parseTrafficReports(source), /analyticsReport/);
});

test('report validation rejects bad dates, counts, timezones and malformed optional panels', () => {
  assert.equal(validateTrafficReport(complete()), true);
  assert.equal(validateTrafficReport({...complete(),realtime:{users:null,minutes:[{minute:0,views:2}],minutesAvailable:true}}),true);
  for (const mutate of [
    data => { data.days[0].date = '20260230'; }, data => { data.users = -1; },
    data => { data.timeZone = 'Invalid/TimeZone'; }, data => { data.places = [null]; },
    data => { data.realtime = { users: 1, minutes: [{ minute: 30, views: 1 }] }; },
    data => { data.generatedAt = 'invalid'; }, data => { data.events[0].event = 'password'; },
  ]) { const data = complete(); mutate(data); assert.equal(validateTrafficReport(data), false); }
});

test('calendar fills missing days using the property timezone across midnight and month boundaries', () => {
  const calendar = trafficCalendar([{ date: '20261201', views: 3, users: 2 }], '7d', 'Asia/Ho_Chi_Minh', new Date('2026-11-30T18:00:00Z'));
  assert.equal(calendar.length, 7); assert.equal(calendar[0].date, '20261125');
  assert.deepEqual(calendar[6], { date: '20261201', views: 3, users: 2 });
  assert.equal(calendar[0].views, 0);
  assert.equal(trafficCalendar([], 'today', 'UTC', new Date('2026-11-30T18:00:00Z'))[0].date, '20261130');
});

test('public measurement queues while SDK loads, emits page_view once and never forwards sensitive properties', async () => {
  let resolveSDK, loads = 0, publicPage = true;
  const sent = [];
  const sdk = { isSupported: async () => true, initializeAnalytics: () => ({}), logEvent: (_, event, params) => sent.push({ event, params }) };
  const tracker = createTrafficTracker({ enabled: true, app: {}, origin: 'https://example.invalid', isPublic: () => publicPage, loadSDK: () => { loads++; return new Promise(resolve => { resolveSDK = resolve; }); } });
  tracker.track('place_open', 'a'); tracker.track('route_request', 'a');
  resolveSDK(sdk); await tracker.start();
  assert.equal(loads, 1); assert.deepEqual(sent.map(item => item.event), ['page_view', 'place_open', 'route_request']);
  await tracker.start(); assert.equal(sent.length, 3);
  tracker.track('phone_click', 'b');
  assert.deepEqual(sent.at(-1).params, { place_id: 'b', page_location: 'https://example.invalid/' });
  publicPage = false; tracker.track('place_open', 'admin'); await tracker.start(); assert.equal(sent.length, 4);
  assert.equal(trafficPayload('email', 'x'), null);
  assert.equal(trafficPayload('place_open', { lat: 16, lng: 108, email: 'private' }), null);
  assert.equal(trafficPayload('place_open', 'x'.repeat(101)), null);
});

test('measurement disabled, unsupported, blocked, or switched to admin never breaks the map', async () => {
  const sdk = { isSupported: async () => false, logEvent: () => assert.fail('must not send') };
  const disabled = createTrafficTracker({ enabled: false, loadSDK: () => assert.fail('must not load'), isPublic: () => true });
  disabled.track('place_open', 'a'); await disabled.start();
  const unsupported = createTrafficTracker({ enabled: true, loadSDK: async () => sdk, isPublic: () => true });
  unsupported.track('place_open', 'a'); await unsupported.start();
  const blocked = createTrafficTracker({ enabled: true, loadSDK: async () => { throw Error('adblock'); }, isPublic: () => true });
  blocked.track('place_open', 'a'); await blocked.start();
  let resolve, publicPage = true;
  const switched = createTrafficTracker({ enabled: true, isPublic: () => publicPage, loadSDK: () => new Promise(done => { resolve = done; }) });
  const pending = switched.start(); switched.track('place_open', 'a'); publicPage = false; resolve(sdk); await pending;
});


test('realtime uses native 30-minute reporting and classifies provider failures without exposing messages', () => {
  const [users, minutes] = realtimeRequests();
  assert.deepEqual(users, {metrics:[{name:'activeUsers'}]});
  assert.deepEqual(minutes, {dimensions:[{name:'minutesAgo'}],metrics:[{name:'screenPageViews'}],limit:'30'});
  assert.deepEqual(trafficApiIssue({apiCode:'INVALID_ARGUMENT',httpStatus:400,message:'private details'}), {code:'INVALID_ARGUMENT',status:400});
  assert.deepEqual(trafficApiIssue({name:'TimeoutError'}), {code:'DEADLINE_EXCEEDED',status:0});
  assert.deepEqual(trafficApiIssue({apiCode:'a secret'}), {code:'UNAVAILABLE',status:0});
});


test('empty daily reports are distinct from confirmed zero counts and recent realtime traffic', () => {
  const empty={views:0,users:0,sessions:0,newUsers:0,days:[],cities:[],devices:[],events:[],dailyDataAvailable:false,realtime:null};
  assert.equal(dailyTrafficState(empty),'empty');
  assert.equal(dailyTrafficState({...empty,realtime:{users:2,minutes:[]}}),'pending');
  assert.equal(dailyTrafficState({...empty,realtime:{users:null,minutes:[{minute:0,views:1}]}}),'pending');
  assert.equal(dailyTrafficState({...empty,dailyDataAvailable:true}),'ready');
  assert.equal(dailyTrafficState({...empty,dailyDataAvailable:undefined,views:1}),'ready');
  assert.equal(parseTrafficReports([{}, {}, {}, {}, {}]).dailyDataAvailable,false);
  assert.equal(parseTrafficReports(reports()).dailyDataAvailable,true);
  assert.equal(validateTrafficReport({...complete(),dailyDataAvailable:'false'}),false);
});
