import vietnamLand from '../data/vietnam-label-area.geojson.json' with { type:'json' };
import { englishRoadPrefixes } from './locale.js';

// Display limits and a land-only label mask. Neither is drawn as a political boundary.
export const VIETNAM_VIEW = [[6.1,101.9],[23.6,117.7]];
export const VIETNAM_PAN = [[4.8,100.4],[25,119.2]];

const fillSources = new Set(['landcover','landuse','park','water','building','aeroway','transportation']);
const lineSources = new Set(['waterway','aeroway','transportation']);
const labelSources = new Set(['place','transportation_name','waterway','water_name','aerodrome_label','housenumber','transportation']);
const withinVietnam = ['within',vietnamLand];
// The generalized land mask cuts across the urban strip east of the Hàn River.
const daNangRoadLabels = ['within', {
  type:'Polygon',
  coordinates:[[[108.20,15.99],[108.278,15.99],[108.278,16.10],[108.20,16.10],[108.20,15.99]]],
}];
const transportOnly = ['in',['get','class'],['literal',[
  'motorway','trunk','primary','secondary','tertiary','minor','service','track',
  'path','rail','transit','raceway','construction','busway','bus_guideway',
]]];

function allowedLayer(layer, labelsOnly) {
  if (/boundar|disput|maritime|ferry|shipping|nine.dash|claim/i.test(layer.id)) return false;
  const source = layer['source-layer'];
  if (layer.type==='symbol') return labelSources.has(source);
  if (labelsOnly) return false;
  if (layer.type==='background') return !layer.source;
  return layer.type==='fill' ? fillSources.has(source) : layer.type==='line' && lineSources.has(source);
}

const darkAreaColors = {
  water: '#202d40',
  building: '#303f50',
  park: '#263d3c',
  landcover: '#2b3e3e',
  landuse: '#303c48',
  aeroway: '#40536a',
  transportation: '#3d4e61',
};

const standardAreaColors = {
  water:'#acd5df', building:'#dedcd1', park:'#d2e6c8',
  landcover:'#e1eadb', landuse:'#eaece2', aeroway:'#d8dfdc', transportation:'#e3e7e0',
};

export function standardPaint(layer, dark) {
  const source = layer['source-layer'];
  const paint = {...layer.paint};
  if (layer.type==='background') paint['background-color']=dark?'#283443':'#f5f3e9';
  if (layer.type==='fill') {
    paint['fill-color']=(dark?darkAreaColors:standardAreaColors)[source];
    if(source==='landcover'&&/sand|beach/i.test(layer.id))paint['fill-color']=dark?'#575044':'#f2dfaf';
    if(source==='landuse'&&/residential|suburb|neighbourhood/i.test(layer.id)){
      paint['fill-color']=dark?'#344353':'#ece9df';
    }
    if ('fill-outline-color' in paint) {
      paint['fill-outline-color']=dark?'#394b5d':paint['fill-color'];
    }
  }
  if (layer.type==='line') {
    if (source==='waterway') paint['line-color']=dark?'#375069':'#b3d4da';
    else if (/casing|outline/i.test(layer.id)) paint['line-color']=dark?'#202a37':'#c9d4cb';
    else if (/motorway|trunk|primary/i.test(layer.id)) paint['line-color']=dark?'#708aa7':'#f8e9c5';
    else if (/secondary|tertiary/i.test(layer.id)) paint['line-color']=dark?'#5c738e':'#fff9e8';
    else if (/rail/i.test(layer.id)) paint['line-color']=dark?'#53697d':'#9fab9f';
    else paint['line-color']=dark?'#465c74':'#fffefa';
  }
  if (layer.type==='symbol' && layer.layout?.['text-field']) {
    paint['text-color']=source==='place'?(dark?'#eef4fc':'#2a483e'):
      source==='water_name'?(dark?'#a8c6e4':'#376571'):(dark?'#c7d6e9':'#4e6158');
    paint['text-halo-color']=dark?'#242f3e':'#f8faf4';
    paint['text-halo-width']=1.1;
  }
  return paint;
}

export function mapLabelText(layer, lang) {
  const source = layer['source-layer'];
  if (layer.type !== 'symbol' || !layer.layout?.['text-field'] || /shield/i.test(layer.id) || source === 'housenumber') return;
  const local = ['coalesce',['get','name:vi'],['get','name_vi'],['get','name'],''];
  if (lang !== 'en') return local;
  const fallback = source === 'transportation_name'
    ? ['case', ...englishRoadPrefixes.flatMap(([prefix, label, before]) => {
        const rest = ['slice',['var','local'],prefix.length];
        return [
          ['==',['downcase',['slice',['var','local'],0,prefix.length]],prefix.toLowerCase()],
          before ? ['concat',label+' ',rest] : ['concat',rest,' '+label],
        ];
      }), ['var','local']]
    : ['var','local'];
  // Older tiles may copy the original name into name_en when no translation exists.
  return ['let','local',local,'english',['coalesce',['get','name:en'],['get','name_en'],''],
    ['case',['all',['!=',['var','english'],''],['!=',['var','english'],['var','local']],
      ['!=',['var','english'],['get','name']]],['var','english'],fallback]];
}

export function regionalLabelStyle(style,{labelsOnly=false,standard=false}={}) {
  const layers = (style.layers||[]).filter(layer=>
    allowedLayer(layer,labelsOnly)&&!(standard&&layer['source-layer']==='housenumber')
  ).map(layer=>{
    const source = layer['source-layer'];
    const filters = layer.filter ? [layer.filter] : [];
    if (layer.type==='symbol' || source==='waterway') {
      const roadName = layer.type==='symbol' && source==='transportation_name';
      filters.push(roadName ? ['any',withinVietnam,daNangRoadLabels] : withinVietnam);
    }
    if (source==='transportation' || source==='transportation_name') filters.push(transportOnly);
    if (source==='place') filters.push(['!', ['in',['get','class'],['literal',['country','continent']]]]);
    const text = mapLabelText(layer,'vi');
    const detailZoom = {'highway-name-minor':13.75,'highway-name-path':14.5}[layer.id];
    const layout = text ? {...layer.layout,'text-field':text} : layer.layout;
    if(detailZoom!=null&&text)layout['symbol-spacing']=170;
    return {
      ...layer,
      ...(filters.length ? {filter:['all',...filters]} : {}),
      ...(text ? {layout} : {}),
      ...(detailZoom!=null ? {minzoom:detailZoom} : {}),
    };
  });
  if(standard) {
    return {
      ...style,transition:{duration:280,delay:0},
      layers:layers.map(layer=>{
        const paint=standardPaint(layer,false);
        if(layer['source-layer']!=='building')return {...layer,paint};
        const minzoom=Math.max(layer.minzoom??0,16.5);
        delete paint['fill-outline-color'];
        paint['fill-opacity']=['interpolate',['linear'],['zoom'],16.5,0,17.5,.3,19,.55];
        return {...layer,minzoom,paint};
      }),
    };
  }
  return {...style,layers};
}
