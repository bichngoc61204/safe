import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeEditorActivity,loadEditorActivity} from './editorStats.js';

test('per-person totals count points in batch imports, status as a subset of edits, and trash separately',()=>{
 const events=[{actor:'a',actorEmail:'a@example.invalid',createdAt:'2026-11-20T00:00:00Z',changes:[{id:'1',fields:['created']},{id:'2',fields:['created']}]},
 {actor:'b',createdAt:'2026-11-21T00:00:00Z',changes:[{id:'1',fields:['phone','status']},{id:'2',fields:['deletedAt']},{id:'categories',fields:['categories']}]},
 {actor:'a',createdAt:'2026-11-22T00:00:00Z',changes:[{id:'1',fields:['name']},{id:'1',fields:['name']}]}];
 const rows=summarizeEditorActivity(events);
 assert.equal(rows.find(row=>row.uid==='a').added,2);
 assert.equal(rows.find(row=>row.uid==='a').edited,1);
 assert.equal(rows.find(row=>row.uid==='b').status,1);
 assert.equal(rows.find(row=>row.uid==='b').trash,1);
 assert.equal(rows.find(row=>row.uid==='b').categories,1);
 assert.equal(summarizeEditorActivity(events,Date.parse('2026-11-21'))[0].added,0);
});

const encodeEvent=revision=>({document:{fields:{revision:{integerValue:String(revision)},actor:{stringValue:'a'},createdAt:{timestampValue:'2026-11-22T00:00:00Z'},changes:{arrayValue:{values:[{mapValue:{fields:{id:{stringValue:'p'},name:{stringValue:'Place'},fields:{arrayValue:{values:[{stringValue:'status'}]}}}}}]}}}}});
test('audit projection paginates beyond 40 records without loading catalog snapshots',async()=>{
 const queries=[];
 const events=await loadEditorActivity({projectId:'fixture',getIdToken:async()=>'token',fetcher:async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer token');
  const query=JSON.parse(options.body).structuredQuery;queries.push(query);
  return {ok:true,json:async()=>queries.length===1?Array.from({length:200},(_,i)=>encodeEvent(201-i)):[encodeEvent(1)]};
 }});
 assert.equal(events.length,201);assert.equal(events[0].changes[0].fields[0],'status');
 assert.equal(queries[0].select.fields.some(field=>field.fieldPath==='snapshot'),false);
 assert.deepEqual(queries[1].startAt,{values:[{integerValue:'2'}],before:false});
 assert.equal(summarizeEditorActivity(events)[0].status,201);
});
test('audit errors never turn into a successful zero count; cancellation stops all reads',async()=>{
 assert.throws(()=>summarizeEditorActivity([{changes:[null]}]),/accountActivityError/);
 assert.throws(()=>summarizeEditorActivity([{changes:[{id:'x',fields:42}]}]),/accountActivityError/);
 await assert.rejects(loadEditorActivity({projectId:'fixture',getIdToken:async()=>null}),/accountDenied/);
 await assert.rejects(loadEditorActivity({projectId:'fixture',getIdToken:async()=>'token',fetcher:async()=>({ok:false,status:403})}),/accountDenied/);
 await assert.rejects(loadEditorActivity({projectId:'fixture',getIdToken:async()=>'token',fetcher:async()=>({ok:true,json:async()=>({error:'bad'})})}),/accountActivityError/);
 const invalid=encodeEvent(1);invalid.document.fields.changes.arrayValue.values[0].mapValue.fields.fields={stringValue:'wrong-type'};
 await assert.rejects(loadEditorActivity({projectId:'fixture',getIdToken:async()=>'token',fetcher:async()=>({ok:true,json:async()=>[invalid]})}),/accountActivityError/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(loadEditorActivity({projectId:'fixture',signal:controller.signal,getIdToken:()=>{throw Error('should not execute');}}),{name:'AbortError'});
});
