import {useEffect,useMemo,useRef,useState} from 'react';
import Icon from './Icon';
import Modal from './Modal';
import Dropdown from './Dropdown';
import {qualityIssues} from '../lib/editorial';
const fieldLabel=(field,t)=>field.endsWith('En')?`${t(field.slice(0,-2))} (EN)`:t({created:'add',removed:'delete',schedule:'weeklyHours',review:'verification',visibility:'publication',wasteTypes:'materials',lat:'latitude',lng:'longitude',images:'placeImages'}[field]||field);
const tabs=[['quality','check'],['history','history'],['trash','delete'],['reports','alert']];
export default function AdminOperations({data,backend,t,lang,onOpen,onApply,busy,initialTab='quality',onTabChange}){
 const [tab,setTab]=useState(tabs.some(([id])=>id===initialTab)?initialTab:'quality'),[filter,setFilter]=useState('all'),[history,setHistory]=useState([]),[reports,setReports]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[reportBusy,setReportBusy]=useState(false),[restore,setRestore]=useState(null),[notes,setNotes]=useState({});
 const loaded=useRef(new Set());
 const selectTab=id=>{setTab(id);onTabChange?.(id);setFilter('all');setError('');setLoading(['history','reports'].includes(id)&&!loaded.current.has(id));};
 useEffect(()=>{
  setError('');
  const observe=tab==='history'?backend?.observeHistory:tab==='reports'?backend?.observeReports:null;
  if(!observe){setLoading(false);return;}
  setLoading(!loaded.current.has(tab));
  return observe(items=>{loaded.current.add(tab);(tab==='history'?setHistory:setReports)(items);setLoading(false);},error=>{setError(error.code==='permission-denied'?'rulesNeeded':'operationError');setLoading(false);});
 },[tab,backend]);
 const quality=useMemo(()=>data.places.filter(place=>!place.deletedAt).map(place=>({place,issues:qualityIssues(place,data)})),[data]);
 const issueTypes=[...new Set(quality.flatMap(item=>item.issues))];
 const visible=quality.filter(item=>filter==='all'?item.issues.length:item.issues.includes(filter));
 const trash=data.places.filter(place=>place.deletedAt);
 const date=value=>value?new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):'';
 async function patch(place,updates){setError('');try{await onApply({...data,places:data.places.map(item=>item.id===place.id?{...item,...updates,updatedAt:new Date().toISOString()}:item)});}catch(error){setError(error.message||'operationError');}}
 async function restoreSnapshot(){
  setError('');
  try{
   let next;
   if(restore.place){
    const {deletedAt,deletedBy,...point}=restore.place;
    const restored={...point,visibility:'hidden',review:{status:'pending'},updatedAt:new Date().toISOString()};
    const categories=data.categories.some(item=>item.id===point.category)?data.categories:[...data.categories,restore.event.snapshot.categories.find(item=>item.id===point.category)];
    next={categories,places:data.places.some(item=>item.id===point.id)?data.places.map(item=>item.id===point.id?restored:item):[...data.places,restored]};
   }else next={categories:restore.event.snapshot.categories,places:restore.event.snapshot.places.map(({deletedAt,deletedBy,...place})=>({...place,visibility:'hidden',review:{status:'pending'},updatedAt:new Date().toISOString()}))};
   await onApply(next);setRestore(null);
  }catch(error){setError(error.message||'operationError');}
 }
 async function resolve(report,status){if(reportBusy)return;setReportBusy(true);setError('');try{await backend.resolveReport(report.id,status,notes[report.id]??report.resolution??'');}catch{setError('operationError');}finally{setReportBusy(false);}}
 return <section className="admin-operations">
  <nav className="operations-tabs" aria-label={t('adminTools')}>{tabs.map(([id,icon])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>selectTab(id)}><Icon name={icon} size={17}/>{t(id)}</button>)}</nav>
  <div className="operations-view" key={tab} aria-busy={loading}>
  {error&&<p className="form-error" role="alert">{t(error)}</p>}{loading&&<div className="operations-loading" role="status"><span className="operations-spinner"/>{t('opsLoading')}<div/><div/><div/></div>}
  {tab==='quality'&&<div className="panel operations-panel"><div className="panel-heading"><div><h2>{t('quality')}</h2><p>{t('qualityHint')}</p></div><span className="count-pill">{quality.filter(item=>item.issues.length).length}</span></div>
   <div className="category-chips quality-filter"><button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>{t('qualityAll')}</button>{issueTypes.map(issue=><button type="button" key={issue} aria-pressed={filter===issue} onClick={()=>setFilter(issue)}>{t(issue)} <b>{quality.filter(item=>item.issues.includes(issue)).length}</b></button>)}</div>
   {visible.length?visible.map(({place,issues},index)=><article className="operation-record" key={place.id} style={{'--operation-delay':`${Math.min(index,6)*45}ms`}}><div><h3>{place.name}</h3><p>{place.address}</p><div className="issue-tags">{issues.map(issue=><span key={issue}>{t(issue)}</span>)}</div></div><div className="operation-actions"><button className="button secondary" onClick={()=>onOpen(place.id)}>{t('inspect')}</button><button className="text-button" disabled={busy} onClick={()=>patch(place,{review:{status:'verified'}})}>{t('markVerified')}</button></div></article>):<div className="empty-state">{t('noIssues')}</div>}
  </div>}
  {tab==='trash'&&<div className="panel operations-panel"><div className="panel-heading"><div><h2>{t('trash')} <span className="count-pill">{trash.length}</span></h2><p>{t('trashHint')}</p></div></div>{trash.length?trash.map(place=><article className="operation-record" key={place.id}><div><h3>{place.name}</h3><p>{place.address}</p><small>{t('deletedAt')}: {date(place.deletedAt)}</small></div><button className="button secondary" disabled={busy} onClick={()=>patch(place,{deletedAt:null,deletedBy:null,visibility:'hidden',review:{status:'pending'}})}><Icon name="restore" size={16}/>{t('restorePlace')}</button></article>):<div className="empty-state">{t('trashEmpty')}</div>}</div>}
  {tab==='history'&&!loading&&!error&&<div className="panel operations-panel"><div className="panel-heading"><h2>{t('history')}</h2></div>{history.length?history.map(event=><article className="history-record" key={event.id}><div className="history-record-heading"><span className="history-icon"><Icon name="history"/></span><div><h3>{t('revision')} {event.revision}</h3><small>{event.actorEmail||event.actor} · {date(event.createdAt)}</small></div></div>
   <ul>{event.changes.map(change=><li key={change.id}><div><strong>{change.id==='categories'?t('categories'):change.name}</strong><small>{change.fields.map(field=>fieldLabel(field,t)).join(', ')}</small></div>{event.snapshot.places.some(place=>place.id===change.id)&&<button type="button" className="text-button" onClick={()=>setRestore({event,place:event.snapshot.places.find(place=>place.id===change.id)})}>{t('restorePlace')}</button>}</li>)}</ul>
   <details><summary>{t('historyBefore')} · {event.snapshot.places.length} {t('snapshotCount')}</summary><button className="button secondary" onClick={()=>setRestore({event})}>{t('restoreVersion')}</button></details>
  </article>):<div className="empty-state">{t('historyEmpty')}</div>}</div>}
  {tab==='reports'&&!loading&&!error&&<div className="panel operations-panel"><div className="panel-heading"><h2>{t('reports')}</h2></div>{reports.length?reports.map(report=><article className="report-record" key={report.id}><div className="report-heading"><div><h3>{report.placeName}</h3><small>{date(report.createdAt)}</small></div><span className={`report-state report-${report.status}`}>{t(`report_${report.status}`)}</span></div><strong>{t(report.reason)}</strong>{report.note&&<p>{report.note}</p>}<label><span>{t('resolution')}</span><textarea maxLength={500} rows={2} value={notes[report.id]??report.resolution??''} onChange={event=>setNotes({...notes,[report.id]:event.target.value})}/></label><div className="operation-actions">{data.places.some(point=>point.id===report.placeId&&!point.deletedAt)?<button className="text-button" onClick={()=>onOpen(report.placeId)}>{t('inspect')}</button>:<span className="report-place-unavailable">{t('reportPlaceUnavailable')}{data.places.some(point=>point.id===report.placeId&&point.deletedAt)&&<button type="button" className="text-button" onClick={()=>selectTab('trash')}>{t('trash')}</button>}</span>}{report.status==='new'?<><button className="button secondary" disabled={reportBusy} onClick={()=>resolve(report,'resolved')}>{t('resolve')}</button><button className="text-button" disabled={reportBusy} onClick={()=>resolve(report,'dismissed')}>{t('dismiss')}</button></>:<button className="text-button" disabled={reportBusy} onClick={()=>resolve(report,'new')}>{t('reopen')}</button>}</div></article>):<div className="empty-state">{t('reportsEmpty')}</div>}</div>}
  </div>
  {restore&&<Modal title={t('restoreConfirm')} onClose={()=>setRestore(null)} t={t} dismissible={!busy}><div className="community-modal-body"><strong>{restore.place?.name||`${t('revision')} ${restore.event.revision}`}</strong><p>{t('restoreVersionHint')}</p>{error&&<p className="form-error" role="alert">{t(error)}</p>}</div><div className="modal-footer"><button className="button secondary" type="button" data-dialog-dismiss disabled={busy}>{t('cancel')}</button><button className="button primary" disabled={busy} onClick={restoreSnapshot}>{t(busy?'saving':'restorePlace')}</button></div></Modal>}
 </section>;
}
