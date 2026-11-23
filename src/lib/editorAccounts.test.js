import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const mock=`
const f=()=>globalThis.__editorAccountFixture;
export const initializeApp=(config,name)=>({config,name});
export const deleteApp=async app=>{f().deleted=app.name};
export const inMemoryPersistence='memory';
export const initializeAuth=(app,options)=>{f().persistence=options.persistence;return {app};};
export const createUserWithEmailAndPassword=async(auth,email,password)=>{f().creates++;if(f().exists)throw {code:'auth/email-already-in-use'};return {user:{uid:'child'}};};
export const signInWithEmailAndPassword=async()=>{f().retries++;return {user:{uid:'child'}};};
export const signOut=async()=>{f().signedOut=true};
export const doc=(_db,collection,id)=>collection+'/'+id;
export const getDoc=async ref=>({data:()=>ref==='editors/owner'?f().role:undefined,exists:()=>false});
export const setDoc=async(ref,data)=>{if(f().failGrant)throw Error('permission-denied');f().writes.push({ref,data});};
export const updateDoc=async(ref,data)=>{f().writes.push({ref,data});};
export const serverTimestamp=()=> 'server-time';
`;
const built=await build({entryPoints:['src/lib/editorAccounts.js'],bundle:true,format:'esm',write:false,plugins:[{name:'sdk-mock',setup(builder){
 builder.onResolve({filter:/^firebase\//},()=>({path:'sdk',namespace:'mock'}));
 builder.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock}));
}}]});
const {createEditorAccount,setEditorActive}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const refs={db:{},editor:uid=>'editors/'+uid};
const auth={currentUser:{uid:'owner',isAnonymous:false}};
function fixture(role={active:true,role:'superadmin'}) {return globalThis.__editorAccountFixture={role,creates:0,retries:0,writes:[]};}
const input={email:' CHILD@example.invalid ',displayName:' Child ',password:'fixture-password'};

test('ordinary/disabled editors cannot create accounts, even by calling the backend directly',async()=>{
 for(const role of [{active:true,role:'editor'},{active:false,role:'superadmin'}]){
  const f=fixture(role);
  await assert.rejects(createEditorAccount(refs,auth,{},input),/accountDenied/);
  assert.equal(f.creates,0);assert.equal(f.writes.length,0);
 }
});
test('creating a child preserves primary login, uses memory-only credentials and stores no password',async()=>{
 const f=fixture();const currentUser=auth.currentUser;
 assert.equal(await createEditorAccount(refs,auth,{},input),'child');
 assert.equal(auth.currentUser,currentUser);assert.equal(f.persistence,'memory');
 assert.equal(f.signedOut,true);assert.ok(f.deleted);
 assert.equal(f.writes[0].data.email,'child@example.invalid');assert.equal(f.writes[0].data.role,'editor');
 assert.equal(f.writes[0].data.createdBy,'owner');assert.equal('password' in f.writes[0].data,false);
});
test('interrupted role grants are retryable; failure signs secondary out and never reports success',async()=>{
 const f=fixture();f.exists=true;f.failGrant=true;
 await assert.rejects(createEditorAccount(refs,auth,{},input),/accountGrantFailed/);
 assert.equal(f.retries,1);assert.equal(f.signedOut,true);assert.ok(f.deleted);
});
test('owner cannot suspend its own role; child suspension records the acting owner',async()=>{
 const f=fixture();
 await assert.rejects(setEditorActive(refs,auth,'owner',false),/accountDenied/);
 assert.equal(f.writes.length,0);
 await setEditorActive(refs,auth,'child',false);
 assert.deepEqual(f.writes[0],{ref:'editors/child',data:{active:false,updatedBy:'owner',updatedAt:'server-time'}});
});
