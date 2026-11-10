import L from 'leaflet';
import { mapLabelText, regionalLabelStyle, standardPaint, VIETNAM_VIEW, VIETNAM_PAN } from './cartography';

export const DEFAULT_MAP_STYLE='light';
const STANDARD_STYLE_URL='https://tiles.openfreemap.org/styles/positron';
const SATELLITE_LABEL_STYLE_URL='https://tiles.openfreemap.org/styles/bright';
const vectorAttribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>';
const imageryAttribution='Imagery &copy; <a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">Esri, Vantor, Earthstar Geographics &amp; GIS User Community</a>';
const IMAGERY_URL='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const stylesCache=new Map();

export const vietnamMapOptions = { minZoom:4, maxZoom:19, zoomSnap:.25, maxBounds:VIETNAM_PAN, maxBoundsViscosity:1 };

export function limitVietnamZoom(map, frame) {
  const bounds = L.latLngBounds(VIETNAM_VIEW);
  const showCountryAtLimit=()=>{
    if(map.getZoom()===map.getMinZoom())map.panTo(bounds.getCenter(),{animate:false});
  };
  function update() {
    const { clientWidth, clientHeight } = frame;
    if (clientWidth < 80 || clientHeight < 80) return;
    const size = map.project(bounds.getNorthEast(), 0).subtract(map.project(bounds.getSouthWest(), 0));
    const zoom = Math.log2(Math.min((clientWidth-30)/size.x, (clientHeight-30)/Math.abs(size.y)));
    map.setMinZoom(Math.max(4,Math.floor(zoom*4)/4));
  }
  update();
  map.on('zoomend',showCountryAtLimit);
  const observer=new ResizeObserver(update);
  observer.observe(frame);
  return ()=>{observer.disconnect();map.off('zoomend',showCountryAtLimit);};
}
async function loadCleanStyle(signal,hybrid){
  const url=hybrid?SATELLITE_LABEL_STYLE_URL:STANDARD_STYLE_URL;
  if(stylesCache.has(url))return structuredClone(stylesCache.get(url));
  const response=await fetch(url,{signal});
  if(!response.ok)throw Error('Basemap style unavailable');
  const style=regionalLabelStyle(await response.json(),{labelsOnly:hybrid,standard:!hybrid});
  stylesCache.set(url,style);
  return structuredClone(style);
}

export function addBasemap(map,{style=DEFAULT_MAP_STYLE,onStatus=()=>{}}={}) {
  let disposed=false,layer=null,rasterLayer=null,timer=null,vectorMap=null,loadedStyle=null;
  let vectorReady=false,contextLost=false,dark=false,appliedDark=false;
  let language='vi',appliedLanguage='vi';
  const hybrid=style==='satellite';
  const request=new AbortController();
  const report=value=>{if(!disposed)onStatus(value);};
  function localizeLabels(){
    if(!vectorReady||contextLost||appliedLanguage===language)return;
    for(const layer of loadedStyle.layers){
      const text=mapLabelText(layer,language);
      if(text)vectorMap.setLayoutProperty(layer.id,'text-field',text);
    }
    appliedLanguage=language;
  }
  function paintTheme(){
    if(hybrid||!vectorReady||contextLost||appliedDark===dark)return;
    const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for(const layerStyle of loadedStyle.layers){
      const next=dark?standardPaint(layerStyle,true):layerStyle.paint;
      const previous=appliedDark?standardPaint(layerStyle,true):layerStyle.paint;
      for(const [property,value] of Object.entries(next)){
        if(value===previous[property])continue;
        vectorMap.setPaintProperty(layerStyle.id,`${property}-transition`,{duration:reduceMotion?0:280,delay:0});
        vectorMap.setPaintProperty(layerStyle.id,property,value);
      }
    }
    appliedDark=dark;
  }
  function removeImagery(){
    rasterLayer?.remove();
    rasterLayer=null;
  }
  function imagery(isFallback=false){
    if(disposed||rasterLayer)return;
    let hasTiles=false;
    rasterLayer=L.tileLayer(IMAGERY_URL,{maxZoom:19,maxNativeZoom:19,noWrap:true,attribution:imageryAttribution});
    rasterLayer.on('tileload',()=>{
      if(hasTiles)return;
      hasTiles=true;
      report(isFallback?'fallback':vectorReady&&!contextLost?'hybrid':'imagery');
    });
    rasterLayer.on('load',()=>{if(!hasTiles)report('error');});
    rasterLayer.addTo(map);
    rasterLayer.bringToBack();
  }
  function fallback(){
    if(disposed)return;
    if(!hybrid)imagery(true);
    report(hybrid?'imagery':'fallback');
  }
  function ready(){
    clearTimeout(timer);
    if(contextLost)return;
    vectorReady=true;
    localizeLabels();
    layer.getContainer().style.visibility='';
    paintTheme();
    if(!hybrid)removeImagery();
    report(hybrid?'hybrid':'vector');
  }
  function loseContext(){
    contextLost=true;
    layer.getContainer().style.visibility='hidden';
    fallback();
  }
  function restoreContext(){
    contextLost=false;
    // Wait for the recovered canvas to draw before removing the backup underneath it.
    if(vectorReady)vectorMap.once('render',ready);
  }
  report('loading');
  if(hybrid)imagery();
  if(!window.WebGLRenderingContext&&!window.WebGL2RenderingContext){if(!hybrid)fallback();}
  else {
    (async()=>{
      try{
        const [gl,{maplibreGL},{default:workerUrl},cleanStyle]=await Promise.all([
          import('maplibre-gl'),import('@maplibre/maplibre-gl-leaflet'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
          loadCleanStyle(request.signal,hybrid),
        ]);
        if(disposed)return;
        gl.setWorkerUrl(workerUrl);
        loadedStyle=cleanStyle;
        layer=maplibreGL({
          style:cleanStyle, attributionControl:false, interactive:false, renderWorldCopies:false,
          pixelRatio:Math.min(window.devicePixelRatio||1,1.6), updateInterval:40, fadeDuration:180,
        });
        layer.addTo(map);
        vectorMap=layer.getMaplibreMap();
        map.attributionControl?.addAttribution(vectorAttribution);
        vectorMap.on('webglcontextlost',loseContext);
        vectorMap.on('webglcontextrestored',restoreContext);
        vectorMap.once('load',ready);
        timer=setTimeout(fallback,20000);
      }catch{
        // Leaflet registers a layer before creating its WebGL context.
        // A failed constructor must not leave a partial renderer receiving map events.
        if(layer&&map.hasLayer(layer)&&!layer.getMaplibreMap()){
          layer.onRemove=()=>layer.getContainer()?.remove();
          layer.remove();
          layer=null;
        }
        fallback();
      }
    })();
  }
  function remove(){
    disposed=true;
    request.abort();
    clearTimeout(timer);
    if(vectorMap){
      vectorMap.off('webglcontextlost',loseContext);
      vectorMap.off('webglcontextrestored',restoreContext);
      vectorMap.off('load',ready);
      vectorMap.off('render',ready);
      map.attributionControl?.removeAttribution(vectorAttribution);
    }
    layer?.remove();
    removeImagery();
  }
  remove.setDark=value=>{dark=value;paintTheme();};
  remove.setLanguage=value=>{language=value;localizeLabels();};
  return remove;
}
