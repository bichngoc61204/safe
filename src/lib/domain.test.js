import { regionalLabelStyle } from './cartography.js';
import { placeHourRows } from './placeHours.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestCatalog } from '../../scripts/catalog.fixture.mjs';
import { validateCatalog } from './firebaseCatalog.js';
import { filterPlaces, haversine, formatDistance, validData, safeImage, isAlert, markerColor } from './domain.js';
test('sample dataset has two GreenPoints and all records are valid',()=>{const d=makeTestCatalog();assert.equal(validData(d),true);assert.equal(d.places.filter(p=>p.category==='green').length,2);});
test('search ignores Vietnamese accents and supports accepted materials',()=>{const d=makeTestCatalog();assert.equal(filterPlaces(d.places,d.categories,{query:'phuoc thien'}).length,1);assert.ok(filterPlaces(d.places,d.categories,{query:'rac dien tu'}).length);});
test('SafePoint includes safety, public offices, healthcare and schools',()=>{const d=makeTestCatalog();const rows=filterPlaces(d.places,d.categories,{scope:'safe'});assert.deepEqual(new Set(rows.map(p=>p.category)),new Set(['police','safe','admin','health','education']));});
test('GreenPoint alerts exclude other categories and inactive records',()=>{const d=makeTestCatalog();const rows=filterPlaces(d.places,d.categories,{scope:'green',status:'alerts'});assert.equal(rows.length,1);assert.ok(rows.every(isAlert));assert.ok(rows.every(p=>p.category==='green'));});
test('distance formula handles zero, known equatorial distance and nearest ordering',()=>{assert.equal(haversine({lat:0,lng:0},{lat:0,lng:0}),0);assert.ok(Math.abs(haversine({lat:0,lng:0},{lat:0,lng:1})-111195)<2);assert.equal(formatDistance(350),'350m');assert.equal(formatDistance(1200),'1.2km');const d=makeTestCatalog(),position=d.places[4];assert.equal(filterPlaces(d.places,d.categories,{position})[0].id,position.id);});
test('catalog rejects duplicate places, orphan categories and invalid coordinates',()=>{
 const data=makeTestCatalog();
 const invalid=structuredClone(data);
 invalid.places[0].lat=95;
 assert.equal(validData(invalid),false);
 invalid.places[0]={...data.places[0],category:'missing'};
 assert.equal(validData(invalid),false);
 invalid.places[0]=data.places[0];
 invalid.places.push(invalid.places[0]);
 assert.equal(validData(invalid),false);
});
test('retired local image references remain readable in Firestore but are skipped by the UI',()=>{
 const data=makeTestCatalog();
 data.places[0].image='/demo-places/police.jpg';
 data.places[0].images=['/demo-places/clinic.jpg','https://example.org/photo.jpg'];
 assert.doesNotThrow(()=>validateCatalog(data));
 assert.equal(safeImage(data.places[0].image),'');
 assert.deepEqual(data.places[0].images.map(safeImage).filter(Boolean),['https://example.org/photo.jpg']);
 data.places[0].image='/arbitrary/path.jpg';
 assert.throws(()=>validateCatalog(data),{message:'catalogInvalid'});
});
test('image sources reject executable and non-web protocols',()=>{assert.equal(safeImage('javascript:alert(1)'),'');assert.equal(safeImage('data:text/html,x'),'');assert.equal(safeImage('https://example.org/photo.jpg'),'https://example.org/photo.jpg');});

test('sample markers share a quiet palette and custom category colors still work',()=>{
 assert.equal(markerColor({color:'#dd7683',kind:'safe'}),'#3582bc');
 assert.equal(markerColor({color:'#334455',kind:'green'}),'#334455');
});

test('functional groups have distinct marker colors without changing custom colors',()=>{const d=makeTestCatalog();const color=id=>markerColor(d.categories.find(c=>c.id===id));assert.notEqual(color('safe'),color('health'));assert.equal(color('admin'),color('education'));assert.notEqual(color('admin'),color('green'));});

test('Vietnam display filters keep land labels and reject boundaries, ferries and unknown layers',()=>{
 const source={version:8,sources:{world:{type:'vector',attribution:'Required source'}},layers:[
   {id:'water',type:'fill','source-layer':'water'},
   {id:'road',type:'line','source-layer':'transportation'},
   {id:'place_city',type:'symbol','source-layer':'place',filter:['==',['get','class'],'city']},
   {id:'road_name',type:'symbol','source-layer':'transportation_name'},
   {id:'boundary_2',type:'line','source-layer':'boundary'},
   {id:'ferry',type:'line','source-layer':'transportation'},
   {id:'unknown-lines',type:'line','source-layer':'unreviewed'},
 ]};
 const result=regionalLabelStyle(source);
 assert.deepEqual(result.layers.map(l=>l.id),['water','road','place_city','road_name']);
 const city=result.layers.find(l=>l.id==='place_city');
 assert.deepEqual(city.filter[1],source.layers[2].filter);
 assert.equal(city.filter[2][0],'within');
 assert.equal(city.filter[2][1].type,'MultiPolygon');
 const roadLabel=result.layers.find(l=>l.id==='road_name');
 assert.equal(roadLabel.filter[1][0],'within');
 assert.equal(result.sources.world.attribution,'Required source');
 assert.deepEqual(regionalLabelStyle(source,{labelsOnly:true}).layers.map(l=>l.id),['place_city','road_name']);
});

test('opening hours retain legacy notes and recognize a pair that closes the following day',()=>{
 assert.deepEqual(placeHourRows({hours:'20:00 – 02:00'}),[['opensAt','20:00'],['closesAt','02:00']]);
 assert.deepEqual(placeHourRows({hours:'Thứ Hai – Thứ Sáu'}),[['hours','Thứ Hai – Thứ Sáu']]);
 assert.deepEqual(placeHourRows({opensAt:'08:00',closesAt:'17:00',hours:'Thứ Hai'}),[
   ['opensAt','08:00'],['closesAt','17:00'],['hours','Thứ Hai'],
 ]);
});
