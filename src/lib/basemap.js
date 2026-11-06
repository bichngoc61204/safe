import L from 'leaflet';
import { regionalLabelStyle } from './cartography';

export const DEFAULT_MAP_STYLE='light';
export const MAP_STYLES = {
  light:'https://tiles.openfreemap.org/styles/positron',
  streets:'https://tiles.openfreemap.org/styles/bright',
};
const vectorAttribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a>';
const imageryAttribution='Imagery &copy; <a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">Esri, Vantor, Earthstar Geographics &amp; GIS User Community</a>';
const IMAGERY_URL='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const stylesCache=new Map();
async function loadCleanStyle(url,signal,labelsOnly=false){
  const cacheKey=url+(labelsOnly?'#labels':'#map');
  if(stylesCache.has(cacheKey))return structuredClone(stylesCache.get(cacheKey));
  const response=await fetch(url,{signal});
  if(!response.ok)throw Error('Basemap style unavailable');
  const style=regionalLabelStyle(await response.json(),{labelsOnly});stylesCache.set(cacheKey,style);
  return structuredClone(style);
}

export function addBasemap(map,{style=DEFAULT_MAP_STYLE,onStatus=()=>{}}={}) {
  let disposed=false,layer=null,rasterLayer=null,timer=null,attribution=null,vectorMap=null,labelsReady=false;
  const request=new AbortController();
  const report=value=>{if(!disposed)onStatus(value);};
  const remove=()=>{clearTimeout(timer);if(vectorMap){vectorMap.off('error',fallback);vectorMap=null;}if(layer){layer.remove();layer=null;}if(rasterLayer){rasterLayer.remove();rasterLayer=null;}if(attribution){map.attributionControl?.removeAttribution(attribution);attribution=null;}};
  function imagery(isFallback=false){
    if(disposed)return;
    rasterLayer=L.tileLayer(IMAGERY_URL,{maxZoom:19,maxNativeZoom:19,attribution:imageryAttribution}).addTo(map);
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
          loadCleanStyle(MAP_STYLES[style]||MAP_STYLES.streets,request.signal,hybrid),
        ]);
        if(disposed)return;
        gl.setWorkerUrl(workerUrl);
        layer=maplibreGL({style:cleanStyle,attributionControl:false,interactive:false}).addTo(map);
        attribution=vectorAttribution;map.attributionControl?.addAttribution(attribution);
        vectorMap=layer.getMaplibreMap();vectorMap.on('error',fallback);
        vectorMap.once('load',()=>{labelsReady=true;clearTimeout(timer);report(hybrid?'hybrid':'vector');});
        timer=setTimeout(fallback,20000);
      }catch{fallback();}
    })();
  }
  return()=>{disposed=true;request.abort();remove();};
}
