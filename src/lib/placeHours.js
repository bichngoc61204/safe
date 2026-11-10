import { placeText } from './locale.js';

export const isClockTime = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export function readPlaceHours(place = {}) {
  const note = place.hours || '';
  if (place.opensAt || place.closesAt) return { opensAt:place.opensAt||'', closesAt:place.closesAt||'', hours:note };
  const pair = note.trim().match(/^(\d{1,2})(?::|h)(\d{2})\s*[-–—]\s*(\d{1,2})(?::|h)(\d{2})$/i);
  if (pair) {
    const opensAt = `${pair[1].padStart(2,'0')}:${pair[2]}`;
    const closesAt = `${pair[3].padStart(2,'0')}:${pair[4]}`;
    if (isClockTime(opensAt) && isClockTime(closesAt) && opensAt!==closesAt) return { opensAt, closesAt, hours:'' };
  }
  return { opensAt:'', closesAt:'', hours:note };
}

export function placeHourRows(place,lang) {
  const { opensAt, closesAt, hours } = readPlaceHours(place);
  return [['opensAt',opensAt],['closesAt',closesAt],['hours',placeText(place,'hours',lang,hours)]].filter(([,value])=>value);
}
