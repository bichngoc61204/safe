import vietnamLand from '../data/vietnam-label-area.geojson.json' with { type:'json' };

// Display limits and a land-only label mask. Neither is drawn as a political boundary.
export const VIETNAM_VIEW = [[6.1,101.9],[23.6,117.7]];
export const VIETNAM_PAN = [[4.8,100.4],[25,119.2]];

const fillSources = new Set(['landcover','landuse','park','water','building','aeroway','transportation']);
const lineSources = new Set(['waterway','aeroway','transportation']);
const labelSources = new Set(['place','transportation_name','waterway','water_name','aerodrome_label','housenumber','transportation']);
const withinVietnam = ['within',vietnamLand];
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

function darkPaint(layer) {
  const source = layer['source-layer'];
  const paint = {...layer.paint};
  if (layer.type==='background') paint['background-color']='#283443';
  if (layer.type==='fill') {
    paint['fill-color']=darkAreaColors[source];
    if ('fill-outline-color' in paint) paint['fill-outline-color']='#394b5d';
  }
  if (layer.type==='line') {
    if (source==='waterway') paint['line-color']='#375069';
    else if (/casing|outline/i.test(layer.id)) paint['line-color']='#202a37';
    else if (/motorway|trunk|primary/i.test(layer.id)) paint['line-color']='#708aa7';
    else if (/secondary|tertiary/i.test(layer.id)) paint['line-color']='#5c738e';
    else paint['line-color']='#465c74';
  }
  if (layer.type==='symbol' && layer.layout?.['text-field']) {
    paint['text-color']=source==='place'?'#eef4fc':source==='water_name'?'#a8c6e4':'#c7d6e9';
    paint['text-halo-color']='#242f3e';
    paint['text-halo-width']=1.1;
  }
  return paint;
}

export function regionalLabelStyle(style,{labelsOnly=false,dark=false}={}) {
  const layers = (style.layers||[]).filter(layer=>allowedLayer(layer,labelsOnly)).map(layer=>{
    const source = layer['source-layer'];
    const filters = layer.filter ? [layer.filter] : [];
    if (layer.type==='symbol' || source==='waterway') filters.push(withinVietnam);
    if (source==='transportation' || source==='transportation_name') filters.push(transportOnly);
    if (source==='place') filters.push(['!', ['in',['get','class'],['literal',['country','continent']]]]);
    const text = layer.layout?.['text-field'];
    const named = layer.type==='symbol' && text && !/shield/i.test(layer.id) && source!=='housenumber';
    return {
      ...layer,
      ...(dark ? {paint:darkPaint(layer)} : {}),
      ...(filters.length ? {filter:['all',...filters]} : {}),
      ...(named ? {layout:{...layer.layout,'text-field':['coalesce',['get','name:vi'],['get','name_vi'],['get','name'],'']}} : {}),
    };
  });
  return {...style,layers};
}
