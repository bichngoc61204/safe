import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import Icon from './Icon';
import { CENTER } from '../lib/data';
import { getCategory, markerColor } from '../lib/domain';
import { addBasemap, DEFAULT_MAP_STYLE } from '../lib/basemap';
import { addCollapsibleAttribution } from '../lib/attribution';
import { addArchipelagoLayer } from '../lib/archipelagos';
import { blendPosition, routeShape, routeTarget, sampleRoute } from '../lib/mapMotion';
import { addMapRotation, fitRotatedRoute } from '../lib/mapRotation';

function pinIcon(category,selected=false,status='active') {
  const label=category.name||'Location';
  return L.divIcon({
    className:'custom-marker',
    html:renderToStaticMarkup(<div className={`marker-pin marker-${category.kind} ${selected?'selected':''} ${['warning','overloaded'].includes(status)?'marker-alert':''}`} style={{'--marker-color':markerColor(category)}}><Icon name={category.icon||'pin'} size={19}/><span className="sr-only">{label}</span></div>),
    iconSize:[42,46],iconAnchor:[21,40],popupAnchor:[0,-34],
  });
}
const zoomIcons = {
  zoomInText: renderToStaticMarkup(<Icon name="plus" size={17}/>),
  zoomOutText: renderToStaticMarkup(<Icon name="minus" size={17}/>),
};
const creditsIcon = renderToStaticMarkup(<Icon name="info" size={16}/>);

const MAP_MODES = [['streets','mapStreets'], ['light','mapLight'], ['satellite','mapSatellite']];
const WELCOME_CENTER = [16.061, 108.231];
const DEFAULT_ZOOM = 15;
// A visual guide to the area served by SafeMap, not an administrative boundary.
const AN_THUONG_AREA = [
  [16.0553,108.2403], [16.0557,108.2445], [16.0548,108.2475],
  [16.0501,108.2493], [16.0460,108.2476], [16.0460,108.2419],
  [16.0484,108.2389], [16.0522,108.2390],
];

function focusMap(map,target,zoom,rotation){
  if(!map)return;
  const mobile=window.matchMedia?.('(max-width: 700px)').matches;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const workspace=map.getContainer().closest('.map-workspace');
  const sheet=mobile&&workspace?.classList.contains('sheet-expanded')?workspace.querySelector('.places-sidebar'):null;
  const bottomInset=sheet?.clientHeight?sheet.clientHeight+(parseFloat(getComputedStyle(sheet).bottom)||0):0;
  const leftInset=mobile?0:workspace?.querySelector('.place-details')?.offsetWidth||0;
  const offset=L.point(-leftInset/2,bottomInset/2);
  const center=map.unproject(map.project(target,zoom).add(rotation?.screenToMap(offset)??offset),zoom);
  const options={animate:!reduced,duration:.55,easeLinearity:.28};
  map.stop();
  if(map.getZoom()===zoom)map.panTo(center,options);
  else map.flyTo(center,zoom,options);
}

export default function MapView({welcomePhase,focusRevision,places,categories,selected,onSelect,previewed,onPreview,position,lang,t,onLocate,locating,onSos,route,routeGuide,routeMode,routeOrigin,pickingOrigin,onPickOrigin,onCancelOrigin,navigation}) {
  const container=useRef(null),mapRef=useRef(null),markers=useRef(new Map()),userRef=useRef(null),onSelectRef=useRef(onSelect),creditsRef=useRef(null),selectedRef=useRef(selected);
  const stage=useRef(null),frame=useRef(null),viewport=useRef(null),rotation=useRef(null);
  const routeLayers=useRef(null);
  const motion=useRef({shape:null,distance:0,sampledAt:0});
  const camera=useRef({following:false,target:null});
  const previewRef=useRef(previewed);
  const pickOriginRef=useRef(null);
  const welcomeCamera=useRef(welcomePhase==='open'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  pickOriginRef.current=pickingOrigin?onPickOrigin:null;
  previewRef.current=previewed;
  onSelectRef.current=onSelect;selectedRef.current=selected;
  const [layersOpen,setLayersOpen]=useState(false);
  const [rotated,setRotated]=useState(false);
  const [style,setStyle]=useState(DEFAULT_MAP_STYLE),[mapStatus,setMapStatus]=useState('loading');
  useEffect(()=>{
    const map=L.map(container.current,{zoomControl:false,minZoom:2,maxZoom:19,attributionControl:false,touchZoom:'center'})
      .setView(welcomeCamera.current?WELCOME_CENTER:CENTER,welcomeCamera.current?13:DEFAULT_ZOOM);
    mapRef.current=map;
    L.polygon(AN_THUONG_AREA,{
      color:'#43826a',weight:2,dashArray:'6 6',opacity:.78,fillOpacity:.055,interactive:false,
      className:'an-thuong-outline',
    }).addTo(map);
    creditsRef.current=addCollapsibleAttribution(map,t('mapCredits'),creditsIcon);
    L.control.zoom({position:'topright',...zoomIcons}).addTo(map);
    const controls=container.current.querySelector('.leaflet-control-container');
    stage.current.append(controls);
    const mapStage=stage.current;
    rotation.current=addMapRotation(map,viewport.current,frame.current,bearing=>{
      mapStage.style.setProperty('--north-angle',`${bearing}rad`);
      setRotated(Boolean(bearing));
    });
    return()=>{rotation.current.destroy();rotation.current=null;creditsRef.current?.destroy();creditsRef.current=null;map.remove();markers.current.clear();mapRef.current=null;userRef.current=null;};
  },[]);
  useEffect(()=>{
    if(welcomePhase==='open'||!welcomeCamera.current||!mapRef.current)return;
    welcomeCamera.current=false;
    const map=mapRef.current;
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)map.setView(CENTER,DEFAULT_ZOOM,{animate:false});
    else map.flyTo(CENTER,DEFAULT_ZOOM,{duration:1.8});
  },[welcomePhase]);
  useEffect(()=>{if(mapRef.current)return addArchipelagoLayer(mapRef.current,lang,{imagery:style==='satellite'});},[lang,style]);
  useEffect(()=>{creditsRef.current?.setLabel(t('mapCredits'));},[lang]);
  useEffect(()=>{
    const credits=creditsRef.current;
    if(!route||!credits)return;
    const provider=routeMode==='motor_scooter'
      ? '<a href="https://valhalla.openstreetmap.de/">Valhalla / FOSSGIS</a>'
      : '<a href="https://routing.openstreetmap.de/about.html">OSRM / FOSSGIS</a>';
    const attribution=`${provider} · <a href="https://www.openstreetmap.org/fixthemap">${t('routeFixMap')}</a>`;
    return credits.add(attribution);
  },[route,routeMode,lang]);
  useEffect(()=>{if(mapRef.current)return addBasemap(mapRef.current,{style,onStatus:setMapStatus});},[style]);
  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    const visibleIds=new Set(places.map(place=>place.id));
    for(const [id,marker] of markers.current){
      if(visibleIds.has(id))continue;
      marker.remove();
      markers.current.delete(id);
    }
    places.forEach(p=>{
      const category=getCategory(categories,p.category);
      if(!category)return;
      const isSelected=p.id===selected;
      const icon=pinIcon(category,isSelected,p.status);
      const point=[p.lat,p.lng];
      const existing=markers.current.get(p.id);
      if(existing){
        if(existing.options.icon.options.html!==icon.options.html)existing.setIcon(icon);
        if(!existing.getLatLng().equals(point))existing.setLatLng(point);
        if(existing.options.title!==p.name){
          existing.options.title=p.name;
          existing.getTooltip().getContent().textContent=p.name;
        }
        const offset=isSelected?1000:0;
        if(existing.options.zIndexOffset!==offset)existing.setZIndexOffset(offset);
        return;
      }
      const tooltip=document.createElement('span');
      tooltip.textContent=p.name;
      const marker=L.marker(point,{
        icon,
        keyboard:true,
        autoPanOnFocus:!window.matchMedia?.('(max-width: 700px)').matches,
        title:p.name,
        zIndexOffset:isSelected?1000:0,
      }).bindTooltip(tooltip,{direction:'top',offset:[0,-30],opacity:1});
      marker.on('click',event=>{
        if(pickOriginRef.current)pickOriginRef.current(event.latlng);
        else onSelectRef.current(p.id);
      });
      marker.on('mouseover',event=>{
        if(!event.originalEvent?.sourceCapabilities?.firesTouchEvents)onPreview(p.id);
      });
      marker.on('mouseout',()=>onPreview(id=>id===p.id?null:id));
      markers.current.set(p.id,marker);
    });
    const syncVisibility=()=>{
      for(const [id,marker] of markers.current){
        if(map.getZoom()<10){
          marker.remove();
          continue;
        }
        if(!map.hasLayer(marker))marker.addTo(map);
        const element=marker.getElement();
        element?.setAttribute('aria-label',marker.options.title);
        element?.setAttribute('title',marker.options.title);
        element?.setAttribute('aria-current',String(id===selectedRef.current));
        element?.classList.toggle('is-previewed',id===previewRef.current);
      }
    };
    syncVisibility();
    map.on('zoomend',syncVisibility);
    return()=>map.off('zoomend',syncVisibility);
  },[places,categories,selected,onPreview]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const marker=markers.current.get(selected);
    if(!marker)return;
    focusMap(map,marker.getLatLng(),Math.max(map.getZoom(),16),rotation.current);
  },[selected,focusRevision]);
  useEffect(()=>{
    for(const [id,marker] of markers.current){
      marker.getElement()?.classList.toggle('is-previewed',id===previewed);
    }
  },[previewed]);
  const livePosition=navigation.active?navigation.position:null;
  const displayedPosition=livePosition||position;
  const shape=useMemo(()=>routeShape(route),[route]);
  const {active, following, pause, resume, remaining}=navigation;
  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!displayedPosition){
      userRef.current?.remove();
      userRef.current=null;
      return;
    }
    if(!userRef.current)userRef.current=L.circleMarker(displayedPosition,{radius:7,color:'white',weight:3,fillColor:'#3678bc',fillOpacity:1}).addTo(map).bindTooltip(t('you'));
    else if(!livePosition)userRef.current.setLatLng(displayedPosition);
  },[displayedPosition,livePosition]);
  useEffect(()=>{
    if(position?.recenter)focusMap(mapRef.current,position,16,rotation.current);
  },[position]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!active)return;
    map.on('dragstart gesturestart',pause);
    return ()=>map.off('dragstart gesturestart',pause);
  },[active,pause]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const pick=event=>pickOriginRef.current?.(event.latlng);
    map.on('click',pick);
    return ()=>map.off('click',pick);
  },[]);
  useEffect(()=>{
    if(!routeOrigin||!mapRef.current||active)return;
    const pin=L.circleMarker(routeOrigin,{radius:8,color:'#fff',weight:3,fillColor:'#2b62cb',fillOpacity:1,interactive:false}).addTo(mapRef.current);
    return ()=>pin.remove();
  },[routeOrigin,active]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!shape||!map)return;
    const points=shape.points;
    const outline=L.polyline(points,{color:'#fff',weight:9,opacity:.92,interactive:false}).addTo(map);
    const line=L.polyline(points,{color:'#2968dc',weight:5,opacity:1,interactive:false,className:'navigation-line'}).addTo(map);
    routeLayers.current=[outline,line];
    const mobile=window.matchMedia?.('(max-width: 700px)').matches;
    const detailWidth=mobile?0:container.current.closest('.map-workspace')?.querySelector('.place-details')?.offsetWidth||0;
    if(!active){
      const topLeft=[24+detailWidth,mobile?246:195];
      const bottomRight=[mobile?55:40,70];
      map.stop();
      if(!rotation.current?.bearing()||!fitRotatedRoute(map,rotation.current,frame.current,points,topLeft,bottomRight)){
        map.fitBounds(line.getBounds(),{maxZoom:17,animate:false,paddingTopLeft:topLeft,paddingBottomRight:bottomRight});
      }
    }
    return ()=>{routeLayers.current=null;line.remove();outline.remove();};
  },[shape]);
  useEffect(()=>{
    const map=mapRef.current;
    const marker=userRef.current;
    const previous=motion.current;
    const now=window.performance.now();
    const sameShape=previous.shape===shape;
    const startDistance=sameShape?previous.distance:0;
    const endDistance=shape?routeTarget(shape,remaining):0;
    const matched=Boolean(shape&&livePosition&&(livePosition.matched||remaining?.arrived));
    const target=matched?sampleRoute(shape,endDistance).point:livePosition&&L.latLng(livePosition);
    const startPoint=marker?.getLatLng();
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration=reduced||!active?0:Math.min(1000,Math.max(450,previous.sampledAt?(now-previous.sampledAt)*.88:800));
    let animation;
    motion.current={shape,distance:startDistance,sampledAt:livePosition?now:0};

    if(map&&following&&target){
      const {following:wasFollowing,target:oldTarget}=camera.current;
      if(!wasFollowing){
        focusMap(map,target,Math.max(16,map.getZoom()),rotation.current);
        camera.current={following,target};
      }
      else if(!oldTarget||map.latLngToContainerPoint(oldTarget).distanceTo(map.latLngToContainerPoint(target))>=2){
        map.panTo(target,{animate:!reduced,duration:duration/1000,easeLinearity:1});
        camera.current={following,target};
      }
    }else camera.current={following:false,target:null};

    const advances=endDistance!==startDistance;
    const followsShape=matched&&sameShape&&startPoint?.distanceTo(sampleRoute(shape,startDistance).point)<2;
    const draw=(amount)=>{
      const distance=startDistance+(endDistance-startDistance)*amount;
      const sample=shape&&(advances||matched)?sampleRoute(shape,distance):null;
      if(advances&&sample)routeLayers.current?.forEach(layer=>layer.setLatLngs(sample.remaining));
      if(target&&startPoint){
        marker.setLatLng(followsShape?sample.point:blendPosition(startPoint,target,amount));
      }
      motion.current.distance=distance;
    };
    if(!duration||(!advances&&(!startPoint||!target||startPoint.equals(target))))draw(1);
    else {
      const animate=(time)=>{
        const amount=Math.max(0,Math.min(1,(time-now)/duration));
        draw(amount);
        if(amount<1)animation=requestAnimationFrame(animate);
      };
      animation=requestAnimationFrame(animate);
    }
    return ()=>cancelAnimationFrame(animation);
  },[active,following,livePosition,remaining,shape]);
  return <section ref={stage} className={`map-stage ${pickingOrigin?'is-picking-origin':''} ${routeGuide?'has-route-guide':''}`} data-basemap-status={mapStatus} aria-label={t('community')}>
    <div ref={frame} className="map-frame"><div ref={viewport} className="map-rotation-viewport"><div ref={container} className="leaflet-map"/></div></div>
    {mapStatus==='loading'&&<div className="map-loading" role="status">{t('loadingMap')}</div>}
    {routeGuide}
    {pickingOrigin&&<div className="route-pick-notice" role="status"><span>{t('routePickHint')}</span><button className="text-button" onClick={onCancelOrigin}>{t('cancel')}</button></div>}
    <div className="map-location" title={t('mapAreaHint')}><span className="live-dot"/>{t('area')}<small>{t('localGuide')}</small></div>
    {(mapStatus==='fallback'||mapStatus==='error')&&<div className="tile-error" role="status">{t(mapStatus==='error'?'mapError':'vectorFallback')}</div>}
    <div className="map-fabs">
      <button className="icon-button" onClick={()=>{pause();focusMap(mapRef.current,CENTER,15,rotation.current);}} title={t('homeMap')} aria-label={t('homeMap')}><Icon name="map" size={19}/></button>
      <button className={`icon-button ${locating?'locating':''}`} onClick={active?resume:onLocate} disabled={locating} title={t('location')} aria-label={t('location')}><Icon name="locate" size={18}/></button>
      {rotated&&<button className="icon-button map-north" onClick={()=>rotation.current?.reset()} title={t('mapNorth')} aria-label={t('mapNorth')}><span>N</span><Icon name="down" size={12}/></button>}
    </div>
    <div className="map-bottom-tools"><button className="map-tool mobile-layers-toggle" aria-label={t('mapStyle')} aria-expanded={layersOpen} aria-controls="map-layers-panel" onClick={()=>setLayersOpen(open=>!open)}><Icon name={layersOpen?'x':'layers'} size={21}/></button><div id="map-layers-panel" className={`map-style-control ${layersOpen?'is-open':''}`} role="group" aria-label={t('mapStyle')} style={{'--mode-index':MAP_MODES.findIndex(([value])=>value===style)}}>{MAP_MODES.map(([value,label])=><button key={value} className={style===value?'active':''} aria-pressed={style===value} onClick={()=>{setStyle(value);setLayersOpen(false);}}>{t(label)}</button>)}</div><button className="sos-button" aria-label={`SOS ${t('emergency')}`} onClick={onSos}><span/><Icon className="sos-phone-icon" name="phone" size={17}/><span className="sos-text">SOS</span><span className="sos-label">{t('emergency')}</span><Icon className="mobile-sos-icon" name="phone" size={22}/></button></div>
    <div className="map-legend"><span style={{color:'#3582bc'}}><Icon name="shield" size={13}/>SafePoint</span><span style={{color:'#4e6089'}}><Icon name="landmark" size={13}/>{t('civic')}</span><span style={{color:'#22936a'}}><Icon name="recycle" size={13}/>GreenPoint</span><span style={{color:'#bd9556'}}><Icon name="store" size={13}/>{t('utilities')}</span></div>
  </section>;
}
export function CoordinatePicker({lat,lng,onChange,t,readOnly=false}) {
  const el=useRef(null),mapRef=useRef(null),markerRef=useRef(null),change=useRef(onChange);change.current=onChange;
  useEffect(()=>{
    const initial=[Number.isFinite(lat)?lat:CENTER[0],Number.isFinite(lng)?lng:CENTER[1]];
    const map=L.map(el.current,{zoomControl:false,attributionControl:false,scrollWheelZoom:false,minZoom:2,maxZoom:19}).setView(initial,15);mapRef.current=map;
    const credits=addCollapsibleAttribution(map,t('mapCredits'),creditsIcon);
    L.control.zoom(zoomIcons).addTo(map);
    const stop=addBasemap(map);
    const marker=L.marker(initial,{draggable:!readOnly,icon:pinIcon({kind:'green',icon:'pin',color:'#16845d'},true)}).addTo(map);markerRef.current=marker;
    const update=ll=>change.current({lat:Number(ll.lat.toFixed(6)),lng:Number(ll.lng.toFixed(6))});
    if(!readOnly){
      map.on('click',e=>{marker.setLatLng(e.latlng);update(e.latlng);});
      marker.on('dragend',()=>update(marker.getLatLng()));
    }
    const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(el.current);
    return()=>{resize.disconnect();stop();credits.destroy();map.remove();};
  },[]);
  useEffect(()=>{
    if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))||Math.abs(lat)>90||Math.abs(lng)>180)return;
    markerRef.current?.setLatLng([lat,lng]);
    if(readOnly)mapRef.current?.panTo([lat,lng],{animate:false});
  },[lat,lng,readOnly]);
  return <><div ref={el} className="coordinate-map" aria-label={t('locationSection')}/>{!readOnly&&<small className="field-hint">{t('pickHint')}</small>}</>;
}
