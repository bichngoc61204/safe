import L from 'leaflet';
import land from '../data/archipelagos.geojson.json';

export const ARCHIPELAGOS = [
  {id:'hoang-sa',lat:16.55,lng:112.15,vi:'Quần đảo Hoàng Sa',en:'Hoang Sa Archipelago'},
  {id:'truong-sa',lat:9.6,lng:114.35,vi:'Quần đảo Trường Sa',en:'Truong Sa Archipelago'},
];
const overviewLabels = [
  {lat:14.2,lng:107.8,vi:'Việt Nam',en:'Vietnam'},
  {lat:13.6,lng:112.9,vi:'Biển Đông',en:'East Sea'},
];

/** Physical land outlines, without drawing administrative or maritime boundaries. */
export function addArchipelagoLayer(map,lang='vi',{imagery=false}={}) {
  if(!map.getPane('archipelago-land')){const pane=map.createPane('archipelago-land');pane.style.zIndex='420';pane.style.pointerEvents='none';}
  const group=L.layerGroup().addTo(map);
  const labels=[];
  L.geoJSON(land,{pane:'archipelago-land',interactive:false,style:{color:imagery?'#d9e9dc':'#3f866d',weight:1,opacity:imagery?0.5:0.9,fillColor:'#dbecc9',fillOpacity:imagery?0:1}}).addTo(group);
  for(const island of ARCHIPELAGOS){
    const label=document.createElement('span');label.className='archipelago-name';label.textContent=island[lang]||island.vi;
    labels.push([label,island]);
    L.marker([island.lat,island.lng],{interactive:false,keyboard:false,zIndexOffset:-500,icon:L.divIcon({className:'archipelago-label',html:label,iconSize:[180,20],iconAnchor:[90,10]})}).addTo(group);
  }
  const overview = L.layerGroup(overviewLabels.map(item=>{
    const label=document.createElement('span');
    label.textContent=item[lang]||item.vi;
    labels.push([label,item]);
    if(item.vi==='Biển Đông')label.className='archipelago-name';
    return L.marker([item.lat,item.lng],{interactive:false,keyboard:false,zIndexOffset:-600,
      icon:L.divIcon({className:'regional-overview-label',html:label,iconSize:[110,20],iconAnchor:[55,10]})});
  }));
  const syncOverview=()=>{if(map.getZoom()<=8)group.addLayer(overview);else group.removeLayer(overview);};
  map.on('zoomend',syncOverview);
  syncOverview();
  const source='<a href="https://www.naturalearthdata.com/">Natural Earth</a>';
  map.attributionControl?.addAttribution(source);
  const remove=()=>{map.off('zoomend',syncOverview);group.remove();map.attributionControl?.removeAttribution(source);};
  remove.setLanguage=value=>{
    for(const [label,item] of labels)label.textContent=item[value]||item.vi;
  };
  return remove;
}
