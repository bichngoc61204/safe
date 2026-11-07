import { useState } from 'react';
import Icon from './Icon';
import { formatDistance } from '../lib/domain';
import { routeModes } from '../lib/routing';

function instruction(step, t) {
  const { type, modifier, exit } = step.maneuver;
  if (type === 'depart' || type === 'arrive') return t(`maneuver_${type}`);
  if (['roundabout', 'rotary', 'roundabout turn'].includes(type)) {
    return Number.isInteger(exit) ? `${t('maneuver_roundabout')} ${exit}` : t('maneuver_circle');
  }
  if (modifier === 'uturn') return t('maneuver_uturn');
  if (modifier?.endsWith('left')) return t('maneuver_left');
  if (modifier?.endsWith('right')) return t('maneuver_right');
  return t('maneuver_continue');
}

export default function RouteGuide({route, mode, destination, navigation, onExit, onModeChange, t}) {
  const [{index:previewIndex,direction}, setStep] = useState({index:0,direction:1});
  const steps = (route.legs || []).flatMap(leg => leg.steps || []).filter(step => step.maneuver);
  const index = navigation.active ? navigation.step : previewIndex;
  const step = steps[index];
  const distance = navigation.remaining?.remainingDistance ?? route.distance;
  const estimate = Math.max(1, Math.round(route.duration / 60));
  const canResume = navigation.active && !navigation.following && navigation.status !== 'navigationArrived';

  return <section className="route-guide" aria-label={t('routeOnMap')}>
    <div className="route-guide-heading">
      <span className="route-guide-icon"><Icon name="navigation" size={19}/></span>
      <div className="route-guide-title">
        <strong>{destination}</strong>
        <span>{t(`route_${mode}`)} · {navigation.active ? <>{t('routeRemaining')} <b className="route-remaining-distance">{formatDistance(distance)}</b></> : <>{formatDistance(distance)} · {estimate} {t('routeMinutes')}</>}</span>
      </div>
      <button className="route-exit" type="button" onClick={onExit}>
        <Icon name="x" size={15}/><span>{t('routeExit')}</span>
      </button>
    </div>
    {(step||navigation.active)&&<div className="route-guide-step">
      <div className="route-step-copy" aria-live="polite" aria-atomic="true">
        <div className="route-step-text" key={index} style={{'--step-enter':direction>0?'12px':'-12px'}}>
          <strong>{step?instruction(step,t):t('routeOnMap')}</strong>
          {step&&<span>{[step.name, step.distance > 0 && formatDistance(step.distance)].filter(Boolean).join(' · ')}</span>}
        </div>
      </div>
      {!navigation.active&&steps.length>1&&<div className="route-step-controls">
        <button type="button" aria-label={t('routePrevStep')} disabled={index===0} onClick={()=>setStep({index:index-1,direction:-1})}><Icon name="left" size={17}/></button>
        <span>{index+1}/{steps.length}</span>
        <button type="button" aria-label={t('routeNextStep')} disabled={index===steps.length-1} onClick={()=>setStep({index:index+1,direction:1})}><Icon name="right" size={17}/></button>
      </div>}
      {canResume&&<button className="route-resume" type="button" aria-label={t('navigationResume')} title={t('navigationResume')} onClick={navigation.resume}>
        <Icon name="locate" size={19}/>
      </button>}
    </div>}
    <div className="route-navigation-actions">
      {!navigation.active&&<>
        <select className="route-mode-select" aria-label={t('routeMode')} value={mode} onChange={e=>onModeChange(e.target.value)}>
          {routeModes.map(id=><option key={id} value={id}>{t(`route_${id}`)}</option>)}
        </select>
        <button className="button primary" type="button" onClick={navigation.start}>{t('navigationStart')}</button>
      </>}
      {navigation.active&&navigation.status&&<span role="status">{t(navigation.status)}</span>}
    </div>
    {steps.length>1&&<div className="route-progress" aria-hidden="true"><span style={{'--step-progress':(index+1)/steps.length}}/></div>}
  </section>;
}
