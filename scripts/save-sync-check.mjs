// Delayed Firestore observer integration checks. Uses a mock SDK; no live writes.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {writeFile,unlink} from 'node:fs/promises';
import {makeTestCatalog} from './catalog.fixture.mjs';
import {publicCatalog} from '../src/lib/editorial.js';
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost:5173/'});
for(const key of ['window','document','HTMLElement','Node','Event'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const output=new URL('../.save-sync-generated.mjs',import.meta.url);
const compiled=await build({entryPoints:['src/components/useFirebaseBackend.js'],bundle:true,format:'esm',platform:'node',packages:'external',write:false,
 define:{'import.meta.env':JSON.stringify({VITE_FIREBASE_API_KEY:'fixture',VITE_FIREBASE_AUTH_DOMAIN:'example.invalid',VITE_FIREBASE_PROJECT_ID:'fixture',VITE_FIREBASE_APP_ID:'fixture'})},
 plugins:[{name:'firebase-fixture',setup(builder){
  builder.onResolve({filter:/firebaseBackend\.js$/},()=>({path:'fixture',namespace:'firebase-fixture'}));
  builder.onLoad({filter:/.*/,namespace:'firebase-fixture'},()=>({contents:'export const connectFirebase=()=>window.firebaseFixture;'}));
 }}],
});
await writeFile(output,compiled.outputFiles[0].text);
let root;
try{
 const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');
 const {useFirebaseBackend}=await import(output.href);
 const data=makeTestCatalog(),point=data.places.find(place=>place.category==='safe');
 point.supportLevel='safe_point';
 let managementObserver,catalogObserver,editorObserver,resolveSave,rejectSave;
 window.firebaseFixture={
  observeCatalog(receive){catalogObserver=receive;receive({data:publicCatalog(data),revision:1,cached:false});return ()=>{};},
  observeManagement(receive){managementObserver=receive;receive({data,revision:1,cached:false});return ()=>{};},
  observeEditor(receive){editorObserver=receive;receive({status:'editor',uid:'fixture',email:'editor@example.invalid'});return ()=>{};},
  save(){return new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;});},
 };
 let state;
 function Harness(){state=useFirebaseBackend();return React.createElement('output',null,state.management?.revision||0);}
 root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(Harness)));
 assert.equal(state.management.revision,1);
 const next=structuredClone(data);next.places.find(place=>place.id===point.id).supportLevel='safe_hub';
 const confirmed=structuredClone(next);confirmed.places.find(place=>place.id===point.id).review={status:'verified',reviewedAt:'2026-11-17T00:00:00.000Z',reviewedBy:'fixture'};
 let pending;
 await act(async()=>{pending=state.save(next,1);});
 assert.equal(state.management.data.places.find(place=>place.id===point.id).supportLevel,'safe_point','Do not show unsaved draft before server confirmation');
 await act(async()=>{resolveSave({data:confirmed,revision:2});await pending;});
 assert.equal(state.management.data.places.find(place=>place.id===point.id).supportLevel,'safe_hub','Confirmed level is visible without waiting for management observer');
 assert.equal(state.management.data.places.find(place=>place.id===point.id).review.reviewedAt,'2026-11-17T00:00:00.000Z','Retain backend-enriched review metadata');
 assert.equal(state.catalog.data.places.find(place=>place.id===point.id).supportLevel,'safe_hub','Public projection immediately uses confirmed level');
 assert.equal(state.catalog.data.places.find(place=>place.id===point.id).review,undefined,'Private review metadata stays out of public projection');
 await act(async()=>{managementObserver({data,revision:1,cached:true});catalogObserver({data:publicCatalog(data),revision:1,cached:true});});
 assert.equal(state.management.revision,2,'Late observer cannot roll management backward');
 assert.equal(state.catalog.revision,2,'Late observer cannot roll public catalog backward');
 await act(async()=>{pending=state.save(next,2);});
 const newer=structuredClone(confirmed);newer.places.find(place=>place.id===point.id).supportLevel='family_friendly';
 await act(async()=>managementObserver({data:newer,revision:4,cached:false}));
 await act(async()=>{resolveSave({data:confirmed,revision:3});await pending;});
 assert.equal(state.management.revision,4,'A newer observer wins over an older confirmed save response');
 assert.equal(state.management.data.places.find(place=>place.id===point.id).supportLevel,'family_friendly');
 let failed;
 await act(async()=>{pending=state.save(next,4).catch(error=>{failed=error.message;});});
 await act(async()=>{rejectSave(Error('catalogConflict'));await pending;});
 assert.equal(failed,'catalogConflict');
 assert.equal(state.management.revision,4,'Failed save does not replace current data');
 await act(async()=>{pending=state.save(next,4);editorObserver({status:'signedOut'});});
 await act(async()=>{resolveSave({data:confirmed,revision:5});await pending;});
 assert.equal(state.management,null,'A completed save cannot restore private state after sign-out');
 console.log('PASS: delayed-save synchronization, stale observer protection, confirmed metadata, failure and sign-out checks (mock SDK; no live writes).');
}finally{
 if(root){const {act}=await import('react');await act(async()=>root.unmount());}
 await unlink(output).catch(()=>{});dom.window.close();
}
