import {useEffect,useMemo,useRef,useState} from 'react';
import Icon from './Icon';
import Modal from './Modal';
import {qualityIssues} from '../lib/editorial';
import {activityTime,placeActivityTime,reportActivityTime,newestFirst,historyByDay,historyAction,readableHistory,changeValues} from '../lib/adminActivity';
import {normalize,safeImage,categoryColor,categoryPalette} from '../lib/domain';
import '../admin-operations.css';
import {supportLevels,isCommunitySupport,categoryVisualIcon} from '../lib/supportLevels';
import {placeText} from '../lib/locale';
import {AttentionBadge} from './AdminAttention';
import {cleanTrash} from '../lib/adminAttention';

const fieldLabel=(field,t)=>field.endsWith('En')?`${t(field.slice(0,-2))} (EN)`:t({created:'add',removed:'delete',schedule:'weeklyHours',review:'verification',visibility:'publication',wasteTypes:'materials',lat:'latitude',lng:'longitude',images:'placeImages',deletedAt:'deletionState',categories:'categories'}[field]||field);
const tabs=[['quality','check'],['history','history'],['trash','delete'],['reports','alert']];
const issueOrder=['qualitySupportLevel','qualityPhone','qualityArea','qualityDuplicate','qualityWaste','qualityHours','qualityPhoto','qualitySource','qualityEnglish','qualityReview'];
const qualityGroups={contact:['qualityPhone','qualityArea','qualityDuplicate'],content:['qualityPhoto','qualityHours','qualitySource','qualityEnglish','qualityWaste'],review:['qualitySupportLevel','qualityReview']};
const PAGE_SIZE=8;
const historyPlace=(event,change)=>event.after?.places?.find(place=>place.id===change.id)||event.snapshot?.places?.find(place=>place.id===change.id);
function PlaceStamp({place,categories,lang,t}){
 if(!place)return null;
 const category=categories.find(item=>item.id===place.category);
 return <span className="ops-place-stamp" style={{'--record-color':categoryColor(category)}}><Icon name={categoryVisualIcon(category)} size={13}/>{category&&(lang==='en'?category.nameEn:category.name)}{category&&<span> · {t(category.kind)}</span>}</span>;
}
function PlaceThumb({place,categories}){
 const category=categories.find(item=>item.id===place?.category);
 const image=safeImage(place?.image);
 return <span className="ops-place-thumb" style={{color:categoryColor(category),background:categoryPalette(category).wash}}><Icon name={categoryVisualIcon(category)} size={21}/>{image&&<img src={image} alt="" loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true;}}/>}</span>;
}
function Pager({page,total,onChange,t}){
 const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 if(pages<2)return null;
 return <div className="ops-pager"><span>{page+1} / {pages}</span><button type="button" className="icon-button" aria-label={t('previousPage')} disabled={!page} onClick={()=>onChange(page-1)}><Icon name="left" size={17}/></button><button type="button" className="icon-button" aria-label={t('nextPage')} disabled={page>=pages-1} onClick={()=>onChange(page+1)}><Icon name="right" size={17}/></button></div>;
}
function Detail({mobile,title,onClose,children,t}){
 if(mobile)return <Modal title={title} className="ops-detail-modal" onClose={onClose} t={t}><div className="ops-detail-content">{children}</div></Modal>;
 return <aside className="ops-detail" aria-label={title}><header><h3>{title}</h3><button type="button" className="icon-button" aria-label={t('closeDetails')} onClick={onClose}><Icon name="x" size={18}/></button></header><div className="ops-detail-content">{children}</div></aside>;
}
function displayValue(field,value,categories,t,lang){
 if(field==='supportLevel')return supportLevels.find(level=>level.id===value)?.name||t('supportLevelUnassigned');
 if(field==='deletedAt')return t(value?'opsTrashed':'opsNotTrashed');
 if(field==='review'){
  const reviewed=activityTime(value?.reviewedAt);
  return `${t(value?.status==='verified'?'reviewVerified':'reviewPending')}${reviewed?'\n'+new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(reviewed):''}`;
 }
 if(field==='schedule')return !value?.enabled?t('opsScheduleOff'):value.days.map((day,index)=>`${t(`day${index}`)}: ${day.closed?t('dayClosed'):day.allDay?'24h':`${day.opensAt}–${day.closesAt}`}`).concat((value.exceptions||[]).map(day=>`${day.date}: ${day.closed?t('dayClosed'):day.allDay?'24h':`${day.opensAt}–${day.closesAt}`}`)).join('\n');
 if(field==='category'){const category=categories.find(item=>item.id===value);return (lang==='en'?category?.nameEn:category?.name)||value||t('opsNotSet');}
 if(field==='categories')return (value||[]).map(item=><span className="ops-category-history" key={item.id}><Icon name={categoryVisualIcon(item)} size={15}/><span>{item.name}{item.nameEn?` / ${item.nameEn}`:''}<small>{t(item.kind)}{isCommunitySupport(item)?` · ${t('supportLevel')}`:''}</small></span><i style={{background:item.color}}/></span>);
 if(field==='wasteTypes')return (value||[]).map(id=>t(`waste_${id}`)).join(', ')||t('opsNotSet');
 if(field==='status'||field==='visibility')return value?t(value):t('opsNotSet');
 if(Array.isArray(value))return value.join('\n')||t('opsNotSet');
 if(value==null||value==='')return t('opsNotSet');
 return String(value);
}
export default function AdminOperations({data,currentRevision,backend,t,lang,mobile=false,onOpen,onApply,busy,initialTab='quality',initialQualityIssue='',onQualityIssueChange,onTabChange,attention,pendingReports}){
 const [tab,setTab]=useState(tabs.some(([id])=>id===initialTab)?initialTab:'quality');
 const [filter,setFilter]=useState(initialTab==='reports'?'new':'all'),[query,setQuery]=useState(''),[page,setPage]=useState(0),[selected,setSelected]=useState(null);
 const [qualityIssue,setQualityIssue]=useState(issueOrder.includes(initialQualityIssue)?initialQualityIssue:'');
 const clearIssue=()=>{setQualityIssue('');onQualityIssueChange?.('');};
 const [history,setHistory]=useState([]),[reports,setReports]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[reportBusy,setReportBusy]=useState(false),[restore,setRestore]=useState(null),[notes,setNotes]=useState({});
 const [historyQuery,setHistoryQuery]=useState(''),[changeIndex,setChangeIndex]=useState(0);
 const [cleanup,setCleanup]=useState(null),[cleanupAgreed,setCleanupAgreed]=useState(false),[cleanupError,setCleanupError]=useState(''),[cleaning,setCleaning]=useState(false),[cleaned,setCleaned]=useState(0);
 const cleaningRef=useRef(false);
 const tabBar=useRef(null);
 useEffect(()=>{
  const nav=tabBar.current,active=nav?.querySelector('[aria-pressed="true"]');
  if(!mobile||!active)return;
  nav.scrollTo?.({left:Math.max(0,active.offsetLeft-(nav.clientWidth-active.offsetWidth)/2),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 },[tab,mobile]);
 const loaded=useRef(new Set());
 const selectTab=id=>{clearIssue();setTab(id);onTabChange?.(id);setFilter(id==='reports'?'new':'all');setQuery('');setPage(0);setSelected(null);setError('');setLoading(['history','reports'].includes(id)&&!loaded.current.has(id));};
 const changeFilter=value=>{clearIssue();setFilter(value);setPage(0);setSelected(null);};
 const select=id=>{setSelected(id);setHistoryQuery('');setChangeIndex(0);};
 useEffect(()=>{
  setError('');
  const observe=tab==='history'?backend?.observeHistory:tab==='reports'?backend?.observeReports:null;
  if(!observe){setLoading(false);return;}
  setLoading(!loaded.current.has(tab));
  return observe(items=>{loaded.current.add(tab);(tab==='history'?setHistory:setReports)(items);setLoading(false);},error=>{setError(error.code==='permission-denied'?'rulesNeeded':'operationError');setLoading(false);});
 },[tab,backend]);
 const quality=useMemo(()=>newestFirst(data.places.filter(place=>!place.deletedAt),placeActivityTime).map(place=>{const issues=qualityIssues(place,data);return {place,issues:issueOrder.filter(issue=>issues.includes(issue))};}).filter(item=>item.issues.length),[data]);
 const processedHistory=useMemo(()=>history.map(event=>readableHistory(event,history,data,currentRevision)),[history,data,currentRevision]);
 const searchText=normalize(query).trim();
 const visibleQuality=quality.filter(item=>(!qualityIssue||item.issues.includes(qualityIssue))&&(filter==='all'||item.issues.some(issue=>qualityGroups[filter]?.includes(issue)))&&normalize(`${item.place.name} ${item.place.nameEn||''} ${item.place.address}`).includes(searchText));
 const visibleHistory=processedHistory.filter(event=>!event.systemSync&&normalize(`${event.actorEmail||event.actor} ${event.changes.map(change=>`${change.name} ${historyPlace(event,change)?.address||''} ${change.fields.map(field=>fieldLabel(field,t)).join(' ')}`).join(' ')}`).includes(searchText));
 const syncHistory=processedHistory.filter(event=>event.systemSync);
 const reportItems=useMemo(()=>[...new Map([...reports,...(pendingReports?.items||[])].map(item=>[item.id,item])).values()],[reports,pendingReports?.items]);
 const sortedReports=useMemo(()=>newestFirst(reportItems,reportActivityTime),[reportItems]);
 const visibleReports=sortedReports.filter(report=>(filter==='all'||report.status===filter)&&normalize(`${report.placeName} ${report.note||''} ${t(report.reason)}`).includes(searchText));
 const trash=newestFirst(data.places.filter(place=>place.deletedAt),place=>activityTime(place.deletedAt));
 const date=(value,timeOnly=false)=>{const time=activityTime(value);return time?new Intl.DateTimeFormat(lang,{...(timeOnly?{timeStyle:'short'}:{dateStyle:'medium',timeStyle:'short'}),timeZone:'Asia/Ho_Chi_Minh'}).format(time):t('noActivityDate');};
 const dayTitle=day=>day==='unknown'?t('noActivityDate'):new Intl.DateTimeFormat(lang,{dateStyle:'long',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(`${day}T00:00:00+07:00`));
 const currentPage=(items)=>Math.min(page,Math.max(0,Math.ceil(items.length/PAGE_SIZE)-1));
 const slice=items=>items.slice(currentPage(items)*PAGE_SIZE,(currentPage(items)+1)*PAGE_SIZE);
 const clearFilters=()=>{setQuery('');changeFilter('all');};
 const search=<div className="search-field operations-search"><Icon name="search" size={17}/><input aria-label={t('search')} placeholder={tab==='history'?t('opsHistorySearch'):t('search')} value={query} onChange={event=>{setQuery(event.target.value);setPage(0);setSelected(null);}}/>{query&&<button type="button" aria-label={t('clearSearch')} onClick={()=>{setQuery('');setPage(0);}}><Icon name="x" size={15}/></button>}</div>;
 const qualityItem=quality.find(item=>item.place.id===selected);
 const report=reportItems.find(item=>item.id===selected);
 const event=processedHistory.find(item=>item.id===selected);
 const matchingChanges=event?.changes.filter(change=>normalize(change.id==='categories'?t('categories'):change.name).includes(normalize(historyQuery)))||[];
 const activeChange=matchingChanges[Math.min(changeIndex,Math.max(0,matchingChanges.length-1))];
 const eventSummary=entry=>{
  const types=[...new Set(entry.changes.map(change=>historyAction(change,entry)))];
  if(entry.changes.length===1&&types[0]==='edited'){
   const fields=entry.changes[0].fields;
   return `${t('history_edited')} · ${fields.slice(0,2).map(field=>fieldLabel(field,t)).join(', ')}${fields.length>2?` +${fields.length-2}`:''}`;
  }
  return `${types.length===1?t(`history_${types[0]}`):t('opsMixedUpdate')} · ${entry.changes.length} ${t('results')}`;
 };
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
 const requestRestore=value=>{setSelected(null);setRestore(value);};
 function requestCleanup(){setCleanup(trash.map(place=>structuredClone(place)));setCleanupAgreed(false);setCleanupError('');setCleaned(0);}
 async function emptyTrash(){
  if(!cleanupAgreed||!cleanup?.length||busy||cleaningRef.current)return;
  cleaningRef.current=true;setCleaning(true);setCleanupError('');
  try{await onApply(cleanTrash(data,cleanup));setCleaned(cleanup.length);setCleanup(null);}
  catch(error){setCleanupError(error.message||'operationError');}
  finally{cleaningRef.current=false;setCleaning(false);}
 }
 async function resolve(item,status){if(reportBusy)return;setReportBusy(true);setError('');try{await backend.resolveReport(item.id,status,notes[item.id]??item.resolution??'');}catch{setError('operationError');}finally{setReportBusy(false);}}
 const toolCounts=attention||{quality:quality.length,reports:reportItems.filter(item=>item.status==='new').length,trash:trash.length};
 const reportCountStatus=pendingReports?.status||'ready';
 const toolCountLabel=id=>id==='reports'&&reportCountStatus!=='ready'
  ? reportCountStatus==='error'?'Chưa tải được số phản ánh đang chờ':'Đang tải số phản ánh đang chờ'
  : `${t(id)}: ${toolCounts[id]} ${id==='quality'?'điểm cần rà soát':id==='reports'?'phản ánh chờ':'điểm trong thùng rác'}`;
 const empty=message=><div className="ops-empty"><Icon name="check" size={26}/><strong>{t(message)}</strong>{(query||filter!=='all'||qualityIssue)&&<button type="button" className="text-button" onClick={clearFilters}>{t('opsShowAll')}</button>}</div>;
 return <section className="admin-operations ops-simple" data-tool={tab}>
  <nav ref={tabBar} className="operations-tabs" aria-label={t('adminTools')}>{tabs.map(([id,icon])=><button type="button" key={id} data-tool={id} aria-label={t(id)} aria-pressed={tab===id} onClick={()=>selectTab(id)}><Icon name={icon} size={17}/><span>{t(id)}</span>{id!=='history'&&<AttentionBadge count={toolCounts[id]} label={toolCountLabel(id)} tone={id==='reports'?'red':id==='trash'?'slate':'amber'} status={id==='reports'?reportCountStatus:'ready'}/>}</button>)}</nav>
  {pendingReports?.status==='error'&&<p className="ops-notification-status" role="status"><Icon name="alert" size={16}/>Chưa tải được số phản ánh đang chờ. Tổng thông báo chưa đầy đủ.<button type="button" onClick={pendingReports.retry}>Thử lại</button></p>}
  <div className="operations-view" key={tab} aria-busy={loading}>
   {error&&<p className="form-error" role="alert">{t(error)}</p>}{loading&&<div className="operations-loading" role="status"><span className="operations-spinner"/>{t('opsLoading')}<div/><div/><div/></div>}
   {tab==='quality'&&<div className={`ops-workspace ${qualityItem?'has-selection':''}`}><section className="panel ops-queue quality-workspace">
    <header className="ops-queue-heading"><div><h2>{t('quality')}</h2><p>{quality.length} {t('opsPlacesNeedWork')}</p></div></header>
    <div className="ops-queue-tools">{search}<div className="ops-filters" role="group" aria-label={t('quality')}>
     {['all','contact','content','review'].map(id=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>changeFilter(id)}>{t(`opsQuality_${id}`)}</button>)}
    </div></div>
    {qualityIssue&&<div className="ops-context-filter" role="status"><span>{t(qualityIssue)}</span><button type="button" onClick={clearFilters} aria-label={t('clearFilters')}><Icon name="x" size={15}/>{t('clearFilters')}</button></div>}
    <div className="ops-list-caption">{visibleQuality.length} {t('results')}<span>{t('latestActivity')}</span>{query&&<button type="button" className="text-button" onClick={clearFilters}>{t('clearFilters')}</button>}</div>
    {visibleQuality.length?slice(visibleQuality).map(({place,issues})=><article className="operation-record ops-row quality-record" key={place.id}>
     <button type="button" className="ops-row-open" aria-expanded={selected===place.id} onClick={()=>select(place.id)}><PlaceThumb place={place} categories={data.categories}/><div className="ops-row-info"><h3>{placeText(place,'name',lang)}</h3><p className="ops-place-address">{placeText(place,'address',lang)}</p><PlaceStamp place={place} categories={data.categories} t={t} lang={lang}/><div className="ops-issue-summary">{issues.slice(0,2).map(issue=><span key={issue}>{t(issue)}</span>)}{issues.length>2&&<b>+{issues.length-2}</b>}</div><small className="ops-record-date"><Icon name="clock" size={11}/>{date(placeActivityTime(place))}</small></div><span className="ops-issue-total">{issues.length}<small>mục</small></span><Icon name="right" size={18}/></button>
    </article>):empty('noIssues')}
    <Pager page={currentPage(visibleQuality)} total={visibleQuality.length} onChange={value=>{setPage(value);setSelected(null);}} t={t}/>
   </section>{qualityItem&&<Detail mobile={mobile} title={t('opsReviewPlace')} onClose={()=>setSelected(null)} t={t}>
    <h3 className="ops-detail-name">{placeText(qualityItem.place,'name',lang)}</h3><p className="ops-detail-muted">{placeText(qualityItem.place,'address',lang)}</p><PlaceStamp place={qualityItem.place} categories={data.categories} t={t} lang={lang}/>
    <h4>{t('opsCompleteThese')}</h4><ul className="ops-checks">{qualityItem.issues.map(issue=><li key={issue}><Icon name="alert" size={15}/><div><strong>{t(issue)}</strong>{issue==='qualityPhone'&&<p>{qualityItem.place.phone||t('opsNotSet')}</p>}{issue==='qualityReview'&&<p>{t('opsVerificationNote')}</p>}</div></li>)}</ul>
    <div className="ops-detail-actions"><button type="button" className="button primary" onClick={()=>onOpen(qualityItem.place.id)}><Icon name="edit" size={15}/>{t('inspect')}</button>{qualityItem.issues.includes('qualityReview')&&<button type="button" className="button secondary" disabled={busy} onClick={()=>patch(qualityItem.place,{review:{status:'verified'}})}>{t('markVerified')}</button>}</div>
   </Detail>}</div>}
   {tab==='history'&&!loading&&!error&&<div className={`ops-workspace ${event?'has-selection':''}`}><section className="panel ops-queue history-workspace">
    <header className="ops-queue-heading"><div><h2>{t('history')}</h2><p>{t('opsHistoryHint')}</p></div></header><div className="ops-queue-tools">{search}</div>
    {historyByDay(slice(visibleHistory)).map(({day,events})=><section className="history-day" key={day}><h3 className="history-day-title">{dayTitle(day)}</h3>{events.map(entry=><article className="history-record ops-row" key={entry.id}>
     <button type="button" className="ops-row-open" aria-label={`${eventSummary(entry)}, ${date(entry.createdAt)}, #${entry.revision}`} aria-expanded={selected===entry.id} onClick={()=>select(entry.id)}><div className="ops-row-info"><div className="ops-event-topline"><span className={`ops-action-label action-${entry.changes.length===1?historyAction(entry.changes[0],entry):'edited'}`}>{eventSummary(entry)}</span><time className="ops-event-time">{date(entry.createdAt,true)}</time></div><div className="ops-history-places">{entry.changes.slice(0,2).map(change=>{const point=historyPlace(entry,change);return <div key={change.id}><h3>{change.id==='categories'?t('categories'):change.name}</h3>{point&&<><p className="ops-place-address">{point.address}</p><PlaceStamp place={point} categories={entry.after?.categories||entry.snapshot.categories} t={t} lang={lang}/></>}</div>;})}{entry.changes.length>2&&<span className="ops-more-changes">Và {entry.changes.length-2} địa điểm khác — nhấn để xem</span>}</div><small className="ops-record-date"><Icon name="edit" size={11}/>{entry.actorEmail||entry.actor||t('unknownEditor')}<span>#{entry.revision}</span></small></div><Icon name="right" size={18}/></button>
    </article>)}</section>)}
    {!visibleHistory.length&&empty('historyEmpty')}
    <Pager page={currentPage(visibleHistory)} total={visibleHistory.length} onChange={value=>{setPage(value);setSelected(null);}} t={t}/>
    {!!syncHistory.length&&<details className="ops-sync"><summary>{syncHistory.length} {t('opsSyncEvents')}</summary><p>{t('opsSyncHint')}</p>{syncHistory.map(entry=><div key={entry.id}><span>{date(entry.createdAt)}</span><small>#{entry.revision} · {entry.actorEmail||entry.actor}</small></div>)}</details>}
   </section>{event&&<Detail mobile={mobile} title={t('opsChangeDetails')} onClose={()=>setSelected(null)} t={t}>
    <div className="ops-history-meta"><strong>{date(event.createdAt)}</strong><p>{event.actorEmail||event.actor} · #{event.revision}</p></div>
    {event.changes.length>1&&<><label className="ops-change-search"><span>{t('opsFindChangedPlace')}</span><input value={historyQuery} onChange={e=>{setHistoryQuery(e.target.value);setChangeIndex(0);}}/></label><div className="ops-change-paging"><span>{matchingChanges.length?Math.min(changeIndex,matchingChanges.length-1)+1:0} / {matchingChanges.length}</span><button type="button" className="icon-button" aria-label={t('previousPage')} disabled={!changeIndex} onClick={()=>setChangeIndex(index=>index-1)}><Icon name="left" size={16}/></button><button type="button" className="icon-button" aria-label={t('nextPage')} disabled={changeIndex>=matchingChanges.length-1} onClick={()=>setChangeIndex(index=>index+1)}><Icon name="right" size={16}/></button></div></>}
    {activeChange?<><h3 className="ops-detail-name">{activeChange.id==='categories'?t('categories'):activeChange.name}</h3>{historyPlace(event,activeChange)&&<><p className="ops-detail-muted">{historyPlace(event,activeChange).address}</p><PlaceStamp place={historyPlace(event,activeChange)} categories={event.after?.categories||event.snapshot.categories} t={t} lang={lang}/></>}<span className={`ops-action-label action-${historyAction(activeChange,event)}`}>{t(`history_${historyAction(activeChange,event)}`)}</span>
     <div className="ops-diff">{changeValues(event,activeChange).map(row=><section key={row.field}><h4>{fieldLabel(row.field,t)}</h4><div><span>{t('opsBefore')}</span><p>{displayValue(row.field,row.before,event.snapshot.categories,t,lang)}</p></div><div className="ops-diff-after"><span>{t('opsAfter')}</span><p>{row.knownAfter?displayValue(row.field,row.after,event.after.categories,t,lang):t('opsMissingSnapshot')}</p></div></section>)}</div>
     {event.snapshot.places.some(place=>place.id===activeChange.id)&&<button type="button" className="button secondary ops-restore-one" onClick={()=>requestRestore({event,place:event.snapshot.places.find(place=>place.id===activeChange.id)})}><Icon name="restore" size={14}/>{t('restorePlace')}</button>}
    </>:<p className="ops-detail-muted">{t('noResults')}</p>}
    <details className="ops-advanced"><summary>{t('opsAdvancedRestore')}</summary><p>{t('restoreVersionHint')}</p><button type="button" className="text-button" onClick={()=>requestRestore({event})}>{t('restoreVersion')}</button></details>
   </Detail>}</div>}
   {tab==='trash'&&<div className="panel operations-panel"><div className="panel-heading"><div><h2>{t('trash')} <span className="count-pill">{trash.length}</span></h2><p>{t('trashHint')}</p></div></div>{!!trash.length&&<div className="ops-clean-trash"><div><strong>Dọn sạch thùng rác</strong><p>Kiểm tra các điểm trước khi xóa khỏi danh bạ quản trị.</p></div><button type="button" className="button secondary" disabled={busy||cleaning} onClick={requestCleanup}><Icon name="delete" size={16}/>Dọn sạch thùng rác</button></div>}{cleaned>0&&<p className="trash-cleanup-result" role="status">Đã dọn {cleaned} địa điểm khỏi thùng rác.</p>}{trash.length?trash.map(place=><article className="operation-record" key={place.id}><div><h3>{place.name}</h3><p>{place.address}</p><small>{t('deletedAt')}: {date(place.deletedAt)}</small></div><button className="button secondary" disabled={busy} onClick={()=>patch(place,{deletedAt:null,deletedBy:null,visibility:'hidden',review:{status:'pending'}})}><Icon name="restore" size={16}/>{t('restorePlace')}</button></article>):<div className="empty-state">{t('trashEmpty')}</div>}</div>}
   {tab==='reports'&&!loading&&!error&&<div className={`ops-workspace ${report?'has-selection':''}`}><section className="panel ops-queue reports-workspace">
    <header className="ops-queue-heading"><div><h2>{t('reports')}</h2><p>{reportItems.filter(item=>item.status==='new').length} {t('awaitingReview')}</p></div></header><div className="ops-queue-tools">{search}<div className="ops-filters report-filters" role="group" aria-label={t('status')}>{['new','resolved','dismissed','all'].map(status=><button type="button" key={status} aria-pressed={filter===status} onClick={()=>changeFilter(status)}>{t(status==='all'?'all':`report_${status}`)}</button>)}</div></div>
    <div className="ops-list-caption">{visibleReports.length} {t('reportItems')}<span>{t('latestActivity')}</span></div>
    {visibleReports.length?slice(visibleReports).map(item=><article className="report-record ops-row" key={item.id}><button type="button" className="ops-row-open" aria-expanded={selected===item.id} onClick={()=>select(item.id)}><div className="ops-row-info"><h3>{item.placeName}</h3>{data.places.find(place=>place.id===item.placeId)&&<p className="ops-place-address">{data.places.find(place=>place.id===item.placeId).address}</p>}<p className="ops-report-category"><Icon name="alert" size={12}/>{t(item.reason)}</p>{item.note&&<p className="ops-report-excerpt">{item.note}</p>}<small className="ops-record-date"><Icon name="clock" size={11}/>{date(reportActivityTime(item))}</small></div><span className={`report-state report-${item.status}`}>{t(`report_${item.status}`)}</span><Icon name="right" size={18}/></button></article>):empty(filter==='new'?'opsNoPending':'reportsEmpty')}
    <Pager page={currentPage(visibleReports)} total={visibleReports.length} onChange={value=>{setPage(value);setSelected(null);}} t={t}/>
   </section>{report&&<Detail mobile={mobile} title={t('opsHandleReport')} onClose={()=>setSelected(null)} t={t}>
    <h3 className="ops-detail-name">{report.placeName}</h3>{data.places.find(place=>place.id===report.placeId)&&<p className="ops-detail-muted">{data.places.find(place=>place.id===report.placeId).address}</p>}<div className="ops-report-meta"><span className={`report-state report-${report.status}`}>{t(`report_${report.status}`)}</span><small>{date(report.createdAt)}</small></div>
    <h4>{t('opsReceivedInfo')}</h4><strong className="ops-report-reason">{t(report.reason)}</strong><p className="ops-report-note">{report.note||t('noReportNote')}</p>
    {data.places.some(point=>point.id===report.placeId&&!point.deletedAt)?<button type="button" className="text-button ops-open-place" onClick={()=>onOpen(report.placeId)}>{t('inspect')}<Icon name="arrow" size={14}/></button>:<p className="ops-detail-muted">{t('reportPlaceUnavailable')}</p>}
    <label className="ops-resolution"><span>{t('resolution')}</span><textarea maxLength={500} rows={3} placeholder={t('resolutionPlaceholder')} value={notes[report.id]??report.resolution??''} onChange={e=>setNotes({...notes,[report.id]:e.target.value})}/></label>
    <div className="ops-detail-actions">{report.status==='new'?<><button type="button" className="button primary" disabled={reportBusy} onClick={()=>resolve(report,'resolved')}><Icon name="check" size={15}/>{t('resolve')}</button><button type="button" className="button secondary" disabled={reportBusy} onClick={()=>resolve(report,'dismissed')}>{t('dismiss')}</button></>:<button type="button" className="button secondary" disabled={reportBusy} onClick={()=>resolve(report,'new')}>{t('reopen')}</button>}</div>
   </Detail>}</div>}
  </div>
  {cleanup&&<Modal title="Dọn sạch thùng rác" className="trash-cleanup-dialog" onClose={()=>{if(!cleaningRef.current)setCleanup(null);}} t={t} dismissible={!busy&&!cleaning}>
   <div className="community-modal-body"><p>Xóa {cleanup.length} địa điểm dưới đây khỏi danh bạ quản trị. Không thể khôi phục các điểm này từ thùng rác; lịch sử thay đổi vẫn được giữ theo cơ chế hiện tại.</p>
    <ul className="trash-cleanup-list">{cleanup.map(place=><li key={place.id}><strong>{place.name}</strong><small>{place.address}</small></li>)}</ul>
    <label className="trash-cleanup-confirm"><input type="checkbox" checked={cleanupAgreed} disabled={busy||cleaning} onChange={event=>setCleanupAgreed(event.target.checked)}/><span>Tôi đã kiểm tra danh sách và đồng ý xóa các địa điểm này.</span></label>
    {cleanupError&&<p className="form-error" role="alert">{t(cleanupError)}</p>}
   </div><div className="modal-footer"><button type="button" className="button secondary" data-dialog-dismiss disabled={busy||cleaning}>{t('cancel')}</button><button type="button" className="button danger" disabled={!cleanupAgreed||busy||cleaning} onClick={emptyTrash}>{busy||cleaning?'Đang dọn…':`Xóa ${cleanup.length} địa điểm`}</button></div>
  </Modal>}
  {restore&&<Modal title={t('restoreConfirm')} onClose={()=>setRestore(null)} t={t} dismissible={!busy}><div className="community-modal-body"><strong>{restore.place?.name||`${t('revision')} ${restore.event.revision}`}</strong><p>{t('restoreVersionHint')}</p>{error&&<p className="form-error" role="alert">{t(error)}</p>}</div><div className="modal-footer"><button className="button secondary" type="button" data-dialog-dismiss disabled={busy}>{t('cancel')}</button><button className="button primary" disabled={busy} onClick={restoreSnapshot}>{t(busy?'saving':'restorePlace')}</button></div></Modal>}
 </section>;
}
