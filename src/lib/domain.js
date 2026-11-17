import {isCommunitySupport,isSupportLevel} from './supportLevels.js';
import { placeText } from './locale.js';
import { groupPalette } from './catalogGroups.js';

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
const searchablePlaceFields=['name','address','owner','waste'];
export function filterPlaces(places,categories,{query='',category='all',scope='map',status='all',position=null,supportLevel='all'}={}) {
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  const groupCategories=scope==='map'?null:new Set(categories.filter(item=>item.kind===scope).map(item=>item.id));
  const matches=places.filter(p=>{
    if(supportLevel!=='all'&&(!isCommunitySupport(getCategory(categories,p.category))||(supportLevel==='unassigned'?isSupportLevel(p.supportLevel):p.supportLevel!==supportLevel)))return false;
    if((category!=='all'&&p.category!==category)||(groupCategories&&!groupCategories.has(p.category))||
      (status!=='all'&&!(status==='alerts'?isAlert(p):p.status===status)))return false;
    if(!terms.length)return true;
    const text=normalize(searchablePlaceFields.flatMap(field=>[p[field],placeText(p,field,'en')]).join(' '));
    return terms.every(term=>text.includes(term));
  });
  if(!position)return matches;
  return matches.map(place=>({place,distance:haversine(position,place)}))
    .sort((a,b)=>a.distance-b.distance).map(({place})=>place);
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

// A group's identity stays consistent across all its subcategories.
export const categoryPalette = category => groupPalette[category?.kind==='service'?'partner':category?.kind]||groupPalette.safe;
export const markerColor = category => categoryPalette(category).marker;
export const categoryColor = category => categoryPalette(category).ink;
