import L from 'leaflet';

export function routeShape(route) {
  if (!route) return null;
  const points = route.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + points[i - 1].distanceTo(points[i]));
  }
  return { points, distances, length: distances.at(-1) };
}

export function routeTarget(shape, progress) {
  if (progress?.arrived) return shape.length;
  if (!progress) return 0;
  const { segmentEnd, segmentFraction } = progress;
  const start = shape.distances[segmentEnd - 1];
  const target=start+(shape.distances[segmentEnd]-start)*segmentFraction;
  return Number.isFinite(target)?Math.max(0,Math.min(shape.length,target)):0;
}

export function blendPosition(from, to, amount) {
  return L.latLng(from.lat + (to.lat - from.lat) * amount, from.lng + (to.lng - from.lng) * amount);
}

export function sampleRoute(shape, distance) {
  const { points, distances, length } = shape;
  if (distance >= length) return { point: points.at(-1), segmentEnd: points.length };
  let low = 1;
  let high = points.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (distances[middle] <= distance) low = middle + 1;
    else high = middle;
  }
  const start = distances[low - 1];
  const point = blendPosition(points[low - 1], points[low], (distance - start) / (distances[low] - start));
  return { point, segmentEnd: low };
}
