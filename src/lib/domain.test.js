import { regionalLabelStyle } from './cartography.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPlaces } from './data.js';
import { cloneDefaults, filterPlaces, haversine, formatDistance, validData, loadData, saveData, STORAGE_KEY, safeImage, isAlert, osmDirectionsUrl, markerColor } from './domain.js';
function memory(){const entries=new Map();return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};}
test('sample dataset has two GreenPoints and all records are valid',()=>{const d=cloneDefaults();assert.equal(validData(d),true);assert.equal(d.places.filter(p=>p.category==='green').length,2);});
test('search ignores Vietnamese accents and supports accepted materials',()=>{const d=cloneDefaults();assert.equal(filterPlaces(d.places,d.categories,{query:'phuoc thien'}).length,1);assert.ok(filterPlaces(d.places,d.categories,{query:'rac dien tu'}).length);});
test('SafePoint includes safety, public offices, healthcare and schools',()=>{const d=cloneDefaults();const rows=filterPlaces(d.places,d.categories,{scope:'safe'});assert.deepEqual(new Set(rows.map(p=>p.category)),new Set(['police','safe','admin','health','education']));});
test('GreenPoint alerts exclude other categories and inactive records',()=>{const d=cloneDefaults();const rows=filterPlaces(d.places,d.categories,{scope:'green',status:'alerts'});assert.equal(rows.length,1);assert.ok(rows.every(isAlert));assert.ok(rows.every(p=>p.category==='green'));});
test('distance formula handles zero, known equatorial distance and nearest ordering',()=>{assert.equal(haversine({lat:0,lng:0},{lat:0,lng:0}),0);assert.ok(Math.abs(haversine({lat:0,lng:0},{lat:0,lng:1})-111195)<2);assert.equal(formatDistance(350),'350m');assert.equal(formatDistance(1200),'1.2km');const d=cloneDefaults(),position=d.places[4];assert.equal(filterPlaces(d.places,d.categories,{position})[0].id,position.id);});
test('created, updated and deleted records survive reloading storage',()=>{const s=memory(),d=cloneDefaults(),p={...d.places[0],id:'test-created'};d.places.push(p);saveData(s,d);assert.equal(loadData(s).data.places.at(-1).id,p.id);d.places.at(-1).name='Updated';saveData(s,d);assert.equal(loadData(s).data.places.at(-1).name,'Updated');d.places=d.places.filter(x=>x.id!==p.id);saveData(s,d);assert.equal(loadData(s).data.places.length,defaultPlaces.length);});
test('category edits persist; duplicate IDs, orphan categories and invalid coordinates are rejected',()=>{const s=memory(),d=cloneDefaults();d.categories[0].name='Điểm hỗ trợ';saveData(s,d);assert.equal(loadData(s).data.categories[0].name,'Điểm hỗ trợ');const invalid=structuredClone(d);invalid.places[0].lat=95;assert.throws(()=>saveData(s,invalid));invalid.places[0].lat=16;invalid.places[0].category='missing';assert.equal(validData(invalid),false);invalid.places[0].category='safe';invalid.places.push(invalid.places[0]);assert.equal(validData(invalid),false);});
test('corrupt storage falls back without overwriting the saved copy',()=>{const s=memory();s.setItem(STORAGE_KEY,'broken json');const result=loadData(s);assert.equal(result.error,true);assert.equal(result.data.places.length,defaultPlaces.length);assert.equal(s.getItem(STORAGE_KEY),'broken json');});
test('legacy HTML data is retained rather than silently replaced by new samples',()=>{const s=memory();s.setItem('safemap-anthuong-v1',JSON.stringify(defaultPlaces.slice(0,3)));const result=loadData(s);assert.equal(result.migrated,true);assert.equal(result.data.places.length,3);});
test('storage failures are propagated so the UI does not claim success',()=>{assert.throws(()=>saveData({setItem(){throw Error('quota');}},cloneDefaults()));assert.equal(loadData({getItem(){throw Error('denied');}}).error,true);});
test('image sources reject executable and non-web protocols',()=>{assert.equal(safeImage('javascript:alert(1)'),'');assert.equal(safeImage('data:text/html,x'),'');assert.equal(safeImage('https://example.org/photo.jpg'),'https://example.org/photo.jpg');});

test('OSM directions prefill the destination, and add an origin only when GPS is available',()=>{
 const destination={lat:16.05,lng:108.246};
 const noGps=new URL(osmDirectionsUrl(destination));
 assert.equal(noGps.searchParams.get('to'),'16.05,108.246');
 assert.equal(noGps.searchParams.has('route'),false);
 const gps=new URL(osmDirectionsUrl(destination,{lat:16.051,lng:108.24}));
 assert.equal(gps.searchParams.get('route'),'16.051,108.24;16.05,108.246');
});

test('sample markers share a quiet palette and custom category colors still work',()=>{
 assert.equal(markerColor({color:'#dd7683',kind:'safe'}),'#3582bc');
 assert.equal(markerColor({color:'#334455',kind:'green'}),'#334455');
});

test('functional groups have distinct marker colors without changing custom colors',()=>{const d=cloneDefaults();const color=id=>markerColor(d.categories.find(c=>c.id===id));assert.notEqual(color('safe'),color('health'));assert.equal(color('admin'),color('education'));assert.notEqual(color('admin'),color('green'));});

test('place and road labels are retained with a regional exclusion filter',()=>{
 const source={version:8,sources:{world:{type:'vector',attribution:'Required source'}},layers:[
 {id:'water',type:'fill'}, {id:'road',type:'line'},
 {id:'place_city',type:'symbol',filter:['==',['get','class'],'city']},
 {id:'road_name',type:'symbol'},
 {id:'boundary_2',type:'line','source-layer':'boundary'}, {id:'ferry',type:'line'}]};
 const result=regionalLabelStyle(source);
 assert.deepEqual(result.layers.map(l=>l.id),['water','road','place_city','road_name']);
 const city=result.layers.find(l=>l.id==='place_city');
 assert.equal(city.filter[0],'all');
 assert.deepEqual(city.filter[1],source.layers[2].filter);
 const mask=city.filter[2][1][1];
 assert.equal(mask.type,'MultiPolygon');assert.equal(mask.coordinates.length,2);
 assert.equal(source.layers[2].filter.length,3);
 assert.equal(result.sources.world.attribution,'Required source');
 assert.deepEqual(regionalLabelStyle(source,{labelsOnly:true}).layers.map(l=>l.id),['place_city','road_name']);
});
