export const routeModes = ['motor_scooter', 'foot', 'bike', 'car'];

export async function fetchRoute(origin, destination, mode, signal) {
  const points = [origin, destination];
  const scooter = mode === 'motor_scooter';
  const coordinates = points.map(point => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`).join(';');
  const params = new URLSearchParams({
    json: JSON.stringify({
      locations: points.map(({lat,lng})=>({lat,lon:lng})),
      costing: 'motor_scooter',
      format: 'osrm',
      shape_format: 'geojson',
      directions_type: 'maneuvers',
    }),
  });
  const url = scooter
    ? `https://valhalla1.openstreetmap.de/route?${params}`
    : `https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;
  const response = await fetch(url, {
    signal,
    headers: scooter ? {'X-Client-Id':'safemap-an-thuong'} : undefined,
  });
  const result = await response.json();
  if (result.code === 'NoRoute' || result.code === 'NoSegment' ||
      (scooter && [170,171,442].includes(result.error_code))) return null;
  const route = result.routes?.[0];
  const shape=route?.geometry?.coordinates;
  if (!response.ok || result.code !== 'Ok' || route?.geometry?.type !== 'LineString' ||
      !Array.isArray(shape) || shape.length < 2 ||
      !shape.every(point=>Array.isArray(point)&&Number.isFinite(point[0])&&Math.abs(point[0])<=180&&Number.isFinite(point[1])&&Math.abs(point[1])<=90) ||
      !shape.some(point=>point[0]!==shape[0][0]||point[1]!==shape[0][1]) ||
      !Number.isFinite(route.distance) || route.distance<0 || !Number.isFinite(route.duration) || route.duration<0) {
    throw new Error('Invalid routing response');
  }
  return route;
}
