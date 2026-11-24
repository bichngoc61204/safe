export const trafficEvents = ['place_open', 'route_request', 'directions_external', 'phone_click', 'place_save', 'share_place'];
export const trafficRanges = { today: 'today', '7d': '6daysAgo', '30d': '29daysAgo' };
const exact = (fieldName, value) => ({ filter: { fieldName, stringFilter: { matchType: 'EXACT', value } } });
export const publicTrafficFilter = exact('pagePath', '/');
export const interactionFilter = { andGroup: { expressions: [publicTrafficFilter,
  { filter: { fieldName: 'eventName', inListFilter: { values: trafficEvents } } },
] } };

// Realtime has its own schema. Use Google's default 30-minute window and native
// page-view metric; no event-name filter or extra dimensions are needed here.
export function realtimeRequests() {
  return [
    { metrics: [{ name: 'activeUsers' }] },
    { dimensions: [{ name: 'minutesAgo' }], metrics: [{ name: 'screenPageViews' }], limit: '30' },
  ];
}

export function trafficApiIssue(error) {
  const codes = ['INVALID_ARGUMENT', 'PERMISSION_DENIED', 'UNAUTHENTICATED', 'RESOURCE_EXHAUSTED', 'UNAVAILABLE', 'INTERNAL', 'DEADLINE_EXCEEDED', 'INVALID_RESPONSE'];
  const code = codes.includes(error?.apiCode) ? error.apiCode : ['TimeoutError', 'AbortError'].includes(error?.name) ? 'DEADLINE_EXCEEDED' : 'UNAVAILABLE';
  return { code, status: Number.isInteger(error?.httpStatus) ? error.httpStatus : 0 };
}

export function trafficRequests(range = '7d') {
  const common = { dateRanges: [{ startDate: trafficRanges[range] || trafficRanges['7d'], endDate: 'today' }], dimensionFilter: publicTrafficFilter };
  const metric = name => ({ name });
  return [
    { ...common, metrics: ['screenPageViews', 'totalUsers', 'sessions', 'newUsers'].map(metric) },
    { ...common, dimensions: [{ name: 'date' }], metrics: ['screenPageViews', 'totalUsers'].map(metric), orderBys: [{ dimension: { dimensionName: 'date' } }], keepEmptyRows: true },
    { ...common, dimensions: ['city', 'region', 'country'].map(metric), metrics: [metric('totalUsers')], orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 10 },
    { ...common, dimensions: [metric('deviceCategory')], metrics: [metric('totalUsers')], orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 10 },
    { ...common, dimensionFilter: interactionFilter, dimensions: [metric('eventName')], metrics: [metric('eventCount')], limit: 10 },
  ];
}

const count = value => {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0) throw Error('analyticsReport');
  return number;
};
const metric = (row, index = 0) => count(row?.metricValues?.[index]?.value);
const dimension = (row, index = 0) => String(row?.dimensionValues?.[index]?.value || '').slice(0, 160);
const rows = report => report?.rows || [];
export function parseTrafficReports(reports) {
  if (!Array.isArray(reports) || reports.length !== 5) throw Error('analyticsReport');
  const total = rows(reports[0])[0];
  return {
    views: metric(total), users: metric(total, 1), sessions: metric(total, 2), newUsers: metric(total, 3),
    dailyDataAvailable: reports.some(report => rows(report).length > 0),
    days: rows(reports[1]).map(row => ({ date: dimension(row), views: metric(row), users: metric(row, 1) })),
    cities: rows(reports[2]).map(row => ({ city: dimension(row), region: dimension(row, 1), country: dimension(row, 2), users: metric(row) })),
    devices: rows(reports[3]).map(row => ({ device: dimension(row), users: metric(row) })),
    events: rows(reports[4]).map(row => ({ event: dimension(row), count: metric(row) })).filter(row => trafficEvents.includes(row.event)),
    timeZone: reports[0].metadata?.timeZone || 'UTC',
    thresholded: reports.some(report => report.metadata?.subjectToThresholding || report.metadata?.dataLossFromOtherRow),
  };
}

export function dailyTrafficState(report) {
  if (!report) return 'empty';
  const hasDailyData = report.dailyDataAvailable ?? (report.views > 0 || report.users > 0 || report.sessions > 0 || report.days?.length > 0 || report.events?.length > 0 || report.cities?.length > 0 || report.devices?.length > 0);
  if (hasDailyData) return 'ready';
  return report.realtime?.users > 0 || report.realtime?.minutes?.some(row => row.views > 0) ? 'pending' : 'empty';
}

export function parsePlaceTraffic(report) {
  const grouped = new Map();
  for (const row of rows(report)) {
    const id = dimension(row), event = dimension(row, 1);
    if (!id || id === '(not set)' || !trafficEvents.includes(event)) continue;
    if (!grouped.has(id)) grouped.set(id, { id, opens: 0, routes: 0, calls: 0, saves: 0, shares: 0 });
    const place = grouped.get(id), value = metric(row);
    if (event === 'place_open') place.opens += value;
    if (event === 'route_request' || event === 'directions_external') place.routes += value;
    if (event === 'phone_click') place.calls += value;
    if (event === 'place_save') place.saves += value;
    if (event === 'share_place') place.shares += value;
  }
  return [...grouped.values()].sort((a, b) => b.opens - a.opens || b.routes - a.routes || a.id.localeCompare(b.id)).slice(0, 20);
}

export function validateTrafficReport(report) {
  const validCount = value => Number.isSafeInteger(value) && value >= 0;
  const validRows = (items, validate, max = 40) => Array.isArray(items) && items.length <= max && items.every(validate);
  const text = value => typeof value === 'string' && value.length <= 160;
  const validIssue = value => value == null || (typeof value.code === 'string' && trafficApiIssue({ apiCode: value.code }).code === value.code && Number.isInteger(value.status) && value.status >= 0 && value.status <= 599);
  const validDate = value => {
    if (!/^\d{8}$/.test(value)) return false;
    const stamp = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}T00:00:00Z`;
    const parsed = Date.parse(stamp);
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10).replaceAll('-', '') === value;
  };
  let validZone = false;
  try { new Intl.DateTimeFormat('en', { timeZone: report?.timeZone }).format(); validZone = typeof report?.timeZone === 'string'; } catch { /* Invalid server response. */ }
  return !!report && validZone && validIssue(report.realtimeIssue) && validIssue(report.minuteIssue)
    && (report.dailyDataAvailable === undefined || typeof report.dailyDataAvailable === 'boolean')
    && (report.propertyId === undefined || typeof report.propertyId === 'string' && /^\d+$/.test(report.propertyId))
    && ['views', 'users', 'sessions', 'newUsers'].every(key => validCount(report[key]))
    && validRows(report.days, row => row && validDate(row.date) && validCount(row.views) && validCount(row.users), 31)
    && validRows(report.cities, row => row && ['city', 'region', 'country'].every(key => text(row[key])) && validCount(row.users))
    && validRows(report.devices, row => row && text(row.device) && validCount(row.users))
    && validRows(report.events, row => row && trafficEvents.includes(row.event) && validCount(row.count))
    && validRows(report.places, row => row && text(row.id) && ['opens', 'routes', 'calls', 'saves', 'shares'].every(key => validCount(row[key])))
    && ['ready', 'setup', 'unavailable'].includes(report.placesStatus)
    && (report.realtime === null || ((validCount(report.realtime?.users) || report.realtime?.users === null && report.realtime?.minutesAvailable === true) && validRows(report.realtime?.minutes, row => row && Number.isInteger(row.minute) && row.minute >= 0 && row.minute < 30 && validCount(row.views))))
    && ['today', '7d', '30d'].includes(report.range)
    && text(report.timeZone) && Number.isFinite(Date.parse(report.generatedAt));
}

export function trafficCalendar(days, range, timeZone, reference = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(reference).map(part => [part.type, part.value]));
  const end = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const count = range === 'today' ? 1 : range === '30d' ? 30 : 7;
  const values = new Map(days.map(day => [day.date, day]));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end - (count - index - 1) * 86_400_000).toISOString().slice(0, 10).replaceAll('-', '');
    return values.get(date) || { date, views: 0, users: 0 };
  });
}
