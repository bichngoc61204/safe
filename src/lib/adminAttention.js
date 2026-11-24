import {qualityIssues,canonicalValue} from './editorial.js';
import {isAlert} from './domain.js';

// Quality counts places once, reports count submissions, trash counts records.
// The tools total is a workload count, not an unread or unique-place count.
export function adminAttention(data,reports=[],now=Date.now()){
 const active=data.places.filter(place=>!place.deletedAt);
 const quality=active.filter(place=>qualityIssues(place,data,now).length);
 const pending=[...new Map(reports.filter(report=>report.status==='new').map(report=>[report.id,report])).values()];
 const groups={};
 for(const kind of ['safe','green','partner']){
  const categoryIds=new Set(data.categories.filter(category=>category.kind===kind).map(category=>category.id));
  const points=data.places.filter(place=>categoryIds.has(place.category));
  const ids=new Set(points.map(place=>place.id));
  const reportCount=pending.filter(report=>ids.has(report.placeId)).length;
  const alertCount=kind==='green'?points.filter(place=>!place.deletedAt&&isAlert(place)).length:0;
  groups[kind]={reports:reportCount,alerts:alertCount,total:reportCount+alertCount};
 }
 const counts={quality:quality.length,reports:pending.length,trash:data.places.length-active.length};
 return {...counts,total:counts.quality+counts.reports+counts.trash,groups};
}

// Only the records reviewed in the confirmation dialog may be removed.
// An edit/restore in another session invalidates the confirmation; later arrivals stay.
export function cleanTrash(data,confirmed){
 if(!confirmed.length)throw Error('catalogConflict');
 const records=new Map(data.places.map(place=>[place.id,place]));
 const same=(a,b)=>JSON.stringify(canonicalValue(a))===JSON.stringify(canonicalValue(b));
 if(confirmed.some(place=>!place.deletedAt||!records.get(place.id)?.deletedAt||!same(place,records.get(place.id))))throw Error('catalogConflict');
 const ids=new Set(confirmed.map(place=>place.id));
 return {...data,places:data.places.filter(place=>!ids.has(place.id))};
}
