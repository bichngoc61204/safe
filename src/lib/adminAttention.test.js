import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminAttention,cleanTrash} from './adminAttention.js';

const catalog=()=>({categories:[{id:'s',kind:'safe'},{id:'g',kind:'green'},{id:'p',kind:'partner'}],places:[
 {id:'a',name:'A',address:'A',category:'s',lat:16.05,lng:108.24},
 {id:'b',name:'B',address:'B',category:'g',lat:16.06,lng:108.25,status:'overloaded'},
 {id:'c',name:'C',address:'C',category:'p',lat:16.07,lng:108.26,deletedAt:'2026-11-24',visibility:'hidden'},
]});

test('attention counts each quality place once and pending reports independently of trash',()=>{
 const data=catalog();
 const report={id:'r',placeId:'a',status:'new'};
 const result=adminAttention(data,[report,{...report},{id:'done',status:'resolved'}]);
 assert.equal(result.quality,2);assert.equal(result.reports,1);assert.equal(result.trash,1);assert.equal(result.total,4);
 assert.equal(result.groups.safe.total,1);assert.equal(result.groups.green.alerts,1);
 assert.equal(data.places.length,3);
});
test('reports about deleted or unavailable places remain actionable and group alerts exclude trashed points',()=>{
 const data=catalog();data.places[1].deletedAt='2026-11-24';
 const result=adminAttention(data,[{id:'old',placeId:'c',status:'new'},{id:'unknown',placeId:'missing',status:'new'}]);
 assert.equal(result.reports,2);assert.equal(result.groups.partner.reports,1);assert.equal(result.groups.green.alerts,0);
});
test('empty trash removes only confirmed records and preserves active, hidden and newly trashed records',()=>{
 const data=catalog(),confirmed=structuredClone([data.places[2]]);
 data.places[0].visibility='hidden';
 data.places.push({id:'later',deletedAt:'2026-11-25'});
 const result=cleanTrash(data,confirmed);
 assert.deepEqual(result.places.map(p=>p.id),['a','b','later']);
 assert.equal(result.places[0].visibility,'hidden');assert.equal(data.places.length,4);
});
test('confirmation is invalidated by concurrent edits, restoration or removal',()=>{
 for(const change of [p=>({...p,name:'Edited'}),p=>({...p,deletedAt:null}),()=>null]){
  const data=catalog(),confirmed=structuredClone([data.places[2]]),next=change(data.places[2]);
  data.places=next?[...data.places.slice(0,2),next]:data.places.slice(0,2);
  assert.throws(()=>cleanTrash(data,confirmed),/catalogConflict/);
 }
});
test('empty or non-trash confirmations cannot remove records',()=>{
 const data=catalog();assert.throws(()=>cleanTrash(data,[]),/catalogConflict/);
 assert.throws(()=>cleanTrash(data,[data.places[0]]),/catalogConflict/);
});
