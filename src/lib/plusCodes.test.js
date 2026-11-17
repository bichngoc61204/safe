import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolvePlusCode,resolvePlaceLocation} from './plusCodes.js';

test('Google Maps short code for Hoa Xuan resolves to the correct Da Nang cell',()=>{
 const point=resolvePlusCode('2646+86 Hoa Xuan, Da Nang, Vietnam');
 assert.equal(point.code,'7P8C2646+86');
 assert.equal(point.short,true);
 assert.equal(point.lat,16.0058125);
 assert.equal(point.lng,108.2105625);
 assert.deepEqual(resolvePlusCode('2646+86 Hòa Xuân, Đà Nẵng, Việt Nam'),point);
 assert.deepEqual(resolvePlusCode(' 2646+86 '),point);
});
test('full codes decode without locality lookup, reference coordinates or a network request',()=>{
 const point=resolvePlusCode('7p8c2646+86 Hoa Xuan, Da Nang, Vietnam');
 assert.equal(point.short,false);
 assert.equal(point.lat,16.0058125);
 assert.equal(point.lng,108.2105625);
 assert.equal(resolvePlusCode('849VCWC8+R9 Mountain View, USA').short,false);
});
test('malformed codes and address-only text do not silently change coordinates',()=>{
 for(const value of ['',null,'2646','2646+8','2646+86+86','2646+86<script>','16.0505,108.2435','hello+world'])assert.throws(()=>resolvePlusCode(value),{message:'plusCodeInvalid'});
});
test('short codes outside Da Nang or needing a neighborhood reference ask for the full code',()=>{
 for(const value of ['2646+86 Ha Noi, Vietnam','46+86 Hoa Xuan, Da Nang','+86','2646+86 Hanoi DaNangUnknown'])assert.throws(()=>resolvePlusCode(value),{message:'plusCodeNeedsFull'});
});

test('a location requires either a valid Plus Code or a complete coordinate pair',()=>{
 for(const point of [{},{lat:'',lng:''},{lat:'16.05',lng:''},{lat:'',lng:'108.24'}])assert.throws(()=>resolvePlaceLocation(point),{message:'locationRequired'});
 assert.deepEqual(resolvePlaceLocation({lat:'16.05',lng:'108.24'}),{lat:16.05,lng:108.24});
 assert.deepEqual(resolvePlaceLocation({lat:0,lng:0}),{lat:0,lng:0});
 assert.equal(resolvePlaceLocation({plusCode:'2646+86 Da Nang',lat:'',lng:''}).lat,16.0058125);
});
test('an invalid new code cannot silently fall back to old coordinates',()=>{
 assert.throws(()=>resolvePlaceLocation({plusCode:'bad',lat:16.05,lng:108.24}),{message:'plusCodeInvalid'});
 for(const point of [{lat:91,lng:108},{lat:16,lng:181},{lat:'bad',lng:108}])assert.throws(()=>resolvePlaceLocation(point),{message:'locationInvalid'});
});
