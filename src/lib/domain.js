export const statuses = ['active','clean','warning','overloaded','inactive'];
export const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export const isAlert = p => ['warning','overloaded'].includes(p.status);
export function haversine(a,b) {
  const r=x=>x*Math.PI/180, dlat=r(b.lat-a.lat),dlng=r(b.lng-a.lng);
  const n=Math.sin(dlat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dlng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(n),Math.sqrt(Math.max(0,1-n)));
}
export function formatDistance(m) { return m<1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`; }
export function getCategory(categories,id) { return categories.find(c=>c.id===id); }
export function filterPlaces(places,categories,{query='',category='all',scope='map',status='all',position=null}={}) {
  return places.filter(p=>{
    const c=getCategory(categories,p.category);
    return (category==='all'||p.category===category) && (scope==='map'||c?.kind===scope) && (status==='all'||(status==='alerts'?isAlert(p):p.status===status)) && normalize(`${p.name} ${p.address} ${p.owner} ${p.waste}`).includes(normalize(query));
  }).sort((a,b)=>position?haversine(position,a)-haversine(position,b):0);
}
export function validData(data) {
  return data && Array.isArray(data.categories) && Array.isArray(data.places) && data.categories.length>0 && new Set(data.categories.map(c=>c.id)).size===data.categories.length && new Set(data.places.map(p=>p.id)).size===data.places.length && data.categories.every(c=>typeof c.id==='string'&&typeof c.name==='string'&&c.name.trim()&&typeof c.nameEn==='string'&&/^#[0-9a-f]{6}$/i.test(c.color)&&['safe','green','partner','service'].includes(c.kind)) && data.places.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()&&typeof p.address==='string'&&p.address.trim()&&getCategory(data.categories,p.category)&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180&&statuses.includes(p.status));
}
export function safeImage(url) {
 try{return ['https:','http:'].includes(new URL(url).protocol)?url:'';}catch{return '';}}
export function placePhotoUrls(place) {
  const gallery=Array.isArray(place.images)?place.images:[];
  return [...new Set([place.image,...gallery].map(safeImage).filter(Boolean))];
}
export const directionsUrl = p => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
export const isDemoPhone = phone => /^000 000 \d{4}$/.test(phone || '');
export const phoneHref = phone => `tel:${String(phone||'').replace(/[^+\d]/g,'')}`;

// Keep custom admin colors; map the sample palette to recognizable functional groups.
export function markerColor(category) {
 const legacy=['#3788c9','#817bb5','#dd7683','#9a80c0','#cc984f','#199569','#7c9d52'];
 if(legacy.includes(category.color?.toLowerCase())) return {safe:'#3582bc',health:'#cf6c78',admin:'#4e6089',education:'#4e6089',green:'#22936a',partner:'#72964d',service:'#bd9556'}[category.id] || {safe:'#3582bc',green:'#22936a',partner:'#72964d',service:'#bd9556'}[category.kind];
 return category.color;
}
