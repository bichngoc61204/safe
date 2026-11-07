import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import Icon from './Icon';
import { CENTER } from '../lib/data';
import { getCategory, markerColor } from '../lib/domain';
import { addBasemap, DEFAULT_MAP_STYLE } from '../lib/basemap';
import { addCollapsibleAttribution } from '../lib/attribution';
import { addArchipelagoLayer } from '../lib/archipelagos';

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

function focusMap(map,target,zoom){
  if(!map)return;
  const mobile=window.matchMedia?.('(max-width: 700px)').matches;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const workspace=map.getContainer().closest('.map-workspace');
  const sheet=mobile&&workspace?.classList.contains('sheet-expanded')?workspace.querySelector('.places-sidebar'):null;
  const bottomInset=sheet?.clientHeight?sheet.clientHeight+(parseFloat(getComputedStyle(sheet).bottom)||0):0;
  const leftInset=mobile?0:workspace?.querySelector('.place-details')?.offsetWidth||0;
  const center=map.unproject(map.project(target,zoom).add([-leftInset/2,bottomInset/2]),zoom);
  const options={animate:!reduced,duration:.55,easeLinearity:.28};
  map.stop();
  if(map.getZoom()===zoom)map.panTo(center,options);
  else map.flyTo(center,zoom,options);
}

export default function MapView({welcomePhase,places,categories,selected,onSelect,previewed,onPreview,position,lang,t,onLocate,locating,onSos,route,routeGuide,routeMode,routeOrigin,pickingOrigin,onPickOrigin,onCancelOrigin,navigation}) {
  const container=useRef(null),mapRef=useRef(null),markers=useRef(new Map()),userRef=useRef(null),onSelectRef=useRef(onSelect),creditsRef=useRef(null),selectedRef=useRef(selected);
  const routeLayers=useRef(null);
  const previewRef=useRef(previewed);
  const pickOriginRef=useRef(null);
  const welcomeCamera=useRef(welcomePhase==='open'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  pickOriginRef.current=pickingOrigin?onPickOrigin:null;
  previewRef.current=previewed;
  onSelectRef.current=onSelect;selectedRef.current=selected;
  const [layersOpen,setLayersOpen]=useState(false);
  const [style,setStyle]=useState(DEFAULT_MAP_STYLE),[mapStatus,setMapStatus]=useState('loading');
  useEffect(()=>{
    const map=L.map(container.current,{zoomControl:false,minZoom:2,maxZoom:19,attributionControl:false})
      .setView(welcomeCamera.current?WELCOME_CENTER:CENTER,welcomeCamera.current?13:DEFAULT_ZOOM);
    mapRef.current=map;
    creditsRef.current=addCollapsibleAttribution(map,t('mapCredits'),creditsIcon);
    L.control.zoom({position:'topright',...zoomIcons}).addTo(map);
    const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(container.current);
    return()=>{resize.disconnect();creditsRef.current?.destroy();creditsRef.current=null;map.remove();markers.current.clear();mapRef.current=null;userRef.current=null;};
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
    focusMap(map,marker.getLatLng(),map.getZoom());
  },[selected]);
  useEffect(()=>{
    for(const [id,marker] of markers.current){
      marker.getElement()?.classList.toggle('is-previewed',id===previewed);
    }
  },[previewed]);
  const livePosition=navigation.active?navigation.position:null;
  const displayedPosition=livePosition||position;
  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!displayedPosition){
      userRef.current?.remove();
      userRef.current=null;
      return;
    }
    if(userRef.current)userRef.current.setLatLng(displayedPosition);
    else userRef.current=L.circleMarker(displayedPosition,{radius:7,color:'white',weight:3,fillColor:'#3678bc',fillOpacity:1}).addTo(map).bindTooltip(t('you'));
  },[displayedPosition]);
  useEffect(()=>{
    if(position?.recenter)focusMap(mapRef.current,position,16);
  },[position]);
  const {active, following, pause, resume}=navigation;
  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!active)return;
    map.on('dragstart',pause);
    return ()=>map.off('dragstart',pause);
  },[active,pause]);
  useEffect(()=>{
    const map=mapRef.current;
    if(map&&livePosition&&following)focusMap(map,livePosition,Math.max(16,map.getZoom()));
  },[livePosition,following]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const pick=event=>pickOriginRef.current?.(event.latlng);
    map.on('click',pick);
    return ()=>map.off('click',pick);
  },[]);
  useEffect(()=>{
    if(!routeOrigin||!mapRef.current)return;
    const pin=L.circleMarker(routeOrigin,{radius:8,color:'#fff',weight:3,fillColor:'#2b62cb',fillOpacity:1,interactive:false}).addTo(mapRef.current);
    return ()=>pin.remove();
  },[routeOrigin]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!route||!map)return;
    const points=route.geometry.coordinates.map(([lng,lat])=>[lat,lng]);
    const outline=L.polyline(points,{color:'#fff',weight:9,opacity:.92,interactive:false}).addTo(map);
    const line=L.polyline(points,{color:'#2968dc',weight:5,opacity:1,interactive:false,className:'navigation-line'}).addTo(map);
    routeLayers.current=[outline,line];
    const mobile=window.matchMedia?.('(max-width: 700px)').matches;
    const detailWidth=mobile?0:container.current.closest('.map-workspace')?.querySelector('.place-details')?.offsetWidth||0;
    if(!active)map.stop().fitBounds(line.getBounds(),{
      maxZoom:17,animate:false,
      paddingTopLeft:[24+detailWidth, mobile?246:195],
      paddingBottomRight:[mobile?55:40,70],
    });
    return ()=>{routeLayers.current=null;line.remove();outline.remove();};
  },[route]);
  useEffect(()=>{
    if(!route||!routeLayers.current)return;
    const points=(navigation.remaining?.remainingCoordinates??route.geometry.coordinates).map(([lng,lat])=>[lat,lng]);
    routeLayers.current.forEach(layer=>layer.setLatLngs(points));
  },[route,navigation.remaining]);
  return <section className={`map-stage ${pickingOrigin?'is-picking-origin':''} ${routeGuide?'has-route-guide':''}`} data-basemap-status={mapStatus} aria-label={t('community')}>
    <div ref={container} className="leaflet-map"/>{mapStatus==='loading'&&<div className="map-loading" role="status">{t('loadingMap')}</div>}
    {routeGuide}
    {pickingOrigin&&<div className="route-pick-notice" role="status"><span>{t('routePickHint')}</span><button className="text-button" onClick={onCancelOrigin}>{t('cancel')}</button></div>}
    <div className="map-location"><span className="live-dot"/>{t('area')}<small>{t('localGuide')}</small></div>
    {(mapStatus==='fallback'||mapStatus==='error')&&<div className="tile-error" role="status">{t(mapStatus==='error'?'mapError':'vectorFallback')}</div>}
    <div className="map-fabs"><button className="icon-button" onClick={()=>{pause();focusMap(mapRef.current,CENTER,15);}} title={t('homeMap')} aria-label={t('homeMap')}><Icon name="map" size={19}/></button><button className={`icon-button ${locating?'locating':''}`} onClick={active?resume:onLocate} disabled={locating} title={t('location')} aria-label={t('location')}><Icon name="locate" size={18}/></button></div>
    <div className="map-bottom-tools"><button className="map-tool mobile-layers-toggle" aria-label={t('mapStyle')} aria-expanded={layersOpen} aria-controls="map-layers-panel" onClick={()=>setLayersOpen(open=>!open)}><Icon name={layersOpen?'x':'layers'} size={21}/></button><div id="map-layers-panel" className={`map-style-control ${layersOpen?'is-open':''}`} role="group" aria-label={t('mapStyle')} style={{'--mode-index':MAP_MODES.findIndex(([value])=>value===style)}}>{MAP_MODES.map(([value,label])=><button key={value} className={style===value?'active':''} aria-pressed={style===value} onClick={()=>{setStyle(value);setLayersOpen(false);}}>{t(label)}</button>)}</div><button className="sos-button" aria-label={`SOS ${t('emergency')}`} onClick={onSos}><span/><Icon className="sos-phone-icon" name="phone" size={17}/><span className="sos-text">SOS</span><span className="sos-label">{t('emergency')}</span><Icon className="mobile-sos-icon" name="phone" size={22}/></button></div>
    <div className="map-legend"><span style={{color:'#3582bc'}}><Icon name="shield" size={13}/>SafePoint</span><span style={{color:'#4e6089'}}><Icon name="landmark" size={13}/>{t('civic')}</span><span style={{color:'#22936a'}}><Icon name="recycle" size={13}/>GreenPoint</span><span style={{color:'#bd9556'}}><Icon name="store" size={13}/>{t('utilities')}</span></div>
  </section>;
}
export function CoordinatePicker({lat,lng,onChange,t}) {
  const el=useRef(null),mapRef=useRef(null),markerRef=useRef(null),change=useRef(onChange);change.current=onChange;
  useEffect(()=>{
    const initial=[Number.isFinite(lat)?lat:CENTER[0],Number.isFinite(lng)?lng:CENTER[1]];
    const map=L.map(el.current,{zoomControl:false,attributionControl:false,scrollWheelZoom:false,minZoom:2,maxZoom:19}).setView(initial,15);mapRef.current=map;
    const credits=addCollapsibleAttribution(map,t('mapCredits'),creditsIcon);
    L.control.zoom(zoomIcons).addTo(map);
    const stop=addBasemap(map);
    const marker=L.marker(initial,{draggable:true,icon:pinIcon({kind:'green',icon:'pin',color:'#16845d'},true)}).addTo(map);markerRef.current=marker;
    const update=ll=>change.current({lat:Number(ll.lat.toFixed(6)),lng:Number(ll.lng.toFixed(6))});
    map.on('click',e=>{marker.setLatLng(e.latlng);update(e.latlng);});marker.on('dragend',()=>update(marker.getLatLng()));
    const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(el.current);
    return()=>{resize.disconnect();stop();credits.destroy();map.remove();};
  },[]);
  useEffect(()=>{if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Math.abs(lat)<=90&&Math.abs(lng)<=180)markerRef.current?.setLatLng([lat,lng]);},[lat,lng]);
  return <><div ref={el} className="coordinate-map" aria-label={t('locationSection')}/><small className="field-hint">{t('pickHint')}</small></>;
}
