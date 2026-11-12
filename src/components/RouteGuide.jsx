import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Dropdown from './Dropdown';
import { formatDistance, markerColor } from '../lib/domain';
import { routeModes } from '../lib/routing';
import { routeSteps, upcomingManeuver } from '../lib/navigation';
import { roadName } from '../lib/locale';

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

function maneuverIcon(step) {
  const { type, modifier } = step?.maneuver || {};
  if (type === 'arrive') return 'arrival';
  if (['roundabout','rotary','roundabout turn'].includes(type)) return 'roundabout';
  if (modifier === 'uturn') return 'uturn';
  if (modifier?.endsWith('left')) return 'turnLeft';
  if (modifier?.endsWith('right')) return 'turnRight';
  return 'straight';
}

export default function RouteGuide({route, mode, destination, destinationCategory, navigation, onExit, onModeChange, t, lang}) {
  const [{index:previewIndex,direction}, setStep] = useState({index:0,direction:1});
  const [clock,setClock] = useState(Date.now);
  const root = useRef(null), banner = useRef(null), dock = useRef(null);
  const mobileCopy = useRef(null), previousManeuver = useRef(null);
  const steps = routeSteps(route);
  const index = Math.min(navigation.active ? navigation.step : previewIndex, Math.max(0,steps.length-1));
  const step = steps[index];
  const distance = navigation.remaining?.remainingDistance ?? route.distance;
  const arrived = navigation.status === 'navigationArrived';
  const guidancePending = navigation.active && Boolean(navigation.status) && !arrived;
  const duration = route.distance > 0 ? route.duration * Math.min(1,distance / route.distance) : route.duration;
  const estimate = arrived ? 0 : Math.max(1, Math.ceil(duration / 60));
  const eta = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {hour:'2-digit',minute:'2-digit'}).format(clock + duration * 1000);
  const categoryColor = destinationCategory ? markerColor(destinationCategory) : '#287754';
  const upcoming = navigation.active ? upcomingManeuver(route,navigation.remaining?.progress || 0,index) : {step,distance:step?.distance || 0};
  const maneuver = arrived ? {maneuver:{type:'arrive'}} : upcoming.step;
  const turnDistance = arrived ? 0 : maneuver ? upcoming.distance : distance;
  const turnInstruction = maneuver ? instruction(maneuver,t) : t('maneuver_continue');
  const turnRoad = roadName(maneuver?.name,lang) || (arrived ? destination : t('routeFollowRoad'));
  const progress = route.distance > 0 ? 1 - distance / route.distance : 0;
  const maneuverKey = [maneuver?.maneuver.type,maneuver?.maneuver.modifier,maneuver?.maneuver.exit,turnRoad,guidancePending].join('|');

  useEffect(()=>{
    const previous=previousManeuver.current;
    previousManeuver.current=maneuverKey;
    if(previous===null||previous===maneuverKey||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const animations=Array.from(mobileCopy.current?.querySelectorAll('.route-turn-label,.route-turn-road')||[]).map((element,index)=>
      element.animate?.([{opacity:0,transform:'translateX(6px)'},{opacity:1,transform:'translateX(0)'}],
        {duration:380,delay:index*45,easing:'cubic-bezier(.22,.7,.25,1)',fill:'backwards'}));
    return ()=>animations.forEach(animation=>animation?.cancel());
  },[maneuverKey]);

  useEffect(()=>{
    if(!navigation.active)return;
    const timer=setInterval(()=>setClock(Date.now()),30000);
    return ()=>clearInterval(timer);
  },[navigation.active]);

  useLayoutEffect(()=>{
    const stage = root.current.closest('.map-stage');
    if(!stage)return;
    const measure=()=>{
      stage.style.setProperty('--route-dock-height',`${dock.current.offsetHeight}px`);
      stage.style.setProperty('--route-banner-height',`${banner.current.offsetHeight}px`);
    };
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(dock.current);
    observer.observe(banner.current);
    return ()=>{
      observer.disconnect();
      stage.style.removeProperty('--route-dock-height');
      stage.style.removeProperty('--route-banner-height');
    };
  },[]);

  return <section ref={root} className="route-guide route-navigation" data-active={navigation.active} data-arrived={arrived} data-pending={guidancePending} aria-label={t('routeOnMap')}>
    <div ref={banner} className="route-guide-step">
      <span className="route-direction-icon"><Icon name={guidancePending?'locate':maneuverIcon(maneuver)} size={36}/></span>
      <div className="route-step-copy" aria-live="polite" aria-atomic="true">
        <div className="route-step-text route-desktop-step" key={index} style={{'--step-enter':direction>0?'12px':'-12px'}}>
          <strong>{step?instruction(step,t):t('routeOnMap')}</strong>
          {step&&<span>{[roadName(step.name,lang), step.distance > 0 && formatDistance(step.distance)].filter(Boolean).join(' · ')}</span>}
        </div>
        <div ref={mobileCopy} className="route-mobile-maneuver">
          <span className="route-turn-label">{guidancePending?t(navigation.status):arrived?t('navigationArrived'):turnInstruction}</span>
          <strong className="route-turn-distance">{guidancePending?'—':formatDistance(turnDistance).replace(/(km|m)$/,' $1')}</strong>
          <span className="route-turn-road" title={guidancePending?t('routeUpdatingGuidance'):turnRoad}>{guidancePending?t('routeUpdatingGuidance'):turnRoad}</span>
        </div>
      </div>
      {!navigation.active&&steps.length>1&&<div className="route-step-controls">
        <button type="button" aria-label={t('routePrevStep')} disabled={index===0} onClick={()=>setStep({index:index-1,direction:-1})}><Icon name="left" size={17}/></button>
        <span>{index+1}/{steps.length}</span>
        <button type="button" aria-label={t('routeNextStep')} disabled={index===steps.length-1} onClick={()=>setStep({index:index+1,direction:1})}><Icon name="right" size={17}/></button>
      </div>}
    </div>
    <div ref={dock} className="route-trip-footer">
      <div className="route-trip-metrics" aria-label={t('routeTripSummary')}>
        <span className="route-trip-duration"><strong>{estimate}</strong> {t('routeMinutes')}</span>
        <span className="route-remaining-distance">{formatDistance(distance)}</span>
      </div>
      <div className="route-guide-heading">
        <span className="route-guide-icon" style={{color:categoryColor,background:categoryColor+'13'}}>
          <Icon name={destinationCategory?.icon || 'pin'} size={18}/>
        </span>
        <div className="route-guide-title">
          <strong title={destination}>{destination}</strong>
          <span>{t(`route_${mode}`)} · {t(navigation.active?'routeJourneyActive':'routePreview')}</span>
        </div>
        <button className="route-exit" type="button" onClick={onExit} aria-label={t('routeExit')} title={t('routeExit')}>
          <Icon name="x" size={18}/><span>{t('routeExit')}</span>
        </button>
      </div>
      {!navigation.active&&<div className="route-navigation-actions">
          <Dropdown className="route-mode-picker" triggerClass="route-mode-trigger" menuClass="route-mode-options" compact value={mode} onChange={onModeChange} label={t('routeMode')}>
            {routeModes.map(id=><option key={id} value={id}>{t(`route_${id}`)}</option>)}
          </Dropdown>
          <button className="button primary" type="button" onClick={navigation.start}><Icon name="navigation" size={17}/>{t('navigationStart')}</button>
      </div>}
      <div className="route-trip-bottom">
        {navigation.active&&<span className="route-live-status" role="status"><i/>{t(navigation.status || 'routeJourneyActive')}</span>}
        <span className="route-trip-eta"><small>{t('routeExpectedArrival')}</small><time>{eta}</time></span>
      </div>
      <div className="route-progress" aria-hidden="true"><span style={{'--step-progress':Math.max(0,Math.min(1,progress))}}/></div>
    </div>
  </section>;
}
