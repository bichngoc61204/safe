import { haversine } from './domain.js';

const stepsByRoute=new WeakMap();

export function routeSteps(route) {
  if(!stepsByRoute.has(route)){
    const legs=Array.isArray(route.legs)?route.legs:[];
    const steps=legs.flatMap(leg=>Array.isArray(leg?.steps)?leg.steps:[]).filter(step=>step?.maneuver);
    stepsByRoute.set(route,steps);
  }
  return stepsByRoute.get(route);
}

export function routeProgress(route, position, {includeCoordinates=true}={}) {
  const scale = Math.cos(position.lat * Math.PI / 180);
  let nearest = Infinity;
  let traveled = 0;
  let distanceAlong = 0;
  let segmentEnd = 1;
  let segmentFraction = 0;
  let snapped = route.geometry.coordinates[0];
  const points = route.geometry.coordinates;
  for (let i = 1; i < points.length; i++) {
    const [startLng,startLat]=points[i-1];
    const [endLng,endLat]=points[i];
    const x=(startLng-position.lng)*scale*111195;
    const y=(startLat-position.lat)*111195;
    const dx=(endLng-startLng)*scale*111195;
    const dy=(endLat-startLat)*111195;
    const length = Math.hypot(dx, dy);
    if (!length) continue;
    const fraction = Math.max(0, Math.min(1, -(x * dx + y * dy) / (length * length)));
    const distance = Math.hypot(x + fraction * dx, y + fraction * dy);
    if (distance < nearest) {
      nearest = distance;
      traveled = distanceAlong + length * fraction;
      segmentEnd = i;
      segmentFraction = fraction;
      if(includeCoordinates)snapped=[startLng+(endLng-startLng)*fraction,startLat+(endLat-startLat)*fraction];
    }
    distanceAlong += length;
  }

  const steps = routeSteps(route);
  let nextTurn = 0;
  let index = 0;
  // Maneuver distances follow the provider's route length, so scale the projected geometry to match.
  const progress = distanceAlong ? traveled / distanceAlong * route.distance : 0;
  while (index < steps.length - 1 && progress >= nextTurn + (steps[index].distance || 0)) {
    nextTurn += steps[index].distance || 0;
    index++;
  }
  const [lng, lat] = points.at(-1);
  const arrived = progress >= route.distance - 25 && haversine(position, {lat,lng}) < 25;
  return {
    distance: nearest, index, progress, arrived, segmentEnd, segmentFraction,
    remainingDistance: arrived ? 0 : Math.max(0, route.distance - progress),
    ...(includeCoordinates&&{remainingCoordinates:arrived?[]:[snapped,...points.slice(segmentEnd)]}),
  };
}
