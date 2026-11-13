// Explicit opt-in smoke test for the configured Firebase project.
// Only its uniquely named QA place/category are changed. Existing records are preserved.
// Their cleanup remains recoverable from the normal catalog history.
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signInAnonymously} from 'firebase/auth';
import {getFirestore,doc,getDoc,getDocs,collection,query,orderBy,limit,onSnapshot,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';
import {catalogRefs,writeManagedCatalog} from '../src/lib/firebaseCatalog.js';
import {readFirebaseConfig} from '../src/lib/firebaseConfig.js';
import {defaultSchedule,publicCatalog} from '../src/lib/editorial.js';
import {parseImportRows} from '../src/lib/importCatalog.js';
if(!process.argv.includes('--write-demo'))throw Error('Requires --write-demo. This test writes and cleans up a temporary QA record.');
const {config}=readFirebaseConfig(process.env);
if(!config)throw Error('Missing Firebase configuration.');
console.log('Ready for editor credentials on stdin (hidden).');
const credentials=await new Promise((resolve,reject)=>{
 let input='';if(process.stdin.isTTY)process.stdin.setRawMode(true);
 process.stdin.on('data',chunk=>{input+=chunk.toString();if(!input.includes('\n'))return;
  if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();
  try{resolve(JSON.parse(input.trim()));}catch{reject(Error('Invalid credential input.'));}
 });
});
const refs=catalogRefs(config),auth=getAuth(refs.app);
const guestApp=initializeApp(config,'safemap-live-guest'),guestDb=getFirestore(guestApp);
const id=`qa-live-${Date.now()}`,categoryId=`${id}-category`;
let checks=0,created=false,stop,baseline;
const observed=[];
const check=async(name,action)=>{await action();checks++;console.log(`PASS ${name}`);};
const denied=action=>assert.rejects(action,error=>error.code==='permission-denied');
async function current(){const snapshot=await getDoc(refs.management);const result=snapshot.exists()?snapshot:await getDoc(refs.catalog);return {data:{categories:result.data().categories,places:result.data().places},revision:result.data().revision};}
async function mutate(transform){const before=await current();await writeManagedCatalog(refs,transform(structuredClone(before.data)),before.revision,auth.currentUser);return (await current()).revision;}
const pointPatch=patch=>mutate(data=>({...data,places:data.places.map(place=>place.id===id?{...place,...patch}:place)}));
const readPrivate=async()=>(await current()).data.places.find(place=>place.id===id);
const readPublic=async()=>(await getDoc(doc(guestDb,'catalogs/an-thuong'))).data().places.find(place=>place.id===id);
try{
 await signInWithEmailAndPassword(auth,credentials.email,credentials.password);
 await check('Editor and deployed private-data Rules are active',async()=>{
  assert.equal((await getDoc(refs.editor(auth.currentUser.uid))).data()?.active,true);
  baseline=await current();assert.ok(baseline.data.places.length>0);
 });
 await check('Public catalog readable; management and history reject guests',async()=>{
  assert.ok((await getDoc(doc(guestDb,'catalogs/an-thuong'))).exists());
  await denied(getDoc(doc(guestDb,'management/an-thuong')));
  await denied(getDocs(collection(guestDb,'catalogHistory')));
 });
 stop=onSnapshot(refs.catalog,snapshot=>{if(!snapshot.metadata.hasPendingWrites)observed.push(snapshot.data()?.revision);});
 const schedule=defaultSchedule();schedule.enabled=true;
 const qa={id,name:'QA • Điểm kiểm thử tạm',nameEn:'QA • Temporary test place',category:categoryId,address:'An Thượng — vị trí kiểm thử',addressEn:'An Thuong — test location',lat:16.0505,lng:108.2435,status:'clean',visibility:'hidden',review:{status:'pending'},source:'QA tự động — sẽ dọn sau kiểm thử',phone:'000 000 9900',owner:'SafeMap QA',image:'',images:[],description:'Dữ liệu kiểm thử tự động, không phải địa điểm thật.',schedule,wasteTypes:['battery']};
 let editRevision;
 await check('Create category and hidden place atomically with immutable history',async()=>{
  await mutate(data=>({...data,categories:[...data.categories,{id:categoryId,name:'QA tạm',nameEn:'Temporary QA',kind:'green',icon:'recycle',color:'#237452'}],places:[...data.places,qa]}));created=true;
  assert.ok(await readPrivate());assert.equal(await readPublic(),undefined);
 });
 await check('Publishing immediately updates public catalog',async()=>{
  await pointPatch({visibility:'published'});assert.equal((await readPublic()).id,id);
 });
 await check('Edits, hours and waste filters persist; English-only edits are saved',async()=>{
  const changed=defaultSchedule(qa);changed.days[4]={closed:false,allDay:false,opensAt:'20:00',closesAt:'02:00'};changed.exceptions=[{date:'2026-12-25',closed:true,allDay:false,opensAt:'08:00',closesAt:'17:00'}];
  editRevision=await pointPatch({schedule:changed,wasteTypes:['paper','plastic'],phone:'000 000 9901',description:'QA cập nhật'});
  await pointPatch({descriptionEn:'QA English-only update'});
  const point=await readPublic();assert.equal(point.descriptionEn,'QA English-only update');assert.equal(point.schedule.days[4].closesAt,'02:00');assert.deepEqual(point.wasteTypes,['paper','plastic']);
 });
 await check('Verification exposes date but hides internal reviewer information',async()=>{
  await pointPatch({review:{status:'verified'}});const point=await readPublic();assert.ok(point.verifiedAt);assert.equal(point.review,undefined);assert.ok((await readPrivate()).review.reviewedBy);
 });
 await check('Hide, soft delete and restore preserve private place data',async()=>{
  await pointPatch({visibility:'hidden'});assert.equal(await readPublic(),undefined);
  await pointPatch({deletedAt:new Date().toISOString()});assert.ok((await readPrivate()).deletedAt);
  await pointPatch({deletedAt:null,visibility:'hidden',review:{status:'pending'}});assert.equal((await readPrivate()).deletedAt,null);assert.equal(await readPublic(),undefined);
 });
 await check('History can restore the previous place version without reverting other records',async()=>{
  const event=(await getDoc(doc(refs.db,'catalogHistory',String(editRevision)))).data();
  assert.equal(event.actor,auth.currentUser.uid);const old=event.snapshot.places.find(place=>place.id===id);assert.ok(old);
  await mutate(data=>({...data,places:data.places.map(place=>place.id===id?{...old,visibility:'hidden',review:{status:'pending'}}:place)}));
  assert.equal((await readPrivate()).phone,'000 000 9900');
  await denied(updateDoc(doc(refs.db,'catalogHistory',String(editRevision)),{actor:'altered'}));
 });
 await check('Stale revision is rejected instead of overwriting concurrent changes',async()=>{
  const latest=await current();await assert.rejects(writeManagedCatalog(refs,latest.data,latest.revision-1,auth.currentUser),/catalogConflict/);
 });
 await check('Excel preview/update merges only its selected QA point',async()=>{
  const latest=await current();const [row]=parseImportRows([['id','category','name','address','lat','lng','descriptionEn'],[id,categoryId,qa.name,qa.address,qa.lat,qa.lng,'Updated from Excel preview']],latest.data,{update:true});assert.deepEqual(row.errors,[]);
  await mutate(data=>({...data,places:data.places.map(place=>place.id===id?row.point:place)}));assert.equal((await readPrivate()).descriptionEn,'Updated from Excel preview');assert.equal(await readPublic(),undefined);
 });
 await check('Anonymous report creation, duplicate prevention and admin resolution work',async()=>{
  const user=(await signInAnonymously(getAuth(guestApp))).user;
  const now=new Date(),day=`${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}`;
  const demo=baseline.data.places.find(place=>place.id==='demo-v2-green-collection')||baseline.data.places[0];
  const reportId=`${user.uid}_${day}_${demo.id}`,ref=doc(guestDb,'placeReports',reportId);
  const report={placeId:demo.id,placeName:demo.name,reason:'otherReport',note:'[QA tự động] Kiểm tra Rules và hộp phản ánh; không phải phản ánh thực tế.',uid:user.uid,day,status:'new',createdAt:serverTimestamp()};
  await setDoc(ref,report);assert.ok((await getDoc(ref)).exists());
  await denied(setDoc(ref,report));await denied(getDocs(collection(guestDb,'placeReports')));
  await updateDoc(doc(refs.db,'placeReports',reportId),{status:'resolved',resolution:'Đã kiểm thử thành công — dữ liệu QA.',resolvedBy:auth.currentUser.uid,resolvedAt:serverTimestamp()});
  assert.equal((await getDoc(ref)).data().status,'resolved');
  await denied(getDoc(doc(guestDb,'management/an-thuong')));
 });
 await check('Realtime listener receives committed revisions',async()=>{assert.ok(new Set(observed).size>=3);});
}finally{
 if(created){
  await mutate(data=>({...data,places:data.places.filter(place=>place.id!==id),categories:data.categories.filter(category=>category.id!==categoryId)}));
  const final=await current();assert.equal(final.data.places.some(place=>place.id===id),false);
  for(const point of baseline.data.places)assert.deepEqual(final.data.places.find(item=>item.id===point.id),point,'Existing point changed during QA');
  for(const category of baseline.data.categories)assert.deepEqual(final.data.categories.find(item=>item.id===category.id),category,'Existing category changed during QA');
  console.log('CLEANUP QA place/category removed; all original records preserved. History and one resolved QA report retained.');
 }
 stop?.();await Promise.all([deleteApp(refs.app),deleteApp(guestApp)]);
}
console.log(`RESULT ${checks} live Firebase checks passed.`);
