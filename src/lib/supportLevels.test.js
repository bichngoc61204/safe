import {test} from 'node:test';
import assert from 'node:assert/strict';
import {supportLevels,isCommunitySupport,getSupportLevel,supportMarkerCategory,parseSupportLevel,requiresSupportLevel} from './supportLevels.js';
import {makeTestCatalog} from '../../scripts/catalog.fixture.mjs';
import {validateCatalog} from './firebaseCatalog.js';
import {filterPlaces,markerColor} from './domain.js';
import {qualityIssues,catalogChanges} from './editorial.js';
import {parseImportRows} from './importCatalog.js';
import {catalogWorkbook} from './exportCatalog.js';
import {messages} from './i18n.js';
const category={id:'safe',kind:'safe',name:'Hỗ trợ cộng đồng',nameEn:'Community support'};
test('support levels apply only to the community category, including renamed flagged categories',()=>{
 assert.equal(isCommunitySupport(category),true);
 assert.equal(isCommunitySupport({...category,id:'police',name:'Công an',nameEn:'Police'}),false);
 assert.equal(isCommunitySupport({...category,kind:'green'}),false);
 assert.equal(isCommunitySupport({...category,id:'custom',name:'Điểm của phường',nameEn:'Ward',supportLevels:true}),true);
});
test('three tiers have distinct capabilities and icons while retaining orange map pins',()=>{
 assert.equal(supportLevels.length,3);
 assert.equal(new Set(supportLevels.map(level=>level.icon)).size,3);
 for(const level of supportLevels){const point={supportLevel:level.id};assert.equal(getSupportLevel(point,category),level);assert.equal(markerColor(supportMarkerCategory(point,category)),'#D97724');}
 assert.ok(supportLevels.find(level=>level.id==='family_friendly').services.includes('supportLostChildren'));
 assert.ok(supportLevels.find(level=>level.id==='safe_hub').services.includes('supportMedicalConnection'));
 assert.equal(getSupportLevel({},category),undefined);
});
test('legacy places remain readable; invalid tiers and tiers on police/GreenPoint are rejected',()=>{
 const data=makeTestCatalog();assert.doesNotThrow(()=>validateCatalog(data));
 const point=data.places.find(point=>point.category==='safe');point.supportLevel='safe_hub';
 assert.doesNotThrow(()=>validateCatalog(data));
 point.supportLevel='wrong';assert.throws(()=>validateCatalog(data),{message:'catalogInvalid'});
 point.supportLevel='safe_hub';point.category='police';assert.throws(()=>validateCatalog(data),{message:'catalogInvalid'});
});
test('tier filtering keeps police and unassigned records out without assigning a legacy tier',()=>{
 const data=makeTestCatalog(),template=data.places.find(point=>point.category==='safe');
 data.places=[...supportLevels.map(level=>({...template,id:level.id,supportLevel:level.id})),{...template,id:'unassigned'},data.places.find(point=>point.category==='police')];
 assert.deepEqual(filterPlaces(data.places,data.categories,{scope:'safe',supportLevel:'family_friendly'}).map(point=>point.id),['family_friendly']);
 assert.deepEqual(filterPlaces(data.places,data.categories,{supportLevel:'unassigned'}).map(point=>point.id),['unassigned']);
 assert.ok(qualityIssues(template,data).includes('qualitySupportLevel'));
 const after=structuredClone(data);after.places[0].supportLevel='safe_hub';assert.deepEqual(catalogChanges(data,after)[0].fields,['supportLevel']);
});
test('Excel round-trips support levels; a new community point requires a valid tier',()=>{
 const data=makeTestCatalog(),point=data.places.find(point=>point.category==='safe');point.supportLevel='family_friendly';
 const sheet=catalogWorkbook(data,key=>messages.vi[key]||key,'vi')[0];
 const rows=sheet.data.map(row=>row.map(cell=>cell?.value??cell));
 const imported=parseImportRows(rows,data,{update:true}).find(row=>row.point.id===point.id);
 assert.equal(imported.point.supportLevel,'family_friendly');assert.deepEqual(imported.errors,[]);
 const headers=['category','name','address','lat','lng','supportLevel'];
 const line=['safe','Điểm phường mới','An Thượng',16.05,108.24,''];
 assert.ok(parseImportRows([headers,line],data)[0].errors.includes('importSupportLevel'));
 line[5]='Safe Hub';assert.deepEqual(parseImportRows([headers,line],data)[0].errors,[]);
 assert.equal(parseSupportLevel('Family Friendly'),'family_friendly');
});

test('managed saves require a level for new community points, conversion and republication',()=>{
 const data=makeTestCatalog(),old=data.places.find(point=>point.category==='safe');
 assert.equal(requiresSupportLevel(old,data,data.categories),false);
 assert.equal(requiresSupportLevel({...old,id:'new'},data,data.categories),true);
 const hidden={...data,places:data.places.map(point=>point.id===old.id?{...point,visibility:'hidden'}:point)};
 assert.equal(requiresSupportLevel({...old,visibility:'published'},hidden,data.categories),true);
 assert.equal(requiresSupportLevel({...old,category:'police'},data,data.categories),false);
});

test('persisting an already recognized community category flag does not create a fake history change',()=>{
 const data=makeTestCatalog(),after=structuredClone(data);
 after.categories.find(category=>category.id==='safe').supportLevels=true;
 assert.deepEqual(catalogChanges(data,after),[]);
});
