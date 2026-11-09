import L from 'leaflet';

function rotatePoint(point, angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return L.point(point.x * cos - point.y * sin, point.x * sin + point.y * cos);
}

export function addMapRotation(map, viewport, frame, onBearing) {
  let bearing = 0;
  let gesture;
  let pendingBearing = 0;
  let animation = 0;
  const defaultMousePoint = map.mouseEventToContainerPoint;
  const draggable = map.dragging._draggable;
  const angle = touches => Math.atan2(touches[1].clientY - touches[0].clientY, touches[1].clientX - touches[0].clientX);

  const screenToMap = offset => rotatePoint(L.point(offset), -bearing);

  function resize() {
    const { clientWidth, clientHeight } = frame;
    const size = bearing ? Math.ceil(Math.hypot(clientWidth, clientHeight)) + 2 : 0;
    viewport.style.setProperty('--rotation-size', size ? `${size}px` : '');
    map.invalidateSize({ debounceMoveend: true });
  }

  function draw() {
    animation = 0;
    const next = Math.atan2(Math.sin(pendingBearing), Math.cos(pendingBearing));
    const resizeNeeded = Boolean(bearing) !== Boolean(next);
    bearing = next;
    viewport.style.setProperty('--map-bearing', `${bearing}rad`);
    if (resizeNeeded) resize();
    onBearing(bearing);
  }

  function start(event) {
    if (event.touches.length !== 2 || gesture) return;
    const firstAngle = angle(event.touches);
    gesture = { firstAngle, bearing, rotating: false };
    map.fire('gesturestart');
    // Leaflet's pinch handler stops the running pan and keeps zoom centered.
  }

  function move(event) {
    if (!gesture || event.touches.length !== 2) return;
    const delta = angle(event.touches) - gesture.firstAngle;
    if (!gesture.rotating && Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) < .065) return;
    gesture.rotating = true;
    pendingBearing = gesture.bearing + delta;
    if (!animation) animation = requestAnimationFrame(draw);
  }

  function end(event) {
    if (!gesture || event.touches.length === 2) return;
    gesture = null;
  }

  function reset() {
    cancelAnimationFrame(animation);
    pendingBearing = 0;
    draw();
  }

  function adjustDrag() {
    if (!bearing) return;
    // Leaflet mistakes the rotated bounding box for CSS scaling.
    const start = draggable._startPos;
    const offset = draggable._newPos.subtract(start).scaleBy(draggable._parentScale);
    draggable._newPos = start.add(screenToMap(offset));
  }

  map.mouseEventToContainerPoint = function (event) {
    if (!bearing) return defaultMousePoint.call(this, event);
    const bounds = frame.getBoundingClientRect();
    const offset = [event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2];
    return map.getSize().divideBy(2).add(screenToMap(offset));
  };

  draggable?.on('predrag', adjustDrag);
  viewport.addEventListener('touchstart', start, { capture: true, passive: true });
  document.addEventListener('touchmove', move, { capture: true, passive: true });
  document.addEventListener('touchend', end, true);
  document.addEventListener('touchcancel', end, true);
  const observer = new ResizeObserver(resize);
  observer.observe(frame);

  return {
    screenToMap,
    bearing: () => bearing,
    reset,
    destroy() {
      observer.disconnect();
      cancelAnimationFrame(animation);
      draggable?.off('predrag', adjustDrag);
      map.mouseEventToContainerPoint = defaultMousePoint;
      viewport.removeEventListener('touchstart', start, true);
      document.removeEventListener('touchmove', move, true);
      document.removeEventListener('touchend', end, true);
      document.removeEventListener('touchcancel', end, true);
    },
  };
}

export function fitRotatedRoute(map, rotation, frame, points, topLeft, bottomRight) {
  const zoom = map.getZoom();
  const bounds = L.bounds(points.map(point => rotatePoint(map.project(point, zoom), rotation.bearing())));
  const size = L.point(frame.clientWidth, frame.clientHeight).subtract(topLeft).subtract(bottomRight);
  if (size.x <= 0 || size.y <= 0) return false;
  const extent = bounds.getSize();
  const scale = Math.min(size.x / extent.x, size.y / extent.y);
  const nextZoom = Math.max(map.getMinZoom(), Math.min(17, Math.floor(map.getScaleZoom(scale, zoom))));
  const offset = rotation.screenToMap(L.point(bottomRight).subtract(topLeft).divideBy(2));
  const center = rotation.screenToMap(bounds.getCenter()).multiplyBy(map.getZoomScale(nextZoom, zoom)).add(offset);
  map.setView(map.unproject(center, nextZoom), nextZoom, { animate: false });
  return true;
}
