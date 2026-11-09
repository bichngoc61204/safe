import L from 'leaflet';

function rotatePoint(point, angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return L.point(point.x * cos - point.y * sin, point.x * sin + point.y * cos);
}

export function addMapRotation(map, viewport, frame, onBearing) {
  let bearing = 0;
  let gesture;
  let animation = 0;
  const defaultMousePoint = map.mouseEventToContainerPoint;
  const draggable = map.dragging._draggable;
  const measure = touches => {
    const dx=touches[1].clientX-touches[0].clientX;
    const dy=touches[1].clientY-touches[0].clientY;
    const a=map.mouseEventToContainerPoint(touches[0]);
    const b=map.mouseEventToContainerPoint(touches[1]);
    return {distance:Math.hypot(dx,dy),angle:Math.atan2(dy,dx),midpoint:a.add(b).divideBy(2)};
  };

  const screenToMap = offset => rotatePoint(L.point(offset), -bearing);

  function resize() {
    const { clientWidth, clientHeight } = frame;
    const size = bearing ? Math.ceil(Math.hypot(clientWidth, clientHeight)) + 2 : 0;
    viewport.style.setProperty('--rotation-size', size ? `${size}px` : '');
    map.invalidateSize({ debounceMoveend: true });
  }

  function setBearing(next) {
    const changed=Boolean(bearing)!==Boolean(next);
    bearing=next;
    viewport.style.setProperty('--map-bearing', `${bearing}rad`);
    if (changed) resize();
    onBearing(bearing);
  }

  function drawZoom(zoom, midpoint) {
    const offset=midpoint.subtract(map.getSize().divideBy(2));
    const center=map.unproject(map.project(gesture.anchor,zoom).subtract(offset),zoom);
    map._move(center,zoom,{pinch:true,round:false});
  }

  function draw() {
    animation=0;
    if (gesture.mode==='rotate') setBearing(gesture.bearing+gesture.rotation);
    else drawZoom(gesture.zoom,gesture.midpoint);
  }

  function start(event) {
    if (event.touches.length!==2 || gesture) return;
    const initial=measure(event.touches);
    if(initial.distance<1)return;
    event.preventDefault();
    map.stop();
    gesture={
      initial,bearing,startZoom:map.getZoom(),
      anchor:map.containerPointToLatLng(initial.midpoint),
    };
    map.fire('gesturestart');
  }

  function move(event) {
    if (!gesture || event.touches.length!==2) return;
    event.preventDefault();
    const current=measure(event.touches);
    if(current.distance<1)return;
    const ratio=current.distance/gesture.initial.distance;
    const angle=current.angle-gesture.initial.angle;
    const rotation=Math.atan2(Math.sin(angle),Math.cos(angle));
    if (!gesture.mode) {
      const zoomIntent=Math.abs(Math.log(ratio))/.075;
      const rotateIntent=Math.abs(rotation)/.17;
      if (zoomIntent<1 && rotateIntent<1)return;
      gesture.mode=rotateIntent>=1&&rotateIntent>zoomIntent*1.2?'rotate':'zoom';
      if(gesture.mode==='zoom')map._moveStart(true,false);
    }
    gesture.rotation=rotation;
    gesture.zoom=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),map.getScaleZoom(ratio,gesture.startZoom)));
    gesture.midpoint=current.midpoint;
    if(!animation)animation=requestAnimationFrame(draw);
  }

  function end(event) {
    if (!gesture || event.type!=='touchcancel'&&event.touches.length===2) return;
    if(animation){cancelAnimationFrame(animation);draw();}
    if(gesture.mode==='zoom'){
      drawZoom(map._limitZoom(gesture.zoom),gesture.midpoint);
      map._moveEnd(true);
    }
    gesture=null;
  }

  function reset() {
    setBearing(0);
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
  viewport.addEventListener('touchstart', start, { capture: true, passive: false });
  document.addEventListener('touchmove', move, { capture: true, passive: false });
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
