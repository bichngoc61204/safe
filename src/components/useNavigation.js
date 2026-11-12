import { useCallback, useEffect, useState } from 'react';
import { fetchRoute } from '../lib/routing';
import { routeProgress } from '../lib/navigation';
import { haversine } from '../lib/domain';

export default function useNavigation(preview, destination, mode) {
  const [started, setStarted] = useState(null);
  const enabled = Boolean(preview && started === preview);
  const [following, setFollowing] = useState(false);
  const [position, setPosition] = useState(null);
  const [route, setRoute] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState(null);
  const [gpsAttempt,setGpsAttempt] = useState(0);
  const pause = useCallback(() => setFollowing(false), []);

  useEffect(() => {
    if (!enabled) return;
    const gps = navigator.geolocation;
    if (!gps?.watchPosition) {
      setStatus('navigationGpsError');
      return;
    }

    let currentRoute = route || preview;
    let currentStep = step;
    let acceptedProgress = remaining?.progress || 0;
    let offRouteSamples = 0;
    let lastReroute = 0;
    let lastFixTime = 0;
    let displayedFix;
    let request;
    let active = true;
    const watch = gps.watchPosition(async ({coords,timestamp}) => {
      if (!active) return;
      if(timestamp&&timestamp<=lastFixTime)return;
      if(timestamp)lastFixTime=timestamp;
      const {latitude:lat,longitude:lng,accuracy}=coords;
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||
         !Number.isFinite(accuracy)||accuracy<0||accuracy>65){
        offRouteSamples = 0;
        if (!request) setStatus('navigationWaiting');
        return;
      }
      const point={lat,lng};
      const progress=routeProgress(currentRoute,point,{includeCoordinates:false});
      const matched=progress.distance<=Math.min(20,Math.max(8,accuracy));
      if(!displayedFix||displayedFix.matched!==matched||haversine(displayedFix,point)>=1.5||progress.arrived){
        displayedFix={...point,matched};
        setPosition(displayedFix);
      }
      if (progress.arrived && accuracy <= 30) {
        active = false;
        request?.abort();
        gps.clearWatch(watch);
        setRemaining({arrived:true,remainingDistance:0});
        setStep(progress.index);
        setStatus('navigationArrived');
        return;
      }

      if (progress.distance <= Math.max(40, accuracy * 1.5)) {
        offRouteSamples = 0;
        if (request) {
          request.abort();
          request = null;
        }
        setStatus(null);
        if (progress.progress >= acceptedProgress+1.5) {
          acceptedProgress = progress.progress;
          setRemaining(progress);
        }
        currentStep = Math.max(currentStep, progress.index);
        setStep(currentStep);
        return;
      }

      if (++offRouteSamples < 2 || request || Date.now() - lastReroute < 15000) return;
      lastReroute = Date.now();
      const controller = new AbortController();
      request = controller;
      const deadline = setTimeout(() => controller.abort(), 12000);
      setStatus('navigationRerouting');
      try {
        const next = await fetchRoute(point, destination, mode, controller.signal);
        if (active && request === controller) {
          if(controller.signal.aborted){setStatus('navigationRerouteError');return;}
          if (next) {
            currentRoute = next;
            currentStep = 0;
            acceptedProgress = 0;
            setRemaining(null);
            offRouteSamples = 0;
            setRoute(next);
            setStep(0);
          }
          setStatus(next ? null : 'navigationRerouteError');
        }
      } catch {
        if (active && request === controller) setStatus('navigationRerouteError');
      } finally {
        clearTimeout(deadline);
        if (request === controller) request = null;
      }
    }, error => {
      if (!active)return;
      if(error.code===1){
        active=false;
        request?.abort();
        gps.clearWatch(watch);
      }
      setStatus(error.code===1?'navigationGpsError':'navigationWaiting');
    }, {enableHighAccuracy:true, maximumAge:3000, timeout:15000});

    return () => {
      active = false;
      gps.clearWatch(watch);
      request?.abort();
    };
  }, [enabled, preview, destination, mode,gpsAttempt]);

  function stop() {
    setStarted(null);
    setFollowing(false);
    setPosition(null);
    setRoute(null);
    setRemaining(null);
    setStep(0);
    setStatus(null);
  }

  return {
    active: enabled,
    route: enabled && route ? route : preview,
    position, step, status, following,
    remaining: enabled ? remaining : null,
    start: () => {
      stop();
      setStatus('navigationWaiting');
      setFollowing(true);
      setStarted(preview);
    },
    stop,
    pause,
    resume: () => {
      setFollowing(true);
      if(status==='navigationGpsError'){
        setStatus('navigationWaiting');
        setGpsAttempt(attempt=>attempt+1);
      }
    },
  };
}
