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

// A plain opening/closing pair is a daily schedule. Explicit weekday notes
// restrict it; free-form or ambiguous notes must never be treated as open.
export function regularOpeningSchedule(place={}) {
  const {opensAt,closesAt,hours}=readPlaceHours(place);
  let note=String(hours).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[.]+$/,'');
  const allDay=/^(24\s*\/\s*7|24h|24 gio|24 hours|always open)$/.test(note);
  if(!allDay&&(!isClockTime(opensAt)||!isClockTime(closesAt)||opensAt===closesAt))return null;
  let days;
  if(allDay||!note||/^(hang ngay|moi ngay|ca tuan|daily|every day|everyday|all week)$/.test(note))days=[0,1,2,3,4,5,6];
  else {
    const viDays={hai:'2',ba:'3',tu:'4',nam:'5',sau:'6',bay:'7'};
    note=note.replace(/thu\s*(hai|ba|tu|nam|sau|bay|[2-7])/g,(_,day)=>`t${viDays[day]||day}`).replace(/chu\s*nhat/g,'cn');
    const names=['t2','t3','t4','t5','t6','t7','cn'];
    const en=['mon(?:day)?','tue(?:sday)?','wed(?:nesday)?','thu(?:rsday)?','fri(?:day)?','sat(?:urday)?','sun(?:day)?'];
    en.forEach((name,index)=>{note=note.replace(new RegExp(`\\b${name}\\b`,'g'),names[index]);});
    const range=note.match(/^(t[2-7]|cn)\s*(?:[-–—]|den|to)\s*(t[2-7]|cn)$/);
    if(range){
      const first=names.indexOf(range[1]),last=names.indexOf(range[2]);
      days=Array.from({length:(last-first+7)%7+1},(_,index)=>(first+index)%7);
    }else if(/^(t[2-7]|cn)(?:\s*[,/&]\s*(?:t[2-7]|cn))*$/.test(note))days=[...note.matchAll(/t[2-7]|cn/g)].map(([day])=>names.indexOf(day));
    else return null;
  }
  return {enabled:true,days:Array.from({length:7},(_,index)=>({closed:!days.includes(index),allDay,opensAt:allDay?'00:00':opensAt,closesAt:allDay?'23:59':closesAt})),exceptions:[]};
}

export function placeHourRows(place,lang) {
  const { opensAt, closesAt, hours } = readPlaceHours(place);
  if(place.schedule?.enabled)return hours?[['hours',placeText(place,'hours',lang,hours)]]:[];
  return [['opensAt',opensAt],['closesAt',closesAt],['hours',placeText(place,'hours',lang,hours)]].filter(([,value])=>value);
}
