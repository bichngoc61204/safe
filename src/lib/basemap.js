import L from 'leaflet';
import { regionalLabelStyle, VIETNAM_VIEW, VIETNAM_PAN } from './cartography';

export const DEFAULT_MAP_STYLE='light';
export const MAP_STYLES = {
  light:'https://tiles.openfreemap.org/styles/positron',
  streets:'https://tiles.openfreemap.org/styles/bright',
};
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
async function loadCleanStyle(url,signal,{labelsOnly,dark}){
  const cacheKey=url+(dark?'#dark':labelsOnly?'#labels':'#map');
  if(stylesCache.has(cacheKey))return structuredClone(stylesCache.get(cacheKey));
  const response=await fetch(url,{signal});
  if(!response.ok)throw Error('Basemap style unavailable');
  const style=regionalLabelStyle(await response.json(),{labelsOnly,dark});stylesCache.set(cacheKey,style);
  return structuredClone(style);
}

export function addBasemap(map,{style=DEFAULT_MAP_STYLE,onStatus=()=>{}}={}) {
  let disposed=false,layer=null,rasterLayer=null,timer=null,attribution=null,vectorMap=null,labelsReady=false;
  const request=new AbortController();
  const report=value=>{if(!disposed)onStatus(value);};
  const remove=()=>{clearTimeout(timer);if(vectorMap){vectorMap.off('error',fallback);vectorMap=null;}if(layer){layer.remove();layer=null;}if(rasterLayer){rasterLayer.remove();rasterLayer=null;}if(attribution){map.attributionControl?.removeAttribution(attribution);attribution=null;}};
  function imagery(isFallback=false){
    if(disposed)return;
    rasterLayer=L.tileLayer(IMAGERY_URL,{maxZoom:19,maxNativeZoom:19,noWrap:true,attribution:imageryAttribution}).addTo(map);
    rasterLayer.on('tileerror',()=>report('error'));
    rasterLayer.on('load',()=>report(isFallback?'fallback':labelsReady?'hybrid':'imagery'));
  }
  function fallback(){if(disposed)return;remove();imagery(true);}
  report('loading');
  const hybrid=style==='satellite';
  if(hybrid)imagery();
  if(!window.WebGLRenderingContext&&!window.WebGL2RenderingContext){if(!hybrid)imagery(true);}
  else {
    (async()=>{
      try{
        const [gl,{maplibreGL},{default:workerUrl},cleanStyle]=await Promise.all([
          import('maplibre-gl'),import('@maplibre/maplibre-gl-leaflet'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
          loadCleanStyle(MAP_STYLES[style==='dark'?'light':style]||MAP_STYLES.streets,request.signal,{labelsOnly:hybrid,dark:style==='dark'}),
        ]);
        if(disposed)return;
        gl.setWorkerUrl(workerUrl);
        layer=maplibreGL({style:cleanStyle,attributionControl:false,interactive:false,renderWorldCopies:false}).addTo(map);
        attribution=vectorAttribution;map.attributionControl?.addAttribution(attribution);
        vectorMap=layer.getMaplibreMap();vectorMap.on('error',fallback);
        vectorMap.once('load',()=>{labelsReady=true;clearTimeout(timer);report(hybrid?'hybrid':'vector');});
        timer=setTimeout(fallback,20000);
      }catch{fallback();}
    })();
  }
  return()=>{disposed=true;request.abort();remove();};
}
