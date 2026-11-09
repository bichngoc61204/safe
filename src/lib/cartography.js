import vietnamLand from '../data/vietnam-label-area.geojson.json' with { type:'json' };

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
  if (layer.type==='fill-extrusion') paint['fill-extrusion-color']=dark?'#536b7e':'#e4dfce';
  if (layer.type==='fill') {
    paint['fill-color']=(dark?darkAreaColors:standardAreaColors)[source];
    if(source==='landcover'&&/sand|beach/i.test(layer.id))paint['fill-color']=dark?'#575044':'#f2dfaf';
    if(source==='landuse'&&/residential|suburb|neighbourhood/i.test(layer.id)){
      paint['fill-color']=dark?'#344353':'#ece9df';
    }
    if(source==='building') {
      if(layer.id.startsWith('safemap-building-shadow-'))paint['fill-color']=dark?'#121a25':'#727b70';
      else paint['fill-outline-color']=dark?'#506175':'#bdbcb0';
    }else if ('fill-outline-color' in paint) {
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

function addBuildingDepth(layers) {
  const footprintIndex=layers.findIndex(layer=>layer.type==='fill'&&layer['source-layer']==='building');
  if(footprintIndex<0)return;
  const {source}=layers[footprintIndex];
  const height=['max',0,['to-number',['get','render_height'],0]];
  const base=['min',height,['max',0,['to-number',['get','render_min_height'],0]]];
  const hasVolume=['all',['>',height,0],['!', ['in',['to-string',['get','hide_3d']],['literal',['true','1']]]]];
  const geometry={source,'source-layer':'building'};
  const bands=[
    {from:0,to:12,reach:5},
    {from:12,to:28,reach:11},
    {from:28,to:55,reach:19},
    {from:55,reach:30},
  ];
  const shadow=bands.flatMap(({from,to,reach})=>{
    const filter=['all',hasVolume,['>=',height,from],...(to?[['<',height,to]]:[])];
    // Two overlapping silhouettes keep long tower shadows joined to the footprint.
    return (reach>=19?[.55,1]:[1]).map(fraction=>{
      const distance=reach*fraction;
      const offset=scale=>['literal',[distance*scale,distance*scale*.72]];
      return {
        ...geometry,id:`safemap-building-shadow-${from}-${fraction===1?'far':'near'}`,type:'fill',minzoom:14.5,filter,
        paint:{
          'fill-translate':['interpolate',['exponential',1.7],['zoom'],14.5,offset(.14),16,offset(.4),18,offset(1)],
          'fill-translate-anchor':'map',
          'fill-opacity':['interpolate',['linear'],['zoom'],14.5,0,15.6,.16,17,fraction===1?.29:.22],
        },
      };
    });
  });
  layers.splice(footprintIndex,0,...shadow);

  // Keep the Leaflet camera flat so route lines and markers stay on the ground plane.
  // Perspective and directional light still expose the sides of tall volumes.
  const firstLabel=layers.findIndex((layer,index)=>index>footprintIndex+shadow.length&&layer.type==='symbol');
  layers.splice(firstLabel<0?layers.length:firstLabel,0,{
    ...geometry,id:'safemap-building-volume',type:'fill-extrusion',minzoom:14.8,filter:hasVolume,
    paint:{
      'fill-extrusion-height':['interpolate',['linear'],['zoom'],14.8,0,16.3,height],
      'fill-extrusion-base':['interpolate',['linear'],['zoom'],14.8,0,16.3,base],
      'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],14.8,0,15.5,.78,16.3,1],
      'fill-extrusion-vertical-gradient':true,
    },
  });
}

export function regionalLabelStyle(style,{labelsOnly=false,standard=false,buildingDepth=false}={}) {
  const layers = (style.layers||[]).filter(layer=>allowedLayer(layer,labelsOnly)).map(layer=>{
    const source = layer['source-layer'];
    const filters = layer.filter ? [layer.filter] : [];
    if (layer.type==='symbol' || source==='waterway') {
      const roadName = layer.type==='symbol' && source==='transportation_name';
      filters.push(roadName ? ['any',withinVietnam,daNangRoadLabels] : withinVietnam);
    }
    if (source==='transportation' || source==='transportation_name') filters.push(transportOnly);
    if (source==='place') filters.push(['!', ['in',['get','class'],['literal',['country','continent']]]]);
    const text = layer.layout?.['text-field'];
    const named = layer.type==='symbol' && text && !/shield/i.test(layer.id) && source!=='housenumber';
    const detailZoom = {'highway-name-minor':13.75,'highway-name-path':14.5}[layer.id];
    const layout = named ? {...layer.layout,'text-field':['coalesce',['get','name:vi'],['get','name_vi'],['get','name'],'']} : layer.layout;
    if(detailZoom!=null&&named)layout['symbol-spacing']=170;
    return {
      ...layer,
      ...(filters.length ? {filter:['all',...filters]} : {}),
      ...(named ? {layout} : {}),
      ...(detailZoom!=null ? {minzoom:detailZoom} : {}),
    };
  });
  if(standard) {
    if(buildingDepth)addBuildingDepth(layers);
    return {
      ...style,transition:{duration:280,delay:0},
      ...(buildingDepth&&{light:{anchor:'map',position:[1.5,305,55],color:'#fff5e4',intensity:.64}}),
      layers:layers.map(layer=>({...layer,paint:standardPaint(layer,false)})),
    };
  }
  return {...style,layers};
}
