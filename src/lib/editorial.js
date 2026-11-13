import { normalize, safeImage, haversine, isDemoPhone } from './domain.js';
import { isClockTime } from './placeHours.js';
export const wasteTypes=['battery','electronics','plastic','paper','glass','metal','organic','general'];
export const reportReasons=['wrongPhone','wrongLocation','closedPlace','wrongHours','wrongWaste','otherReport'];
export const isPublished=place=>!place.deletedAt&&place.visibility!=='hidden';
export function publicCatalog(data){
 return {categories:data.categories,places:data.places.filter(isPublished).map(place=>{
  const {deletedAt,deletedBy,previousVisibility,reviewNotes,reviewedBy,review,...record}=place;
  if(review?.status==='verified'&&review.reviewedAt)record.verifiedAt=review.reviewedAt;
  else delete record.verifiedAt;
  return record;
 })};
}
export function placeWasteTypes(place){
 if(Array.isArray(place.wasteTypes)&&place.wasteTypes.length)return place.wasteTypes;
 const text=normalize(place.waste);
 return wasteTypes.filter(id=>({battery:/pin|batter/,electronics:/dien tu|electronic/,plastic:/nhua|plastic/,paper:/giay|carton|paper/,glass:/thuy tinh|glass/,metal:/kim loai|metal|lon nhom/,organic:/huu co|organic/,general:/sinh hoat|general/}[id]).test(text));
}
const localFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const localParts=date=>Object.fromEntries(localFormatter.formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
const minutes=value=>Number(value.slice(0,2))*60+Number(value.slice(3));
export function validSchedule(schedule){
 const validDay=day=>day&&typeof day.closed==='boolean'&&typeof day.allDay==='boolean'&&(day.closed||day.allDay||(isClockTime(day.opensAt)&&isClockTime(day.closesAt)&&day.opensAt!==day.closesAt));
 return schedule&&typeof schedule.enabled==='boolean'&&Array.isArray(schedule.days)&&schedule.days.length===7&&schedule.days.every(validDay)&&Array.isArray(schedule.exceptions)&&schedule.exceptions.length<=24&&schedule.exceptions.every(day=>/^\d{4}-\d{2}-\d{2}$/.test(day.date)&&Number.isFinite(Date.parse(day.date+'T00:00:00Z'))&&new Date(day.date+'T00:00:00Z').toISOString().slice(0,10)===day.date&&validDay(day))&&new Set(schedule.exceptions.map(day=>day.date)).size===schedule.exceptions.length;
}
export function defaultSchedule(place={}){
 const opensAt=isClockTime(place.opensAt)?place.opensAt:'08:00',closesAt=isClockTime(place.closesAt)?place.closesAt:'17:00';
 return place.schedule?structuredClone(place.schedule):{enabled:false,days:Array.from({length:7},()=>({closed:false,allDay:false,opensAt,closesAt})),exceptions:[]};
}
export function openingState(place,now=new Date()){
 if(place.status==='inactive')return 'closed';
 const schedule=place.schedule;
 if(!schedule?.enabled||!validSchedule(schedule))return 'unknown';
 const p=localParts(now),date=`${p.year}-${p.month}-${p.day}`;
 const today=new Date(date+'T00:00:00Z'),yesterday=new Date(today.getTime()-86400000).toISOString().slice(0,10);
 const dayFor=stamp=>schedule.exceptions.find(day=>day.date===stamp)||schedule.days[(new Date(stamp+'T00:00:00Z').getUTCDay()+6)%7];
 const day=dayFor(date),previous=dayFor(yesterday),time=Number(p.hour)*60+Number(p.minute);
 if(schedule.exceptions.some(item=>item.date===date&&item.closed))return 'closed';
 if(!day.closed&&(day.allDay||(minutes(day.opensAt)<minutes(day.closesAt)?time>=minutes(day.opensAt)&&time<minutes(day.closesAt):time>=minutes(day.opensAt))))return 'open';
 if(!previous.closed&&!previous.allDay&&minutes(previous.opensAt)>minutes(previous.closesAt)&&time<minutes(previous.closesAt))return 'open';
 return 'closed';
}
export function qualityIssues(place,data,now=Date.now()){
 const issues=[];
 if(isDemoPhone(place.phone)||!/^\+?\d{9,15}$/.test(String(place.phone||'').replace(/[\s()-]/g,'')))issues.push('qualityPhone');
 if(!safeImage(place.image))issues.push('qualityPhoto');
 if(!place.schedule?.enabled)issues.push('qualityHours');
 if(!place.nameEn?.trim()||!place.addressEn?.trim()||(place.description&&!place.descriptionEn?.trim()))issues.push('qualityEnglish');
 if(!place.source?.trim())issues.push('qualitySource');
 if(place.review?.status!=='verified'||!place.review.reviewedAt||now-Date.parse(place.review.reviewedAt)>90*86400000)issues.push('qualityReview');
 const kind=data.categories.find(category=>category.id===place.category)?.kind;
 if(kind==='green'&&!placeWasteTypes(place).length)issues.push('qualityWaste');
 if(place.lat<16.02||place.lat>16.09||place.lng<108.20||place.lng>108.28)issues.push('qualityArea');
 if(data.places.some(other=>other.id!==place.id&&!other.deletedAt&&((normalize(other.name.trim())===normalize(place.name.trim())&&normalize(other.address.trim())===normalize(place.address.trim()))||haversine(other,place)<12)))issues.push('qualityDuplicate');
 return issues;
}
export function catalogChanges(before,after){
 const fields=['name','nameEn','category','address','addressEn','phone','owner','ownerEn','waste','wasteEn','wasteTypes','status','visibility','deletedAt','image','images','opensAt','closesAt','hours','hoursEn','schedule','description','descriptionEn','source','review','lat','lng'];
 const records=new Map(before.places.map(place=>[place.id,place]));
 const changes=after.places.flatMap(place=>{
  const old=records.get(place.id);records.delete(place.id);
  const changed=old?fields.filter(key=>JSON.stringify(old[key]??null)!==JSON.stringify(place[key]??null)):['created'];
  return changed.length?[{id:place.id,name:place.name,fields:changed}]:[];
 });
 for(const place of records.values())changes.push({id:place.id,name:place.name,fields:['removed']});
 if(JSON.stringify(before.categories)!==JSON.stringify(after.categories))changes.push({id:'categories',name:'categories',fields:['categories']});
 return changes;
}
export const shareUrl=(place,origin=window.location.origin)=>`${origin}/?place=${encodeURIComponent(place.id)}`;
