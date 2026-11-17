import openLocationCode from 'open-location-code';
import { CENTER } from './mapCenter.js';

const codec = new openLocationCode.OpenLocationCode();
const normalize = value => value.normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/gi,'d').toLowerCase();

// Short codes are relative, not addresses. Resolve local Da Nang codes offline;
// never pretend to geocode arbitrary city names using the An Thuong reference.
export function resolvePlusCode(input) {
  const match = String(input || '').trim().match(/^([23456789CFGHJMPQRVWX0]{0,8}\+[23456789CFGHJMPQRVWX]{2,7})(?:\s+(.+))?$/i);
  if (!match || !codec.isValid(match[1])) throw new Error('plusCodeInvalid');
  let code = match[1].toUpperCase();
  const short = codec.isShort(code);
  if (short) {
    const locality = normalize(match[2] || '').trim();
    if (locality && !/\bda[\s-]*nang\b/.test(locality)) throw new Error('plusCodeNeedsFull');
    // A two-character prefix repeats every ~5km and needs a neighborhood-level
    // reference. Ask for the full code instead of silently picking the wrong cell.
    if (code.indexOf('+') < 4) throw new Error('plusCodeNeedsFull');
    code = codec.recoverNearest(code, CENTER[0], CENTER[1]);
  }
  const area = codec.decode(code);
  return { code, short, lat:Number(area.latitudeCenter.toFixed(7)), lng:Number(area.longitudeCenter.toFixed(7)) };
}

// Coordinates may be supplied directly or decoded from a Plus Code. Blank input
// must never turn into (0, 0) through Number(''), or reuse the map's default view.
export function resolvePlaceLocation({plusCode='',lat,lng}) {
  if(String(plusCode).trim())return resolvePlusCode(plusCode);
  if([lat,lng].some(value=>value==null||String(value).trim()===''))throw new Error('locationRequired');
  const point={lat:Number(lat),lng:Number(lng)};
  if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng)||Math.abs(point.lat)>90||Math.abs(point.lng)>180)throw new Error('locationInvalid');
  return point;
}
