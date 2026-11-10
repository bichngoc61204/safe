import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import Icon from './Icon';
import { CENTER } from '../lib/mapCenter';
import { getCategory, markerColor } from '../lib/domain';
import { placeText } from '../lib/locale';
import { addBasemap, DEFAULT_MAP_STYLE, limitVietnamZoom, vietnamMapOptions } from '../lib/basemap';
import { addCollapsibleAttribution } from '../lib/attribution';
import { addArchipelagoLayer } from '../lib/archipelagos';
import { blendPosition, routeShape, routeTarget, sampleRoute } from '../lib/mapMotion';
import { addMapRotation, fitRotatedRoute } from '../lib/mapRotation';

function pinIcon(category,selected=false,status='active') {
  const label=category.name||'Location';
  return L.divIcon({
    className:'custom-marker',
    html:renderToStaticMarkup(<div className="marker-upright"><div className={`marker-pin marker-${category.kind} ${selected?'selected':''} ${['warning','overloaded'].includes(status)?'marker-alert':''}`} style={{'--marker-color':markerColor(category)}}><Icon name={category.icon||'pin'} size={19}/><span className="sr-only">{label}</span></div></div>),
    iconSize:[42,46],iconAnchor:[21,40],popupAnchor:[0,-34],
  });
}
function setGroupMarkerState(element,id,hoverIds) {
  if(!element)return;
  const highlighted=hoverIds?.has(id)??false;
  element.classList.toggle('is-group-highlighted',highlighted);
  element.classList.toggle('is-group-dimmed',Boolean(hoverIds)&&!highlighted);
}
const zoomIcons = {
  zoomInText: renderToStaticMarkup(<Icon name="plus" size={17}/>),
  zoomOutText: renderToStaticMarkup(<Icon name="minus" size={17}/>),
};
const creditsIcon = renderToStaticMarkup(<Icon name="info" size={16}/>);

function useMapLabels(mapRef, lang, t, { style=DEFAULT_MAP_STYLE, onStatus, controlsRoot }={}) {
  const basemap=useRef(null);
  const islands=useRef(null);
  useEffect(()=>{
    if(!mapRef.current)return;
    const stop=addBasemap(mapRef.current,{style,onStatus});
    const removeIslands=addArchipelagoLayer(mapRef.current,'vi',{imagery:style==='satellite'});
    basemap.current=stop;
    islands.current=removeIslands;
    return ()=>{basemap.current=null;islands.current=null;removeIslands();stop();};
  },[mapRef,style,onStatus]);
  const zoomIn=t('zoomIn'),zoomOut=t('zoomOut');
  useEffect(()=>{
    basemap.current?.setLanguage(lang);
    islands.current?.setLanguage(lang);
    const root=controlsRoot?.current||mapRef.current?.getContainer();
    for(const [selector,label] of [['.leaflet-control-zoom-in',zoomIn],['.leaflet-control-zoom-out',zoomOut]]){
      const button=root?.querySelector(selector);
      if(button){button.title=label;button.setAttribute('aria-label',label);}
    }
  },[lang,style,onStatus,mapRef,controlsRoot,zoomIn,zoomOut]);
  return basemap;
}

const MAP_MODES = [[DEFAULT_MAP_STYLE,'mapLight'], ['satellite','mapSatellite']];
const WELCOME_CENTER = [16.061, 108.231];
const DEFAULT_ZOOM = 15;
// A visual guide to the area served by SafeMap, not an administrative boundary.
const AN_THUONG_AREA = [
  [16.0553,108.2403], [16.0557,108.2445], [16.0548,108.2475],
  [16.0501,108.2493], [16.0460,108.2476], [16.0460,108.2419],
  [16.0484,108.2389], [16.0522,108.2390],
];

function desktopMapInset(map) {
  if(window.matchMedia?.('(max-width: 700px)').matches)return 0;
  const workspace=map.getContainer().closest('.map-workspace');
  if(!workspace||workspace.dataset.sidebar==='collapsed')return 0;
  return (workspace.querySelector('.sidebar-drawer')?.offsetWidth||0)
    +(workspace.querySelector('.place-details')?.offsetWidth||0);
}

function focusCenter(map,target,zoom,rotation,extraLeftInset=0){
  const mobile=window.matchMedia?.('(max-width: 700px)').matches;
  const workspace=map.getContainer().closest('.map-workspace');
  const sheet=mobile&&workspace?.classList.contains('sheet-expanded')?workspace.querySelector('.places-sidebar'):null;
  const bottomInset=sheet?.clientHeight?sheet.clientHeight+(parseFloat(getComputedStyle(sheet).bottom)||0):0;
  const leftInset=desktopMapInset(map)+extraLeftInset;
  const offset=L.point(-leftInset/2,bottomInset/2);
  return map.unproject(map.project(target,zoom).add(rotation?.screenToMap(offset)??offset),zoom);
}

function focusMap(map,target,zoom,rotation,duration=.55,extraLeftInset=0){
  if(!map)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const center=focusCenter(map,target,zoom,rotation,extraLeftInset);
  const options={animate:!reduced,duration,easeLinearity:.28};
  map.stop();
  if(map.getZoom()===zoom)map.panTo(center,options);
  else map.flyTo(center,zoom,options);
}

export default function MapView({style,setStyle,welcomePhase,focusRevision,places,hoverPlaces,categories,selected,onSelect,previewed,onPreview,position,lang,t,onLocate,locating,onSos,route,routeGuide,routeMode,routeOrigin,pickingOrigin,onPickOrigin,onCancelOrigin,navigation}) {
  const container=useRef(null),mapRef=useRef(null),markers=useRef(new Map()),userRef=useRef(null),onSelectRef=useRef(onSelect),creditsRef=useRef(null),selectedRef=useRef(selected);
  const stage=useRef(null),frame=useRef(null),viewport=useRef(null),rotation=useRef(null);
  const routeLayers=useRef(null);
  const mapFamily=style==='satellite'?'satellite':DEFAULT_MAP_STYLE;
  const motion=useRef({shape:null,distance:0,sampledAt:0});
  const camera=useRef({following:false,target:null});
  const previewRef=useRef(previewed);
  const hoverIds=useMemo(()=>hoverPlaces&&new Set(hoverPlaces.map(place=>place.id)),[hoverPlaces]);
  const hoverIdsRef=useRef(hoverIds);
  hoverIdsRef.current=hoverIds;
  const pickOriginRef=useRef(null);
  const welcomeCamera=useRef(welcomePhase==='open'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  pickOriginRef.current=pickingOrigin?onPickOrigin:null;
  previewRef.current=previewed;
  onSelectRef.current=onSelect;selectedRef.current=selected;
  const [layersOpen,setLayersOpen]=useState(false);
  const [rotated,setRotated]=useState(false);
  const [mapStatus,setMapStatus]=useState('loading');
  useEffect(()=>{
    const map=L.map(container.current,{...vietnamMapOptions,zoomControl:false,attributionControl:false,touchZoom:false});
    const zoom=welcomeCamera.current?13:DEFAULT_ZOOM;
    const center=map.project(welcomeCamera.current?WELCOME_CENTER:CENTER,zoom);
    map.setView(map.unproject(center.subtract([desktopMapInset(map)/2,0]),zoom),zoom);
    mapRef.current=map;
    const stopZoomLimit=limitVietnamZoom(map,frame.current);
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
      viewport.current.style.setProperty('--map-upright',`${-bearing}rad`);
      setRotated(Boolean(bearing));
    });
    return()=>{stopZoomLimit();rotation.current.destroy();rotation.current=null;creditsRef.current?.destroy();creditsRef.current=null;map.remove();markers.current.clear();mapRef.current=null;userRef.current=null;};
  },[]);
  useEffect(()=>{
    if(welcomePhase==='open'||!welcomeCamera.current||!mapRef.current)return;
    welcomeCamera.current=false;
    const map=mapRef.current;
    focusMap(map,CENTER,DEFAULT_ZOOM,rotation.current,1.8);
  },[welcomePhase]);
  const basemap=useMapLabels(mapRef,lang,t,{style:mapFamily,onStatus:setMapStatus,controlsRoot:stage});
  useEffect(()=>{creditsRef.current?.setLabel(t('mapCredits'));},[lang]);
  useEffect(()=>{
    const credits=creditsRef.current;
    if(!route||!credits)return;
    const provider=routeMode==='motor_scooter'
      ? '<a href="https://valhalla.openstreetmap.de/">Valhalla / FOSSGIS</a>'
      : '<a href="https://routing.openstreetmap.de/about.html">OSRM / FOSSGIS</a>';
    const attribution=`${provider} · <a href="https://www.openstreetmap.org/fixthemap">${t('routeFixMap')}</a>`;
    return credits.add(attribution);
  },[Boolean(route),routeMode,lang]);
  useEffect(()=>{basemap.current?.setDark(style==='dark');},[basemap,style]);
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
      const name=placeText(p,'name',lang);
      const isSelected=p.id===selected;
      const icon=pinIcon(category,isSelected,p.status);
      const point=[p.lat,p.lng];
      const existing=markers.current.get(p.id);
      if(existing){
        if(existing.options.icon.options.html!==icon.options.html)existing.setIcon(icon);
        if(!existing.getLatLng().equals(point))existing.setLatLng(point);
        if(existing.options.title!==name){
          existing.options.title=name;
          existing.getTooltip().getContent().textContent=name;
        }
        const offset=isSelected?1000:0;
        if(existing.options.zIndexOffset!==offset)existing.setZIndexOffset(offset);
        return;
      }
      const tooltip=document.createElement('span');
      tooltip.textContent=name;
      const marker=L.marker(point,{
        icon,
        keyboard:true,
        autoPanOnFocus:!window.matchMedia?.('(max-width: 700px)').matches,
        title:name,
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
        setGroupMarkerState(element,id,hoverIdsRef.current);
      }
    };
    syncVisibility();
    map.on('zoomend',syncVisibility);
    return()=>map.off('zoomend',syncVisibility);
  },[places,categories,selected,onPreview,lang]);
  useEffect(()=>{
    for(const [id,marker] of markers.current)setGroupMarkerState(marker.getElement(),id,hoverIds);
  },[hoverIds]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const marker=markers.current.get(selected);
    if(!marker)return;
    focusMap(map,marker.getLatLng(),Math.max(map.getZoom(),16),rotation.current);
  },[selected,focusRevision]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    if(!hoverPlaces?.length||route||pickingOrigin)return;
    const timer=setTimeout(()=>{
      const bounds=L.latLngBounds(hoverPlaces.map(point=>[point.lat,point.lng]));
      // Pan at the current zoom so successive previews keep the same label detail.
      focusMap(map,bounds.getCenter(),map.getZoom(),rotation.current,.46,Math.min(235,frame.current.clientWidth/3));
    },170);
    return ()=>clearTimeout(timer);
  },[hoverPlaces,route,pickingOrigin]);
  useEffect(()=>{
    for(const [id,marker] of markers.current){
      marker.getElement()?.classList.toggle('is-previewed',id===previewed);
    }
  },[previewed]);
  const livePosition=navigation.active?navigation.position:null;
  const displayedPosition=livePosition||position;
  const userLabel=t('you');
  const shape=useMemo(()=>routeShape(route),[route]);
  const {active, following, pause, resume, remaining}=navigation;
  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!displayedPosition){
      userRef.current?.remove();
      userRef.current=null;
      return;
    }
    if(!userRef.current)userRef.current=L.circleMarker(displayedPosition,{radius:7,color:'white',weight:3,fillColor:'#3678bc',fillOpacity:1}).addTo(map).bindTooltip(userLabel);
    else if(!livePosition)userRef.current.setLatLng(displayedPosition);
    if(userRef.current.getTooltip().getContent()!==userLabel)userRef.current.setTooltipContent(userLabel);
  },[displayedPosition,livePosition,userLabel]);
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
    const {points}=shape;
    const blockSize=96;
    let blockEnd=Math.min(blockSize,points.length-1);
    const first=points.slice(0,blockEnd+1);
    const rest=blockEnd<points.length-1?points.slice(blockEnd):[];
    const outlineOptions={color:'#fff',weight:9,opacity:.92,interactive:false};
    const lineOptions={color:'#2968dc',weight:5,opacity:1,interactive:false};
    const outline=L.polyline(first,outlineOptions).addTo(map);
    const tailOutline=L.polyline(rest,outlineOptions).addTo(map);
    const line=L.polyline(first,{...lineOptions,className:'navigation-line'}).addTo(map);
    const tail=L.polyline(rest,lineOptions).addTo(map);
    routeLayers.current=sample=>{
      const finished=sample.segmentEnd>=points.length;
      const end=finished?points.length:Math.min(Math.ceil(sample.segmentEnd/blockSize)*blockSize,points.length-1);
      if(end!==blockEnd){
        blockEnd=end;
        const nextTail=end<points.length-1?points.slice(end):[];
        tailOutline.setLatLngs(nextTail);
        tail.setLatLngs(nextTail);
      }
      const head=finished?[]:[sample.point,...points.slice(sample.segmentEnd,end+1)];
      outline.setLatLngs(head);
      line.setLatLngs(head);
    };
    const mobile=window.matchMedia?.('(max-width: 700px)').matches;
    const leftInset=desktopMapInset(map);
    if(!active){
      const topLeft=[24+leftInset,mobile?246:195];
      const bottomRight=[mobile?55:40,70];
      map.stop();
      if(!rotation.current?.bearing()||!fitRotatedRoute(map,rotation.current,frame.current,points,topLeft,bottomRight)){
        map.fitBounds(L.latLngBounds(points),{maxZoom:17,animate:false,paddingTopLeft:topLeft,paddingBottomRight:bottomRight});
      }
    }
    return ()=>{routeLayers.current=null;line.remove();outline.remove();tail.remove();tailOutline.remove();};
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
      else if(!oldTarget||map.project(oldTarget).distanceTo(map.project(target))>=5){
        const center=focusCenter(map,target,map.getZoom(),rotation.current);
        map.panTo(center,{animate:!reduced,duration:duration/1000,easeLinearity:.55});
        camera.current={following,target};
      }
    }else camera.current={following:false,target:null};

    const advances=endDistance!==startDistance;
    const followsShape=matched&&sameShape&&startPoint?.distanceTo(sampleRoute(shape,startDistance).point)<2;
    let lastLineFrame=-Infinity;
    const draw=(amount,time)=>{
      const distance=startDistance+(endDistance-startDistance)*amount;
      const sample=shape&&(advances||matched)?sampleRoute(shape,distance):null;
      if(sample&&(advances||remaining?.arrived)&&(amount===1||time-lastLineFrame>=32)){
        routeLayers.current?.(sample);
        lastLineFrame=time;
      }
      if(target&&startPoint){
        marker.setLatLng(followsShape?sample.point:blendPosition(startPoint,target,amount));
      }
      motion.current.distance=distance;
    };
    if(!duration||(!advances&&(!startPoint||!target||startPoint.equals(target))))draw(1,now);
    else {
      const animate=(time)=>{
        const amount=Math.max(0,Math.min(1,(time-now)/duration));
        draw(amount,time);
        if(amount<1)animation=requestAnimationFrame(animate);
      };
      animation=requestAnimationFrame(animate);
    }
    return ()=>cancelAnimationFrame(animation);
  },[active,following,livePosition,remaining,shape]);
  return <section ref={stage} className={`map-stage ${pickingOrigin?'is-picking-origin':''} ${routeGuide?'has-route-guide':''}`} data-basemap-status={mapStatus} data-map-style={style} aria-label={t('community')}>
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
    <div className="map-bottom-tools">
      <button className="map-tool mobile-layers-toggle" aria-label={t('mapStyle')} aria-expanded={layersOpen} aria-controls="map-layers-panel" onClick={()=>setLayersOpen(open=>!open)}><Icon name={layersOpen?'x':'layers'} size={21}/></button>
      <div id="map-layers-panel" className={`map-style-control ${layersOpen?'is-open':''}`} role="group" aria-label={t('mapStyle')} style={{'--mode-count':MAP_MODES.length,'--mode-index':MAP_MODES.findIndex(([value])=>value===mapFamily)}}>
        {MAP_MODES.map(([value,label])=><button key={value} className={mapFamily===value?'active':''} aria-pressed={mapFamily===value} onClick={()=>{
          if(value!==mapFamily)setStyle(value);
          setLayersOpen(false);
        }}>{t(label)}</button>)}
      </div>
      <button className="sos-button" aria-label={`SOS ${t('emergency')}`} onClick={onSos}><span/><Icon className="sos-phone-icon" name="phone" size={17}/><span className="sos-text">SOS</span><span className="sos-label">{t('emergency')}</span><Icon className="mobile-sos-icon" name="phone" size={22}/></button>
    </div>
    <div className="map-legend"><span style={{color:'#3582bc'}}><Icon name="shield" size={13}/>{t('safe')}</span><span style={{color:'#22936a'}}><Icon name="recycle" size={13}/>{t('green')}</span><span style={{color:'#855f35'}}><Icon name="leaf" size={13}/>{t('partner')}</span></div>
  </section>;
}
export function CoordinatePicker({lat,lng,onChange,t,lang,readOnly=false}) {
  const el=useRef(null),mapRef=useRef(null),markerRef=useRef(null),creditsRef=useRef(null),change=useRef(onChange);change.current=onChange;
  useEffect(()=>{
    const initial=[Number.isFinite(lat)?lat:CENTER[0],Number.isFinite(lng)?lng:CENTER[1]];
    const map=L.map(el.current,{...vietnamMapOptions,zoomControl:false,attributionControl:false,scrollWheelZoom:false}).setView(initial,15);mapRef.current=map;
    const credits=creditsRef.current=addCollapsibleAttribution(map,t('mapCredits'),creditsIcon);
    L.control.zoom(zoomIcons).addTo(map);
    const stopZoomLimit=limitVietnamZoom(map,el.current);
    const marker=L.marker(initial,{draggable:!readOnly,icon:pinIcon({kind:'green',icon:'pin',color:'#16845d'},true)}).addTo(map);markerRef.current=marker;
    const update=ll=>change.current({lat:Number(ll.lat.toFixed(6)),lng:Number(ll.lng.toFixed(6))});
    if(!readOnly){
      map.on('click',e=>{marker.setLatLng(e.latlng);update(e.latlng);});
      marker.on('dragend',()=>update(marker.getLatLng()));
    }
    const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(el.current);
    return()=>{resize.disconnect();stopZoomLimit();credits.destroy();map.remove();mapRef.current=null;};
  },[]);
  useMapLabels(mapRef,lang,t);
  useEffect(()=>{creditsRef.current?.setLabel(t('mapCredits'));},[lang]);
  useEffect(()=>{
    if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))||Math.abs(lat)>90||Math.abs(lng)>180)return;
    markerRef.current?.setLatLng([lat,lng]);
    if(readOnly)mapRef.current?.panTo([lat,lng],{animate:false});
  },[lat,lng,readOnly]);
  return <><div ref={el} className="coordinate-map" aria-label={t('locationSection')}/>{!readOnly&&<small className="field-hint">{t('pickHint')}</small>}</>;
}

export function AdminPlacesMap({places,categories,selected,hovered,onSelect,t,lang}) {
  const element=useRef(null);
  const mapRef=useRef(null);
  const creditsRef=useRef(null);
  const pins=useRef(new Map());
  const select=useRef(onSelect);
  select.current=onSelect;

  useEffect(()=>{
    const map=L.map(element.current,{...vietnamMapOptions,zoomControl:false,attributionControl:false}).setView(CENTER,15);
    mapRef.current=map;
    const credits=creditsRef.current=addCollapsibleAttribution(map,t('mapCredits'),creditsIcon);
    const stopZoom=limitVietnamZoom(map,element.current);
    L.control.zoom({...zoomIcons,position:'topleft'}).addTo(map);
    const observer=new ResizeObserver(()=>map.invalidateSize({debounceMoveend:true}));
    observer.observe(element.current);
    return ()=>{observer.disconnect();stopZoom();credits.destroy();map.remove();mapRef.current=null;};
  },[]);

  useMapLabels(mapRef,lang,t);
  useEffect(()=>{creditsRef.current?.setLabel(t('mapCredits'));},[lang]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const layer=L.layerGroup().addTo(map);
    for(const place of places){
      const category=getCategory(categories,place.category);
      if(!category)continue;
      const marker=L.marker([place.lat,place.lng],{
        title:place.name,icon:pinIcon(category,false,place.status),autoPanOnFocus:false,
      }).on('click',()=>select.current(place.id)).addTo(layer);
      marker.getElement()?.setAttribute('aria-label',place.name);
      pins.current.set(place.id,{marker,category,status:place.status});
    }
    return ()=>{layer.remove();pins.current.clear();};
  },[places,categories]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    map.invalidateSize({pan:false});
    for(const [id,{marker,category,status}] of pins.current){
      const icon=pinIcon(category,id===selected,status);
      if(marker.options.icon.options.html!==icon.options.html)marker.setIcon(icon);
      marker.getElement()?.setAttribute('aria-label',marker.options.title);
    }
    const point=pins.current.get(selected)?.marker.getLatLng();
    if(point){
      const zoom=Math.max(15,map.getZoom());
      map.setView(point,zoom,{animate:!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
    }else if(pins.current.size){
      const bounds=L.latLngBounds([...pins.current.values()].map(({marker})=>marker.getLatLng()));
      map.fitBounds(bounds,{padding:[32,40],maxZoom:16,animate:false});
    }
  },[selected,places,categories]);

  useEffect(()=>{
    for(const place of places){
      const marker=pins.current.get(place.id)?.marker;
      if(!marker)continue;
      const name=placeText(place,'name',lang);
      marker.options.title=name;
      marker.getElement()?.setAttribute('aria-label',name);
      marker.getElement()?.setAttribute('title',name);
    }
  },[places,categories,lang]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const target=pins.current.get(hovered)?.marker;
    for(const [id,{marker}] of pins.current){
      marker.getElement()?.classList.toggle('is-admin-dimmed',Boolean(target)&&marker!==target);
      marker.setZIndexOffset(marker===target?2000:id===selected?1000:0);
    }
    if(!target)return;
    const timer=setTimeout(()=>{
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      map.panTo(target.getLatLng(),{animate:!reduced,duration:.36,easeLinearity:.28});
    },110);
    return ()=>clearTimeout(timer);
  },[hovered,selected,places,categories]);

  return <div ref={element} className="coordinate-map admin-map-canvas" aria-label={t('viewMap')}/>;
}
