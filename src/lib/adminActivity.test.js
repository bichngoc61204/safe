import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activityTime,placeActivityTime,reportActivityTime,newestFirst,historyByDay,historyAction,historyAfter,readableHistory,changeValues} from './adminActivity.js';

test('activity orders by most recent change, never by names, without mutating input',()=>{
 const records=[{name:'A',updatedAt:'2026-11-15'},{name:'Z',updatedAt:'2026-11-17'},{name:'B',updatedAt:'bad'},{name:'C',updatedAt:'2026-11-16',review:{reviewedAt:'2026-11-18'}}];
 assert.deepEqual(newestFirst(records,placeActivityTime).map(item=>item.name),['C','Z','A','B']);
 assert.equal(records[0].name,'A');
 assert.equal(activityTime('bad'),0);
 assert.equal(activityTime(null),0);
});
test('report activity accepts Firestore timestamps and includes resolution activity',()=>{
 const createdAt='2026-11-17T00:00:00Z',resolvedAt={seconds:Date.parse('2026-11-18T00:00:00Z')/1000,nanoseconds:1000000};
 assert.equal(reportActivityTime({createdAt,resolvedAt}),Date.parse('2026-11-18T00:00:00Z')+1);
});
test('history groups by Vietnam calendar day with newest events first and missing dates last',()=>{
 const records=[{id:'older',createdAt:'2026-11-16T16:00:00Z'},{id:'latest',createdAt:'2026-11-16T18:00:00Z'},{id:'sameDay',createdAt:'2026-11-16T19:00:00Z'},{id:'pending',createdAt:''}];
 assert.deepEqual(historyByDay(records).map(group=>[group.day,group.events.map(event=>event.id)]),[['2026-11-17',['sameDay','latest']],['2026-11-16',['older']],['unknown',['pending']]]);
});
test('history distinguishes create, edit, soft delete, removal and restoration using the old snapshot',()=>{
 const event={snapshot:{places:[{id:'restored',deletedAt:'2026-11-16'},{id:'deleted'}]}};
 assert.equal(historyAction({fields:['created']},event),'added');
 assert.equal(historyAction({fields:['phone']},event),'edited');
 assert.equal(historyAction({fields:['removed']},event),'deleted');
 assert.equal(historyAction({id:'deleted',fields:['deletedAt']},event),'deleted');
 assert.equal(historyAction({id:'restored',fields:['deletedAt','review']},event),'restored');
});

test('history comparisons use the next exact revision, never a later live version',()=>{
 const before={categories:[],places:[{id:'p',phone:'0900000000'}]},after={categories:[],places:[{id:'p',phone:'0911111111'}]},live={categories:[],places:[{id:'p',phone:'0922222222'}]};
 const event={revision:4,snapshot:before,changes:[{id:'p',name:'Place',fields:['phone']}]},next={revision:5,snapshot:after};
 const item=readableHistory(event,[event,next],live,6);
 assert.equal(changeValues(item,item.changes[0])[0].after,'0911111111');
 assert.equal(historyAfter(event,[event],live,6),null);
 assert.equal(historyAfter(next,[next],live,5),live);
});
test('old normalization-only history is grouped as sync while real edits retain exact fields',()=>{
 const before={categories:[],places:[{id:'p',phone:'0900000000'}]};
 const after={categories:[],places:[{id:'p',phone:'0900000000',schedule:{enabled:false,days:[]},visibility:'published',review:{status:'pending'}}]};
 const event={revision:1,snapshot:before,changes:[{id:'p',fields:['schedule','visibility','review']}]};
 assert.equal(readableHistory(event,[event],after,1).systemSync,true);
 const mixed={...event,changes:[{id:'p',fields:['schedule','phone']}]};
 const changed={...after,places:[{...after.places[0],phone:'0911111111'}]};
 assert.deepEqual(readableHistory(mixed,[mixed],changed,1).changes[0].fields,['phone']);
});
