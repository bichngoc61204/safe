import {test} from 'node:test';
import assert from 'node:assert/strict';
import writeExcelFile from 'write-excel-file/node';
import readExcelFile,{readSheet} from 'read-excel-file/node';
import {catalogWorkbook} from './exportCatalog.js';
import {parseImportRows,importColumns} from './importCatalog.js';
import {makeTestCatalog} from '../../scripts/catalog.fixture.mjs';
import {messages} from './i18n.js';
import {defaultSchedule} from './editorial.js';
import {validateCatalog} from './firebaseCatalog.js';

const header=['id','category','name','address','lat','lng'];
const createRow=values=>importColumns.map(([key])=>values[key]??'');
const imported=(values,data=makeTestCatalog())=>parseImportRows([importColumns.map(column=>column[1]),createRow(values)],data,{update:true})[0];

for(const lang of ['vi','en'])test(`real ${lang} Excel workbook round-trips photos, daily hours, notes and English fields`,async()=>{
 const data=makeTestCatalog();
 const schedule=defaultSchedule();schedule.enabled=true;
 schedule.days[0]={closed:false,allDay:false,opensAt:'20:00',closesAt:'02:00'};
 schedule.days[1]={closed:false,allDay:true,opensAt:'00:00',closesAt:'23:59'};schedule.days[2].closed=true;
 schedule.exceptions=[{...schedule.days[0],date:'2026-12-25'},{...schedule.days[2],date:'2027-01-01'}];
 const point={...data.places[0],phone:'0236 123 4567',hours:'Thứ Hai – Chủ Nhật',nameEn:'Community help point',addressEn:'An Thuong, Da Nang',ownerEn:'Community team',wasteEn:'Batteries',hoursEn:'Monday – Sunday',descriptionEn:'Help and information',description:'Hỗ trợ cộng đồng',source:'Khảo sát',waste:'',wasteTypes:['battery','plastic'],schedule};
 data.places=[point];
 const workbook=catalogWorkbook(data,key=>messages[lang][key]??key,lang);
 assert.equal(workbook[0].columns.length,workbook[0].data[0].length);
 const buffer=await writeExcelFile(workbook).toBuffer();
 assert.ok(buffer.length>1000);
 const sheets=await readExcelFile(buffer);assert.equal(sheets.length,2);
 const rows=await readSheet(buffer,1);
 const [result]=parseImportRows(rows,data,{update:true});
 assert.deepEqual(result.errors,[]);
 for(const field of ['id','name','address','category','lat','lng','phone','image','images','waste','wasteTypes','hours','description','source','nameEn','addressEn','ownerEn','wasteEn','hoursEn','descriptionEn'])assert.deepEqual(result.point[field],point[field],field);
 assert.deepEqual(result.point.schedule,schedule);
 assert.equal(result.point.visibility,'hidden');assert.equal(result.point.review.status,'pending');
 assert.doesNotThrow(()=>validateCatalog({...data,places:[result.point]}));
});

test('previewing special-date updates never mutates existing nested schedules',()=>{
 const data=makeTestCatalog(),point=data.places[0];
 point.schedule=defaultSchedule();point.schedule.enabled=true;
 point.schedule.exceptions=[{...point.schedule.days[0],date:'2026-12-24'}];
 const original=JSON.stringify(data);
 const row=imported({...point,holidays:'2026-12-25'},data);
 assert.deepEqual(row.errors,[]);assert.equal(row.point.schedule.exceptions[0].date,'2026-12-25');
 assert.equal(JSON.stringify(data),original);
});

test('blank categories do not match categories with missing English labels',()=>{
 const data=makeTestCatalog();data.categories[0].nameEn='';
 const result=parseImportRows([header,['new','', 'Tên','Địa chỉ',16.05,108.24]],data)[0];
 assert.ok(result.errors.includes('importCategory'));
});

test('preview rejects English fields that would fail final catalog validation',()=>{
 const result=imported({id:'long-translation',category:'safe',name:'Tên',address:'Địa chỉ',lat:16.05,lng:108.24,nameEn:'x'.repeat(151)});
 assert.ok(result.errors.includes('importRequired'));
});

test('Excel update rejects trashed IDs and repeated cover/gallery images',()=>{
 const data=makeTestCatalog();data.places[0].deletedAt='2026-11-13';
 const result=imported({...data.places[0],images:data.places[0].image},data);
 assert.ok(result.errors.includes('importDuplicate'));assert.ok(result.errors.includes('invalidGallery'));
});

test('invalid and partial seven-day schedules are blocked before saving',()=>{
 for(const values of [{day0:'08:00-17:00'},{day0:'25:00-26:00'},{holidays:'2026-99-01'}]){
  const result=imported({id:'bad-schedule',category:'safe',name:'Tên',address:'Địa chỉ',lat:16.05,lng:108.24,...values});
  assert.ok(result.errors.includes('scheduleInvalid'));
 }
});


test('material type IDs accept separated canonical tokens and block unknown IDs',()=>{
 const values={id:'materials',category:'green',name:'Thu gom',address:'An Thượng',lat:16.05,lng:108.24,wasteTypes:'battery; plastic,paper; battery'};
 const valid=imported(values);assert.deepEqual(valid.errors,[]);assert.deepEqual(valid.point.wasteTypes,['battery','plastic','paper']);
 assert.ok(imported({...values,wasteTypes:'battery;unknown'}).errors.includes('importWasteTypes'));
});

test('legacy material text updates replace stale structured types, but omitted text keeps them',()=>{
 const data=makeTestCatalog(),point=data.places.find(place=>place.category==='green');point.wasteTypes=['battery'];
 const before=JSON.stringify(data);
 const row=[point.id,point.category,point.name,point.address,point.lat,point.lng];
 const updated=parseImportRows([[...header,'waste'],[...row,'Chai nhựa, giấy']],data,{update:true})[0];
 assert.deepEqual(updated.errors,[]);assert.deepEqual(updated.point.wasteTypes,['plastic','paper']);
 const unchanged=parseImportRows([header,row],data,{update:true})[0];assert.deepEqual(unchanged.point.wasteTypes,['battery']);
 assert.equal(JSON.stringify(data),before);
});
