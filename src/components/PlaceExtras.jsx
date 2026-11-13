import { useEffect,useState } from 'react';
import Icon from './Icon';
import Modal from './Modal';
import Dropdown from './Dropdown';
import { shareUrl, openingState, reportReasons, wasteTypes } from '../lib/editorial';

export function useSavedPlaces(){
 const [saved,setSaved]=useState(()=>{try{const ids=JSON.parse(localStorage.getItem('safemap-saved')||'[]');return Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[];}catch{return [];}});
 const [error,setError]=useState(false);
 const toggle=id=>{
  const next=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];
  setSaved(next);
  try{localStorage.setItem('safemap-saved',JSON.stringify(next));setError(false);}catch{setError(true);}
 };
 return {saved,toggle,error};
}
export function OpenBadge({place,t,now}){
 const state=openingState(place,now);
 return state==='unknown'?null:<span className={`opening-badge opening-${state}`}><i/>{t(state==='open'?'openingOpen':'openingClosed')}</span>;
}
export function ScheduleDisplay({place,t}){
 if(!place.schedule?.enabled)return null;
 const show=day=>day.closed?t('dayClosed'):day.allDay?t('allDay'):`${day.opensAt} – ${day.closesAt}${day.closesAt<day.opensAt?' +1':''}`;
 return <details className="daily-schedule"><summary><Icon name="clock" size={15}/>{t('weeklyHours')}<Icon name="down" size={14}/></summary>
  <dl>{place.schedule.days.map((day,index)=><div key={index}><dt>{t(`day${index}`)}</dt><dd>{show(day)}</dd></div>)}</dl>
  {place.schedule.exceptions.length>0&&<><strong>{t('exceptions')}</strong><dl>{place.schedule.exceptions.map(day=><div key={day.date}><dt>{day.date}</dt><dd>{show(day)}</dd></div>)}</dl></>}
  <small>{t('scheduleHint')}</small>
 </details>;
}
export function PlaceActions({place,saved,onSave,t,onReport}){
 const [share,setShare]=useState(false);
 return <><div className="place-utility-actions">
  <button type="button" aria-pressed={saved} onClick={()=>onSave(place.id)}><Icon name="bookmark" size={17}/>{t(saved?'unsavePlace':'savePlace')}</button>
  <button type="button" onClick={()=>setShare(true)}><Icon name="share" size={17}/>{t('shareNative')}</button>
  {onReport&&<button type="button" data-report onClick={onReport}><Icon name="alert" size={17}/>{t('reportPlace')}</button>}
 </div>{share&&<SharePlace place={place} t={t} onClose={()=>setShare(false)}/>}</>;
}
function SharePlace({place,t,onClose}){
 const url=shareUrl(place),[qr,setQr]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let cancelled=false;import('qrcode').then(module=>module.default.toDataURL(url,{width:260,margin:2,color:{dark:'#173e2d',light:'#ffffff'}})).then(image=>{if(!cancelled)setQr(image);}).catch(()=>{if(!cancelled)setMessage('qrError');});return()=>{cancelled=true;};},[url]);
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage('linkCopied');}catch{setMessage('shareError');}}
 async function nativeShare(){try{await navigator.share({title:place.name,text:place.name,url});}catch(error){if(error.name!=='AbortError')setMessage('shareError');}}
 return <Modal title={t('sharePlace')} onClose={onClose} t={t} className="share-place-modal"><div className="community-modal-body">
  <h3>{place.name}</h3><p>{t('qrHint')}</p>{qr?<img className="place-qr" src={qr} alt={t('sharePlace')}/>:<div className="place-qr qr-placeholder" aria-busy="true"/>}
  <input readOnly value={url} aria-label={t('copyLink')} onFocus={event=>event.target.select()}/>
  <div className="community-button-row"><button className="button primary" onClick={copy}>{t('copyLink')}</button>{navigator.share&&<button className="button secondary" onClick={nativeShare}>{t('shareNative')}</button>}{qr&&<a className="button secondary" download={`safemap-${place.id}.png`} href={qr}>{t('downloadQr')}</a>}</div>
  {message&&<p role="status">{t(message)}</p>}{['localhost','127.0.0.1'].includes(window.location.hostname)&&<small>{t('qrLocalHint')}</small>}
 </div></Modal>;
}
export function ReportPlace({place,backend,t,onClose}){
 const [reason,setReason]=useState(reportReasons[0]),[note,setNote]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function send(event){event.preventDefault();if(busy)return;setBusy(true);setStatus('');try{if(!backend?.submitReport)throw Error('reportFailed');await backend.submitReport({placeId:place.id,placeName:place.name,reason,note});setStatus('reportSent');}catch(error){setStatus(error.message==='reportDuplicate'?'reportDuplicate':error.code==='permission-denied'?'rulesNeeded':error.code==='auth/operation-not-allowed'?'reportAuthHint':'reportFailed');}finally{setBusy(false);}}
 return <Modal title={t('reportPlace')} onClose={onClose} t={t} dismissible={!busy}><form onSubmit={send}>
  <div className="community-modal-body"><strong>{place.name}</strong>{status==='reportSent'?<p role="status" className="community-success"><Icon name="check"/>{t(status)}</p>:<>
   <div className="form-dropdown"><span>{t('reportReason')}</span><Dropdown label={t('reportReason')} value={reason} onChange={setReason}>{reportReasons.map(id=><option key={id} value={id}>{t(id)}</option>)}</Dropdown></div>
   <label><span>{t('reportNote')}</span><textarea maxLength={500} rows={3} value={note} onChange={event=>setNote(event.target.value)}/></label><small>{t('reportNoteHint')}</small>
   {status&&<p className="form-error" role="alert">{t(status)}</p>}
  </>}</div><div className="modal-footer"><button type="button" data-dialog-dismiss className="button secondary" disabled={busy}>{t('close')}</button>{status!=='reportSent'&&<button type="submit" className="button primary" disabled={busy}>{t(busy?'sendingReport':'sendReport')}</button>}</div>
 </form></Modal>;
}
export function WasteChoices({values=[],onChange,t}){
 return <div className="category-chips waste-choices" role="group" aria-label={t('materials')}>{wasteTypes.map(type=><button type="button" key={type} aria-pressed={values.includes(type)} onClick={()=>onChange(values.includes(type)?values.filter(value=>value!==type):[...values,type])}>{t(`waste_${type}`)}</button>)}</div>;
}
