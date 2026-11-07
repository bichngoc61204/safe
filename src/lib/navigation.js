import { haversine } from './domain.js';

export function routeProgress(route, position) {
  const scale = Math.cos(position.lat * Math.PI / 180);
  let nearest = Infinity;
  let traveled = 0;
  let distanceAlong = 0;
  let segmentEnd = 1;
  let snapped = route.geometry.coordinates[0];
  const points = route.geometry.coordinates;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]].map(([lng, lat]) => ({
      x: (lng - position.lng) * scale * 111195,
      y: (lat - position.lat) * 111195,
    }));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (!length) continue;
    const fraction = Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / (length * length)));
    const distance = Math.hypot(a.x + fraction * dx, a.y + fraction * dy);
    if (distance < nearest) {
      nearest = distance;
      traveled = distanceAlong + length * fraction;
      segmentEnd = i;
      const [startLng, startLat] = points[i - 1];
      const [endLng, endLat] = points[i];
      snapped = [startLng + (endLng - startLng) * fraction, startLat + (endLat - startLat) * fraction];
    }
    distanceAlong += length;
  }

  const steps = (route.legs || []).flatMap(leg => leg.steps || []).filter(step => step.maneuver);
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
    distance: nearest, index, progress, arrived,
    remainingDistance: arrived ? 0 : Math.max(0, route.distance - progress),
    remainingCoordinates: arrived ? [] : [snapped, ...points.slice(segmentEnd)],
  };
}
