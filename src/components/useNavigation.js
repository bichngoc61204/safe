import { useCallback, useEffect, useState } from 'react';
import { fetchRoute } from '../lib/routing';
import { routeProgress } from '../lib/navigation';

export default function useNavigation(preview, destination, mode) {
  const [started, setStarted] = useState(null);
  const enabled = Boolean(preview && started === preview);
  const [following, setFollowing] = useState(false);
  const [position, setPosition] = useState(null);
  const [route, setRoute] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState(null);
  const pause = useCallback(() => setFollowing(false), []);

  useEffect(() => {
    if (!enabled) return;
    const gps = navigator.geolocation;
    if (!gps?.watchPosition) {
      setStatus('navigationGpsError');
      return;
    }

    let currentRoute = preview;
    let currentStep = 0;
    let acceptedProgress = 0;
    let offRouteSamples = 0;
    let lastReroute = 0;
    let request;
    let active = true;
    const watch = gps.watchPosition(async ({coords}) => {
      if (!active) return;
      if (coords.accuracy > 65) {
        offRouteSamples = 0;
        if (!request) setStatus('navigationWaiting');
        return;
      }
      const point = {lat: coords.latitude, lng: coords.longitude};
      const progress = routeProgress(currentRoute, point);
      setPosition({...point, matched: progress.distance <= Math.min(20, Math.max(8, coords.accuracy))});
      if (progress.arrived && coords.accuracy <= 30) {
        active = false;
        request?.abort();
        gps.clearWatch(watch);
        setRemaining({arrived:true,remainingCoordinates:[],remainingDistance:0});
        setStep(progress.index);
        setStatus('navigationArrived');
        return;
      }

      if (progress.distance <= Math.max(40, coords.accuracy * 1.5)) {
        offRouteSamples = 0;
        if (request) {
          request.abort();
          request = null;
        }
        setStatus(null);
        if (progress.progress > acceptedProgress) {
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
        if (active && request === controller && !controller.signal.aborted) {
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
      if (active) setStatus(error.code === 1 ? 'navigationGpsError' : 'navigationWaiting');
    }, {enableHighAccuracy:true, maximumAge:3000, timeout:15000});

    return () => {
      active = false;
      gps.clearWatch(watch);
      request?.abort();
    };
  }, [enabled, preview, destination, mode]);

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
    resume: () => setFollowing(true),
  };
}
