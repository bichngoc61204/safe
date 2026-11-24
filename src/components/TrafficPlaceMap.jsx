import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { addBasemap } from '../lib/basemap';
import { addArchipelagoLayer } from '../lib/archipelagos';
import { CENTER } from '../lib/mapCenter';
import { getCategory } from '../lib/domain';
import { groupPalette } from '../lib/catalogGroups';

export default function TrafficPlaceMap({ rows, categories, onPoint }) {
  const container = useRef(null);
  const mapRef = useRef(null), layerRef = useRef(null), fitted = useRef(false), openPoint = useRef(onPoint);
  openPoint.current = onPoint;
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    const map = L.map(container.current, { center: CENTER, zoom: 14, scrollWheelZoom: false, attributionControl: true, zoomControl: false });
    L.control.zoom({ position: 'topright', zoomInTitle: 'Phóng to', zoomOutTitle: 'Thu nhỏ' }).addTo(map);
    const stopBasemap = addBasemap(map, { style: 'light', onStatus: next => { if (!disposed) setStatus(next); } });
    const stopIslands = addArchipelagoLayer(map, 'vi');
    mapRef.current = map; layerRef.current = L.layerGroup().addTo(map); fitted.current = false;
    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resize.observe(container.current);
    map.invalidateSize({ animate: false });
    return () => { disposed = true; resize.disconnect(); stopIslands(); stopBasemap(); map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);
  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const highest = Math.max(1, ...rows.map(row => row.opens));
    const points = [];
    for (const row of rows) {
      const { place } = row;
      if (Math.abs(place.lat) > 85 || Math.abs(place.lng) > 180) continue;
      const category = getCategory(categories, place.category);
      const color = groupPalette[category?.kind]?.ink || '#176044';
      const circle = L.circleMarker([place.lat, place.lng], { radius: 8 + Math.sqrt(row.opens / highest) * 16, color, fillColor: color, fillOpacity: .35, weight: 2 }).addTo(layer);
      const popup = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = place.name;
      const count = document.createElement('p'); count.textContent = `${row.opens.toLocaleString('vi')} lần mở chi tiết`;
      popup.append(title, count);
      if (openPoint.current) { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Xem địa điểm'; button.addEventListener('click', () => openPoint.current?.(place.id)); popup.append(button); }
      circle.bindPopup(popup);
      points.push([place.lat, place.lng]);
    }
    if (!fitted.current && points.length) {
      if (points.length > 1) map.fitBounds(points, { padding: [35, 35], maxZoom: 15 });
      else map.setView(points[0], 15);
      fitted.current = true;
    }
  }, [rows, categories]);
  return <figure className="traffic-interest-map"><div ref={container} className="leaflet-map" role="region" aria-label="Bản đồ địa điểm được quan tâm"/>{['loading', 'error'].includes(status) && <span className="traffic-map-status">{status === 'error' ? 'Nền bản đồ chưa tải được; xem danh sách phía trên.' : 'Đang tải nền bản đồ…'}</span>}<figcaption>Vòng tròn lớn hơn = nhiều lần mở hơn. Đây là vị trí các địa điểm, không phải vị trí của khách.</figcaption></figure>;
}
