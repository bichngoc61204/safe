// Display-only label masks, not administrative or maritime boundaries.
export const LABEL_MASK_AREAS = [
  {id:'hoang-sa',west:110.5,south:15.5,east:113.3,north:17.8},
  {id:'truong-sa',west:111.3,south:6.3,east:117.5,north:12.5},
];
const maskGeometry={type:'MultiPolygon',coordinates:LABEL_MASK_AREAS.map(b=>[[[b.west,b.south],[b.east,b.south],[b.east,b.north],[b.west,b.north],[b.west,b.south]]])};

/** Restore ordinary place/road labels; suppress provider labels only in the two island areas. */
export function regionalLabelStyle(style,{labelsOnly=false}={}) {
  const outside=['!',['within',maskGeometry]];
  return {
    ...style,
    layers:(style.layers||[])
      .filter(layer=>layer['source-layer']!=='boundary'&&!/boundary|ferry/i.test(layer.id)&&!(layer.type==='symbol'&&/poi|transit|bus|rail_station/i.test(layer.id))&&(!labelsOnly||layer.type==='symbol'))
      .map(layer=>layer.type==='symbol'?{...layer,filter:layer.filter?['all',layer.filter,outside]:outside}:layer),
  };
}
