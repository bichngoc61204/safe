import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultSchedule,validSchedule,openingState,publicCatalog,qualityIssues,catalogChanges,placeWasteTypes} from './editorial.js';
import {parseImportRows,importColumns} from './importCatalog.js';
import {makeTestCatalog} from '../../scripts/catalog.fixture.mjs';
import {demoPlaces} from '../../scripts/add-demo-places.mjs';
import {validateCatalog} from './firebaseCatalog.js';
const scheduled=()=>{const schedule=defaultSchedule();schedule.enabled=true;return schedule;};
test('public projection excludes hidden/trash and removes internal review information',()=>{
 const data=makeTestCatalog();
 data.places[0].visibility='hidden';data.places[1].deletedAt='2026-11-13';
 data.places[2].review={status:'verified',reviewedAt:'2026-11-13T00:00:00Z',reviewedBy:'private-uid'};
 data.places[2].reviewNotes='internal';
 const result=publicCatalog(data);
 assert.equal(result.places.length,data.places.length-2);
 const point=result.places.find(point=>point.id===data.places[2].id);
 assert.equal(point.verifiedAt,'2026-11-13T00:00:00Z');assert.equal(point.review,undefined);assert.equal(point.reviewNotes,undefined);
 assert.ok(data.places[2].review.reviewedBy);
});
test('weekly hours use Vietnam time and keep legacy hours unknown for Open now',()=>{
 const schedule=scheduled(),place={schedule};
 assert.equal(openingState(place,new Date('2026-11-13T02:00:00Z')),'open');
 assert.equal(openingState(place,new Date('2026-11-13T11:00:00Z')),'closed');
 assert.equal(openingState({opensAt:'08:00',closesAt:'17:00'}),'unknown');
 assert.equal(openingState({...place,status:'inactive'},new Date('2026-11-13T02:00:00Z')),'closed');
});
test('overnight hours carry from yesterday and a holiday closure takes precedence',()=>{
 const schedule=scheduled();schedule.days[3]={closed:false,allDay:false,opensAt:'20:00',closesAt:'02:00'};schedule.days[4].closed=true;
 const place={schedule};
 assert.equal(openingState(place,new Date('2026-11-12T18:00:00Z')),'open');
 schedule.exceptions=[{date:'2026-11-13',closed:true,allDay:false,opensAt:'08:00',closesAt:'17:00'}];
 assert.equal(openingState(place,new Date('2026-11-12T18:00:00Z')),'closed');
});
test('schedule handles 24h and rejects invalid or duplicate exceptions without throwing',()=>{
 const schedule=scheduled();schedule.days[4].allDay=true;
 assert.equal(openingState({schedule},new Date('2026-11-13T16:30:00Z')),'open');
 schedule.exceptions=[{...schedule.days[0],date:'2026-99-01'}];assert.equal(validSchedule(schedule),false);
 schedule.exceptions=[{...schedule.days[0],date:'2026-11-13'},{...schedule.days[0],date:'2026-11-13'}];assert.equal(validSchedule(schedule),false);
});
test('quality checks identify missing materials and duplicates without changing records',()=>{
 const data=makeTestCatalog();const place={...data.places.find(point=>point.category==='green'),image:'',phone:'',source:'',waste:'',wasteTypes:[]};
 const before=JSON.stringify(place),issues=qualityIssues(place,{...data,places:[place,{...place,id:'duplicate'}]});
 assert.ok(issues.includes('qualityPhone'));assert.ok(issues.includes('qualityWaste'));assert.ok(issues.includes('qualityDuplicate'));assert.equal(JSON.stringify(place),before);
 assert.ok(placeWasteTypes({waste:'Pin cũ, giấy, chai nhựa'}).includes('battery'));
});
test('history detects soft deletion and meaningful field changes',()=>{
 const before=makeTestCatalog(),after=structuredClone(before);
 after.places[0].deletedAt='2026-11-13';after.places[1].phone='0900000000';
 const changes=catalogChanges(before,after);
 assert.equal(changes.length,2);assert.deepEqual(changes[0].fields,['deletedAt']);assert.deepEqual(changes[1].fields,['phone']);
});
test('English-only edits are detected so managed saves persist translations',()=>{
 const before=makeTestCatalog(),after=structuredClone(before);
 Object.assign(after.places[0],{ownerEn:'Community team',wasteEn:'Batteries',hoursEn:'Weekdays',descriptionEn:'Visitor support'});
 assert.deepEqual(catalogChanges(before,after)[0].fields,['ownerEn','wasteEn','hoursEn','descriptionEn']);
});
const header=['id','category','name','address','lat','lng','opensAt','closesAt'];
const sample=['import-one','green','Điểm nhập thử','An Thượng',16.05,108.245,'08:00','17:00'];
test('Excel preview creates hidden unverified points and does not change existing catalog',()=>{
 const data=makeTestCatalog(),before=JSON.stringify(data);
 const rows=parseImportRows([header,sample],data);
 assert.deepEqual(rows[0].errors,[]);assert.equal(rows[0].point.visibility,'hidden');assert.equal(rows[0].point.review.status,'pending');assert.equal(JSON.stringify(data),before);
});
test('Excel preview rejects duplicates, unknown categories, blank coordinates and invalid times',()=>{
 const data=makeTestCatalog();
 const rows=parseImportRows([header,sample,[...sample]],data);
 assert.ok(rows[1].errors.includes('importDuplicate'));
 const bad=[...sample];bad[1]='not-a-category';bad[4]='';bad[7]='25:00';
 const invalid=parseImportRows([header,bad],data)[0];
 assert.ok(invalid.errors.includes('importCategory'));assert.ok(invalid.errors.includes('importCoordinates'));assert.ok(invalid.errors.includes('importHours'));
});
test('Excel update requires explicit mode and matches an existing ID',()=>{
 const data=makeTestCatalog(),original=data.places[0];
 const point=[original.id,original.category,original.name,original.address,original.lat,original.lng,'08:00','17:00'];
 assert.ok(parseImportRows([header,point],data)[0].errors.includes('importDuplicate'));
 assert.deepEqual(parseImportRows([header,point],data,{update:true})[0].errors,[]);
});
test('Excel template schedules parse all seven days and holiday closures',()=>{
 const data=makeTestCatalog();const headers=importColumns.map(column=>column[1]);
 const values={id:'calendar-test',category:'green',name:'Lịch nhập thử',address:'An Thượng',lat:16.05,lng:108.24,day0:'08:00-17:00',day1:'08:00-17:00',day2:'08:00-17:00',day3:'08:00-17:00',day4:'24/7',day5:'Nghỉ',day6:'Nghỉ',holidays:'2026-12-25'};
 const row=headers.map((_,index)=>values[importColumns[index][0]]||'');
 const result=parseImportRows([headers,row],data)[0];assert.deepEqual(result.errors,[]);assert.equal(result.point.schedule.days[4].allDay,true);assert.equal(result.point.schedule.exceptions[0].date,'2026-12-25');
});
test('three demo records are valid, clearly labelled and belong to three different groups',()=>{
 const data=makeTestCatalog(),places=demoPlaces(data.categories);
 assert.equal(places.length,3);assert.equal(new Set(places.map(place=>data.categories.find(category=>category.id===place.category).kind)).size,3);
 assert.ok(places.every(place=>place.name.includes('Demo')&&place.review.status==='pending'&&place.source==='Dữ liệu minh họa'));
 assert.doesNotThrow(()=>validateCatalog({...data,places}));
});
