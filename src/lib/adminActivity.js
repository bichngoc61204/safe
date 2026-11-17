import {comparableCategories,placeFieldChanged} from './editorial.js';
// Accept both persisted ISO strings and Firestore timestamps returned by reports.
export function activityTime(value) {
  if(value==null||value==='')return 0;
  const milliseconds=typeof value==='number'?value:value instanceof Date?value.getTime():typeof value?.seconds==='number'?value.seconds*1000+Math.floor((value.nanoseconds||0)/1e6):Date.parse(value);
  return Number.isFinite(milliseconds)?milliseconds:0;
}
export const placeActivityTime=place=>Math.max(activityTime(place.updatedAt),activityTime(place.review?.reviewedAt),activityTime(place.createdAt));
export const reportActivityTime=report=>Math.max(activityTime(report.createdAt),activityTime(report.resolvedAt));
export function newestFirst(items,getTime=item=>activityTime(item.createdAt)) {
  return [...items].sort((a,b)=>getTime(b)-getTime(a)||(b.revision||0)-(a.revision||0));
}
export function historyByDay(events) {
  const days=new Map();
  for(const event of newestFirst(events)){
    const time=activityTime(event.createdAt);
    const day=time?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(time):'unknown';
    if(!days.has(day))days.set(day,[]);
    days.get(day).push(event);
  }
  return [...days].map(([day,events])=>({day,events}));
}
export function historyAction(change,event) {
  const fields=change.fields||[];
  if(fields.includes('created'))return 'added';
  if(fields.includes('removed'))return 'deleted';
  if(fields.includes('deletedAt'))return event.snapshot?.places?.find(place=>place.id===change.id)?.deletedAt?'restored':'deleted';
  return 'edited';
}

// A history record stores the state BEFORE its transaction. The next revision's
// before-snapshot is the exact after-state; use live data only for that revision.
export function historyAfter(event,events,currentData,currentRevision){
 const next=events.find(item=>item.revision===event.revision+1);
 return next?.snapshot||(currentRevision===event.revision?currentData:null);
}
export function readableHistory(event,events,currentData,currentRevision){
 const after=historyAfter(event,events,currentData,currentRevision);
 const changes=event.changes.flatMap(change=>{
  if(!after||change.fields.some(field=>['created','removed'].includes(field)))return [change];
  const old=event.snapshot.places.find(place=>place.id===change.id),next=after.places.find(place=>place.id===change.id);
  const fields=change.fields.filter(field=>field==='categories'
   ?JSON.stringify(comparableCategories(event.snapshot.categories))!==JSON.stringify(comparableCategories(after.categories))
   :placeFieldChanged(old,next,field));
  return fields.length?[{...change,fields}]:[];
 });
 return {...event,changes,after,systemSync:changes.length===0};
}
export function changeValues(event,change){
 const before=event.snapshot.places.find(place=>place.id===change.id);
 const after=event.after?.places.find(place=>place.id===change.id);
 const fields=change.fields.some(field=>['created','removed'].includes(field))?['name','address','phone','category','lat','lng']:change.fields;
 return fields.map(field=>({field,before:field==='categories'?event.snapshot.categories:before?.[field],after:field==='categories'?event.after?.categories:after?.[field],knownAfter:Boolean(event.after)}));
}
