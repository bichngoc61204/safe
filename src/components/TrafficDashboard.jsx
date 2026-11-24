import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { getCategory } from '../lib/domain';
import { groupPalette } from '../lib/catalogGroups';
import { dailyTrafficState, trafficCalendar, validateTrafficReport } from '../lib/trafficReport';
import '../traffic.css';

const TrafficPlaceMap = lazy(() => import('./TrafficPlaceMap'));
const periods = [['today', 'Hôm nay'], ['7d', '7 ngày'], ['30d', '30 ngày']];
const actions = [
  ['place_open', 'Mở chi tiết', 'eye'], ['route_request', 'Yêu cầu chỉ đường', 'navigation'],
  ['directions_external', 'Mở Google Maps', 'map'], ['phone_click', 'Bấm gọi', 'phone'],
  ['place_save', 'Lưu địa điểm', 'bookmark'], ['share_place', 'Mở chia sẻ / QR', 'share'],
];
const dateLabel = value => `${value.slice(6)}/${value.slice(4, 6)}`;
const label = value => !value || value === '(not set)' ? 'Chưa xác định' : value;
const deviceLabels = { mobile: 'Điện thoại', desktop: 'Máy tính', tablet: 'Máy tính bảng' };
const realtimeMessages = {
  INVALID_ARGUMENT: 'GA4 từ chối định dạng yêu cầu thời gian thực. Cần kiểm tra phiên bản API của bản deploy.',
  PERMISSION_DENIED: 'Tài khoản dịch vụ chưa được phép đọc dữ liệu thời gian thực của tài sản này.',
  UNAUTHENTICATED: 'GA4 chưa xác thực được tài khoản báo cáo. Kiểm tra lại thông tin kết nối trên Vercel.',
  RESOURCE_EXHAUSTED: 'GA4 đang giới hạn số yêu cầu thời gian thực. Hãy thử lại sau.',
  DEADLINE_EXCEEDED: 'GA4 phản hồi chậm. Phần thời gian thực sẽ được thử lại khi làm mới.',
  INVALID_RESPONSE: 'Dữ liệu thời gian thực trả về chưa hợp lệ. Báo cáo theo ngày vẫn được giữ lại.',
  UNAVAILABLE: 'Chưa kết nối được báo cáo thời gian thực của GA4. Hãy thử làm mới sau.',
  INTERNAL: 'Dịch vụ GA4 đang gặp lỗi khi đọc thời gian thực. Hãy thử lại sau.',
};

function Panel({ title, subtitle, icon, children, className = '' }) {
  return <section className={`traffic-card ${className}`}><header><span className="traffic-section-icon"><Icon name={icon} size={18}/></span><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></header>{children}</section>;
}

export default function TrafficDashboard({ t, lang = 'vi', getIdToken, data = { places: [], categories: [] }, onPoint }) {
  const [range, setRange] = useState('7d');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ state: getIdToken ? 'loading' : 'demo' });
  const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => {
    if (!getIdToken) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setAttempt(value => value + 1); }, 60_000);
    return () => clearInterval(timer);
  }, [getIdToken]);
  useEffect(() => {
    if (!getIdToken) return;
    const controller = new AbortController();
    setResult(previous => ({ state: 'loading', ...(previous.report?.range === range ? { report: previous.report } : {}) }));
    async function load() {
      try {
        const token = await getIdToken();
        if (!token) throw Error('denied');
        const response = await fetch(`/api/traffic?range=${range}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (response.status === 404 || (response.ok && response.headers.get('Content-Type')?.includes('text/html'))) throw Error('endpoint');
        if (!response.headers.get('Content-Type')?.includes('application/json')) throw Error('report');
        const report = await response.json();
        if (!response.ok) throw Error(report.error);
        if (!validateTrafficReport(report) || report.range !== range) throw Error('report');
        if (!controller.signal.aborted) setResult({ state: 'ready', report });
      } catch (error) {
        if (!controller.signal.aborted) setResult(previous => ({ ...previous, state: ['endpoint', 'setup', 'denied'].includes(error.message) ? error.message : 'error' }));
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, getIdToken, range]);

  const { state, report } = result;
  const hasLiveUsers = Number.isSafeInteger(report?.realtime?.users);
  const dailyState = dailyTrafficState(report);
  const hasDailyData = dailyState === 'ready';
  const realtimeIssue = report && (!hasLiveUsers ? report.realtimeIssue : report.minuteIssue);
  const number = new Intl.NumberFormat(lang);
  const format = value => number.format(value);
  const events = new Map((report?.events || []).map(row => [row.event, row.count]));
  const interactions = [...events.values()].reduce((sum, count) => sum + count, 0);
  const calendar = report ? trafficCalendar(report.days, range, report.timeZone, new Date(report.generatedAt)) : [];
  const highest = Math.max(1, ...calendar.map(day => day.views));
  const ranked = useMemo(() => (report?.places || []).map(row => ({ ...row, place: data.places.find(place => place.id === row.id) })), [report, data.places]);
  const mapped = useMemo(() => ranked.filter(row => row.place && !row.place.deletedAt && Number.isFinite(row.place.lat) && Number.isFinite(row.place.lng) && row.opens > 0), [ranked]);
  const metricCards = report ? [
    ['Lượt xem bản đồ', report.views, 'Một người có thể mở bản đồ nhiều lần', 'map', 'blue'],
    ['Người dùng', report.users, `${format(report.newUsers)} người dùng mới trong kỳ`, 'community', 'green'],
    ['Phiên truy cập', report.sessions, 'Một lần ghé dùng có thể có nhiều thao tác', 'clock', 'violet'],
    ['Tương tác địa điểm', interactions, 'Mở chi tiết, chỉ đường, gọi, lưu, chia sẻ', 'pin', 'orange'],
  ] : [];
  const messages = { loading: 'trafficLoading', setup: 'trafficUnavailable', endpoint: 'trafficEndpointMissing', demo: 'trafficDemo', denied: 'editorDenied', error: 'trafficError' };
  const refresh = () => { setAttempt(value => value + 1); };
  const changeRange = value => { if (value !== range) { setResult({ state: 'loading' }); setRange(value); } };
  const periodText = range === 'today' ? 'Hôm nay' : `${range === '30d' ? '30' : '7'} ngày, gồm hôm nay`;
  const zoneLabel = report ? new Intl.DateTimeFormat(lang, { timeZone: report.timeZone, timeZoneName: 'shortOffset' }).formatToParts(new Date(report.generatedAt)).find(part => part.type === 'timeZoneName')?.value : '';
  const maxCity = Math.max(1, ...(report?.cities || []).map(row => row.users));
  const maxDevice = Math.max(1, ...(report?.devices || []).map(row => row.users));

  return <section className="traffic-dashboard" aria-busy={state === 'loading'}>
    <header className="traffic-heading"><div><span className="traffic-eyebrow">HIỆU QUẢ BẢN ĐỒ CỘNG ĐỒNG</span><h2>{t('overviewTraffic')}</h2><p>Hiểu cách khách tìm và sử dụng địa điểm. Khách không cần đăng nhập.</p></div><div className="traffic-controls"><div className="traffic-periods" role="group" aria-label="Khoảng thời gian">{periods.map(([id, title]) => <button type="button" key={id} aria-pressed={range === id} onClick={() => changeRange(id)}>{title}</button>)}</div><button type="button" className="button secondary traffic-refresh" onClick={refresh} disabled={state === 'loading'}><Icon name="restore" size={16}/>{t('trafficRefresh')}</button></div></header>
    {state !== 'ready' && state !== 'loading' && <p className="traffic-message traffic-notice" role="status"><Icon name="info" size={18}/>{report ? 'Chưa làm mới được. Đang giữ báo cáo tải thành công gần nhất.' : t(messages[state])}</p>}
    {!report && state === 'loading' && <><p className="traffic-message" role="status">{t('trafficLoading')}</p><div className="traffic-loading-grid" aria-hidden="true">{[1, 2, 3, 4].map(id => <div key={id}/>)}</div></>}
    {report && <>
      <div className="traffic-live"><div className="traffic-live-total"><span className="traffic-live-label"><i/>Hoạt động gần đây</span><div><strong>{hasLiveUsers ? format(report.realtime.users) : '—'}</strong><span>người dùng<br/>trong 30 phút qua</span></div><small>Toàn thuộc tính GA4 · không phải số người đang mở ngay lúc này</small></div><div className="traffic-live-chart"><div><strong>Lượt xem trong 30 phút</strong><span>{report.realtime ? 'Tự cập nhật mỗi phút khi đang xem' : 'Chưa tải được dữ liệu thời gian thực'}</span></div>{report.realtime?.minutesAvailable ? <ol aria-label="Lượt xem bản đồ theo phút">{Array.from({ length: 30 }, (_, index) => { const minute = 29 - index, views = report.realtime.minutes.find(row => row.minute === minute)?.views || 0; const max = Math.max(1, ...report.realtime.minutes.map(row => row.views)); return <li key={minute} title={`${minute} phút trước: ${format(views)} lượt xem`}><i style={{ height: `${Math.max(3, views / max * 100)}%` }} data-empty={!views}/><span className="sr-only">{minute} phút trước: {format(views)} lượt xem</span></li>; })}</ol> : <p>Phần này sẽ được thử lại khi làm mới báo cáo.</p>}<footer><span>30 phút trước</span><span>Hiện tại</span></footer></div></div>
      {realtimeIssue && <p className="traffic-api-notice" role="status"><Icon name="info" size={17}/><span>{realtimeMessages[realtimeIssue.code]}<small>Mã: {realtimeIssue.code}{realtimeIssue.status ? ` · HTTP ${realtimeIssue.status}` : ''}{report.propertyId ? ` · Tài sản ${report.propertyId}` : ''}</small></span></p>}
      <div className="traffic-report-meta"><span><Icon name="clock" size={13}/>Báo cáo theo ngày · {periodText} · {zoneLabel}</span><span role="status">{state === 'loading' ? 'Đang làm mới…' : `Kiểm tra lúc ${new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(new Date(report.generatedAt))}`}</span></div>
      {!hasDailyData && <div className="traffic-daily-notice" role="status"><Icon name="clock" size={20}/><div><strong>{dailyState === 'pending' ? 'Đã có lượt dùng mới. Báo cáo ngày chưa sẵn sàng.' : 'Chưa có dữ liệu báo cáo ngày trong kỳ này.'}</strong><p>{dailyState === 'pending' ? 'Xem ô 30 phút phía trên để theo dõi lượt thử mới. Các chỉ số bên dưới sẽ tự hiển thị khi GA4 có báo cáo ngày.' : 'Có thể chưa có lượt dùng trong kỳ hoặc GA4 chưa xử lý xong. Trang sẽ tiếp tục kiểm tra khi đang mở.'} Báo cáo trong ngày thường có độ trễ 2–6 giờ; xử lý đầy đủ có thể mất 24–48 giờ.</p><a href="https://support.google.com/analytics/answer/11198161?hl=vi" target="_blank" rel="noopener noreferrer">Về thời gian cập nhật của GA4<Icon name="arrow" size={12}/></a></div></div>}
      <div className="traffic-metrics">{metricCards.map(([title, value, note, icon, tone]) => <article className={`traffic-metric traffic-tone-${tone}`} key={title}><div><span>{title}</span><Icon name={icon} size={19}/></div><strong>{hasDailyData ? format(value) : '—'}</strong><small>{hasDailyData ? note : 'Chưa có dữ liệu ngày'}</small></article>)}</div>
      <Panel title="Nhịp truy cập" subtitle={`${periodText} · số lượt mở bản đồ theo ngày`} icon="chart" className="traffic-trend">
        {hasDailyData ? <ol className={`traffic-bars ${range === '30d' ? 'is-month' : ''}`} aria-label={t('trafficDaily')}>{calendar.map((day, index) => <li key={day.date} title={`${dateLabel(day.date)}: ${format(day.views)} lượt xem, ${format(day.users)} người dùng`}><span>{range !== '30d' || day.views === highest ? format(day.views) : ''}</span><i aria-hidden="true"><b style={{ height: `${day.views / highest * 100}%` }}/></i><time dateTime={`${day.date.slice(0, 4)}-${day.date.slice(4, 6)}-${day.date.slice(6)}`}>{range !== '30d' || index % 5 === 0 || index === calendar.length - 1 ? dateLabel(day.date) : ''}</time><span className="sr-only">{format(day.views)} lượt xem</span></li>)}</ol> : <div className="traffic-daily-empty"><Icon name="chart" size={25}/><strong>Chưa có biểu đồ theo ngày</strong><span>{dailyState === 'pending' ? 'Lượt dùng mới đã hiện trong ô 30 phút. Biểu đồ này chờ báo cáo ngày của GA4.' : 'Biểu đồ sẽ xuất hiện khi có dữ liệu trong kỳ đã chọn.'}</span></div>}
      </Panel>
      <div className="traffic-two-columns">
        <Panel title="Khách truy cập từ đâu?" subtitle="Thành phố / khu vực theo vị trí gần đúng của GA4" icon="globe">
          {report.cities.length ? <ol className="traffic-rank-list">{report.cities.map((row, index) => <li key={`${row.city}:${row.region}:${row.country}`}><span className="traffic-rank-number">{index + 1}</span><div><div className="traffic-rank-label"><strong>{label(row.city)}</strong><b>{format(row.users)} <small>người dùng</small></b></div><small>{[row.region, row.country].filter(value => value && value !== '(not set)').join(' · ') || 'GA4 chưa xác định khu vực'}</small><div className="traffic-meter"><i style={{ width: `${row.users / maxCity * 100}%` }}/></div></div></li>)}</ol> : <p className="traffic-empty">Chưa có dữ liệu khu vực trong kỳ này.</p>}
          <p className="traffic-footnote">Không phải GPS của khách. Không xác định được từng người hoặc khu phố chính xác; một người có thể xuất hiện ở nhiều khu vực trong kỳ.</p>
        </Panel>
        <Panel title="Khách dùng SafeMap thế nào?" subtitle="Các thao tác tại địa điểm trên bản đồ công cộng" icon="navigation">
          <div className="traffic-actions">{actions.map(([event, title, icon]) => <div key={event}><span><Icon name={icon} size={17}/>{title}</span><strong>{hasDailyData ? format(events.get(event) || 0) : '—'}</strong></div>)}</div>
          <p className="traffic-footnote">Bắt đầu ghi từ bản nâng cấp này. Bấm gọi hoặc chỉ đường phản ánh thao tác yêu cầu, không xác nhận đã gọi hay đã đến nơi.</p>
        </Panel>
      </div>
      <Panel title="Địa điểm được quan tâm" subtitle="Xếp theo số lần mở chi tiết · mỗi người có thể mở nhiều lần" icon="pin" className="traffic-places-panel">
        {report.placesStatus === 'setup' ? <div className="traffic-setup"><Icon name="settings" size={24}/><div><strong>Bật xếp hạng từng địa điểm</strong><p>Trong GA4 → Quản trị → Hiển thị dữ liệu → Định nghĩa tuỳ chỉnh → Tạo phương diện tuỳ chỉnh.</p><dl><div><dt>Tên</dt><dd>Mã địa điểm</dd></div><div><dt>Phạm vi</dt><dd>Sự kiện</dd></div><div><dt>Thông số sự kiện</dt><dd><code>place_id</code></dd></div></dl><small>Lưu rồi đợi GA4 xử lý, thường 24–48 giờ. Các phần thống kê khác vẫn dùng được.</small></div></div> : report.placesStatus === 'unavailable' ? <p className="traffic-empty">Chưa tải được xếp hạng địa điểm. Các báo cáo khác vẫn hiển thị; thử Làm mới sau.</p> : ranked.length ? <>
          <div className="traffic-places-table"><table><thead><tr><th scope="col">Địa điểm</th><th scope="col">Mở chi tiết</th><th scope="col">Chỉ đường</th><th scope="col">Bấm gọi</th><th scope="col">Lưu</th></tr></thead><tbody>{ranked.map((row, index) => { const category = row.place && getCategory(data.categories, row.place.category); return <tr key={row.id}><td><button type="button" className="traffic-place-link" disabled={!row.place || !!row.place.deletedAt || !onPoint} onClick={() => onPoint(row.id)}><span style={{ background: groupPalette[category?.kind]?.wash, color: groupPalette[category?.kind]?.ink }}>{index + 1}</span><span><strong>{row.place?.name || `Điểm ${row.id}`}</strong><small>{row.place?.deletedAt ? 'Đã chuyển vào thùng rác' : row.place?.address || 'Địa điểm không còn trong danh bạ hiện tại'}</small></span>{row.place && !row.place.deletedAt && <Icon name="right" size={15}/>}</button></td><td data-label="Mở chi tiết"><strong>{format(row.opens)}</strong></td><td data-label="Chỉ đường">{format(row.routes)}</td><td data-label="Bấm gọi">{format(row.calls)}</td><td data-label="Lưu">{format(row.saves)}</td></tr>; })}</tbody></table></div>
          {!!mapped.length && <><button type="button" className="traffic-map-toggle" onClick={() => setMapOpen(value => !value)} aria-expanded={mapOpen}><Icon name="map" size={17}/>{mapOpen ? 'Thu gọn bản đồ mức độ quan tâm' : 'Xem các địa điểm trên bản đồ'}<Icon name={mapOpen ? 'straight' : 'down'} size={15}/></button>{mapOpen && <Suspense fallback={<p className="traffic-empty">Đang mở bản đồ…</p>}><TrafficPlaceMap rows={mapped} categories={data.categories} onPoint={onPoint}/></Suspense>}</>}
        </> : <p className="traffic-empty">Chưa có tương tác địa điểm trong kỳ. Sau khi deploy, hãy mở thử chi tiết một địa điểm; báo cáo xếp hạng cần thời gian xử lý.</p>}
      </Panel>
      <Panel title="Thiết bị truy cập" subtitle="Số người dùng theo loại thiết bị" icon="layers" className="traffic-devices">
        {report.devices.length ? <div>{report.devices.map(row => <div key={row.device}><span>{deviceLabels[row.device] || label(row.device)}</span><div className="traffic-meter"><i style={{ width: `${row.users / maxDevice * 100}%` }}/></div><strong>{format(row.users)}</strong></div>)}</div> : <p className="traffic-empty">Chưa có dữ liệu thiết bị trong kỳ này.</p>}
      </Panel>
      <p className="traffic-method-note"><Icon name="info" size={17}/><span>Số liệu tổng hợp từ GA4, không cần khách tạo tài khoản. Một người có thể được tính khác nhau khi đổi thiết bị, trình duyệt hoặc xoá cookie. Dữ liệu hôm nay còn được xử lý; phần 30 phút dùng báo cáo riêng và có thể chưa khớp ngay.{report.thresholded && ' GA4 đang áp dụng ngưỡng hoặc gộp dữ liệu; một số hàng có thể bị lược bớt.'}</span></p>
    </>}
  </section>;
}
