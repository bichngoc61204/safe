import L from 'leaflet';
import land from '../data/archipelagos.geojson.json';

export const ARCHIPELAGOS = [
  {id:'hoang-sa',lat:16.55,lng:112.15,vi:'Quần đảo Hoàng Sa',en:'Hoang Sa Archipelago'},
  {id:'truong-sa',lat:9.6,lng:114.35,vi:'Quần đảo Trường Sa',en:'Truong Sa Archipelago'},
];

/** Physical land outlines, without drawing administrative or maritime boundaries. */
export function addArchipelagoLayer(map,lang='vi',{imagery=false}={}) {
  if(!map.getPane('archipelago-land')){const pane=map.createPane('archipelago-land');pane.style.zIndex='420';pane.style.pointerEvents='none';}
  const group=L.layerGroup().addTo(map);
  L.geoJSON(land,{pane:'archipelago-land',interactive:false,style:{color:imagery?'#d9e9dc':'#3f866d',weight:1,opacity:imagery?0.5:0.9,fillColor:'#dbecc9',fillOpacity:imagery?0:1}}).addTo(group);
  for(const island of ARCHIPELAGOS){
    const label=document.createElement('span');label.className='archipelago-name';label.textContent=island[lang]||island.vi;
    L.marker([island.lat,island.lng],{interactive:false,keyboard:false,zIndexOffset:-500,icon:L.divIcon({className:'archipelago-label',html:label,iconSize:[180,20],iconAnchor:[90,10]})}).addTo(group);
  }
  const source='<a href="https://www.naturalearthdata.com/">Natural Earth</a>';
  map.attributionControl?.addAttribution(source);
  return ()=>{group.remove();map.attributionControl?.removeAttribution(source);};
}
