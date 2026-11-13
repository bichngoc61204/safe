import { useEffect, useState } from 'react';

export default function TrafficDashboard({ t, lang, getIdToken }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ state: getIdToken ? 'loading' : 'demo' });

  useEffect(() => {
    if (!getIdToken) return;
    const controller = new AbortController();
    async function load() {
      try {
        const token = await getIdToken();
        if (!token) throw new Error('denied');
        const response = await fetch('/api/traffic', {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (response.status === 404 || (response.ok && response.headers.get('Content-Type')?.includes('text/html'))) {
          throw new Error('endpoint');
        }
        if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('report');
        const report = await response.json();
        if (!response.ok) throw new Error(report.error);
        const validCount=value=>Number.isSafeInteger(value)&&value>=0;
        if(!validCount(report?.views)||!validCount(report?.users)||!Array.isArray(report.days)||report.days.length>31||report.days.some(day=>{
          if(!/^\d{8}$/.test(day?.date)||!validCount(day.views))return true;
          const stamp=`${day.date.slice(0,4)}-${day.date.slice(4,6)}-${day.date.slice(6)}T00:00:00Z`;
          const parsed=Date.parse(stamp);
          return !Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10).replaceAll('-','')!==day.date;
        }))throw new Error('report');
        if (!controller.signal.aborted) setResult({ state: 'ready', report });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ state: ['endpoint', 'setup', 'denied'].includes(error.message) ? error.message : 'error' });
        }
      }
    }
    load();
    return () => controller.abort();
  }, [attempt, getIdToken]);

  const number = new Intl.NumberFormat(lang);
  const date = new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  const { state, report } = result;
  const maximum = Math.max(1, ...(report?.days.map(day => day.views) ?? []));
  const messages = {
    loading: 'trafficLoading', setup: 'trafficUnavailable', endpoint: 'trafficEndpointMissing',
    demo: 'trafficDemo', denied: 'editorDenied', error: 'trafficError',
  };

  return <section className="panel admin-traffic-panel" aria-busy={state === 'loading'}>
    <div className="panel-heading">
      <div><h2>{t('overviewTraffic')}</h2><p>{t('trafficPeriod')}</p></div>
      {getIdToken && <button type="button" className="button secondary" disabled={state === 'loading'} onClick={() => {
        setResult(previous=>({ ...previous,state:'loading' }));
        setAttempt(value => value + 1);
      }}>{t('trafficRefresh')}</button>}
    </div>
    {report ? <>
      <div className="traffic-metrics">
        <div><span>{t('trafficViews')}</span><strong>{number.format(report.views)}</strong></div>
        <div><span>{t('trafficUsers')}</span><strong>{number.format(report.users)}</strong></div>
      </div>
      {report.views > 0 && report.days.length ? <ol className="traffic-bars" aria-label={t('trafficDaily')}>
        {report.days.map(day => {
          const label = date.format(new Date(`${day.date.slice(0, 4)}-${day.date.slice(4, 6)}-${day.date.slice(6)}T00:00:00Z`));
          return <li key={day.date}>
            <span>{number.format(day.views)}</span>
            <i aria-hidden="true"><b style={{ height: `${day.views / maximum * 100}%` }}/></i>
            <time dateTime={`${day.date.slice(0, 4)}-${day.date.slice(4, 6)}-${day.date.slice(6)}`}>{label}</time>
          </li>;
        })}
      </ol> : <p className="traffic-message" role="status">{t('trafficEmpty')}</p>}
    </> : <>
      <p className="traffic-message" role="status">{t(messages[state])}</p>
      {state==='loading'&&<div className="traffic-metrics traffic-skeleton" aria-hidden="true"><div/><div/></div>}
    </>}
  </section>;
}
