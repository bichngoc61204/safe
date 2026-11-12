import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Icon, { categoryIconOptions } from './Icon';
import Modal from './Modal';
import Dropdown from './Dropdown';
import { catalogGroups } from '../lib/catalogGroups';
import PlaceForm, { usePlaceEditor } from './PlaceForm';
import PlaceGallery from './PlaceGallery';
import TrafficDashboard from './TrafficDashboard';
import { AdminPlacesMap } from './MapView';
import { placeHourRows } from '../lib/placeHours';
import { placeText } from '../lib/locale';
import { directionsUrl, filterPlaces, getCategory, isAlert, isDemoPhone, phoneHref, placePhotoUrls } from '../lib/domain';
export function Status({value,t}) {return <span className={`status status-${value}`}><i/>{t(value)}</span>;}
export function CategoryIcon({category,size=19}){return <span className="category-icon" style={{'--category-color':category.color,background:category.color+'13',color:category.color}}><Icon name={category.icon} size={size}/></span>;}
export function Login({onLogin,onBack,t,available,editorStatus}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false);
 const [error,setError]=useState(''),[pending,setPending]=useState(false);
 async function submit(event) {
   event.preventDefault();
   if (pending || !available) return;
   setError('');
   setPending(true);
   try { await onLogin(email.trim(), password); }
   catch (error) {
     setError(error.code === 'auth/network-request-failed' ? 'loginNetworkError' : 'loginError');
   } finally {
     setPending(false);
   }
 }
 const message = error || (editorStatus==='denied'?'editorDenied':editorStatus==='error'?'editorError':'');
 return <main className="login-page"><div className="login-story"><div className="login-symbol"><Icon name="map" size={86}/><span className="orbit one"><Icon name="shield" size={25}/></span><span className="orbit two"><Icon name="recycle" size={25}/></span><span className="orbit three"><Icon name="leaf" size={25}/></span></div><div className="eyebrow">SAFEMAP AN THƯỢNG</div><h1>{t('loginTitle')}</h1><p>{t('footer')}</p><div className="login-pills"><span><Icon name="shield" size={15}/>SafePoint</span><span><Icon name="recycle" size={15}/>GreenPoint</span></div></div><div className="login-form-area"><button className="text-button" onClick={onBack}><Icon name="back" size={16}/>{t('loginBack')}</button><form className="login-form" onSubmit={submit}><span className="login-lock"><Icon name="lock" size={23}/></span><h2>{t('login')}</h2><p>{t('editorLoginSubtitle')}</p><label><span>{t('email')}</span><input type="email" autoComplete="username" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} required/></label><label><span>{t('password')}</span><div className="password-field"><input type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} required/><button type="button" aria-label={t(show?'hidePassword':'showPassword')} onClick={()=>setShow(!show)}><Icon name={show?'eyeoff':'eye'} size={18}/></button></div></label>{message&&<p className="form-error" role="alert">{t(message)}</p>}<button className="button primary login-submit" disabled={pending||!available}>{t(pending?'editorChecking':'login')}<Icon name="right" size={17}/></button></form></div></main>;
}
function moveCardHighlight(event) {
 if (event.pointerType !== 'mouse') return;
 const card = event.currentTarget;
 const bounds = card.getBoundingClientRect();
 card.style.setProperty('--highlight-x', `${event.clientX - bounds.left}px`);
 card.style.setProperty('--highlight-y', `${event.clientY - bounds.top}px`);
}

function CategoryForm({category,initialKind,onSave,onClose,t,busy,saveError}) {
 const [v,setV]=useState(category||{id:crypto.randomUUID(),name:'',nameEn:'',color:'#199569',icon:'store',kind:initialKind||'safe'});
 return <Modal title={t(category?'edit':'addCategory')} onClose={onClose} t={t} dismissible={!busy}><form onSubmit={e=>{e.preventDefault();if(v.name.trim()&&v.nameEn.trim())onSave({...v,name:v.name.trim(),nameEn:v.nameEn.trim()});}}><div className="form-scroll"><div className="form-grid"><label className="span-2"><span>{t('categoryName')} *</span><input required value={v.name} maxLength={60} onChange={e=>setV({...v,name:e.target.value})}/></label><label className="span-2"><span>{t('nameEn')} *</span><input required value={v.nameEn} maxLength={60} onChange={e=>setV({...v,nameEn:e.target.value})}/></label><div className="form-dropdown span-2"><span>{t('kind')}</span><Dropdown label={t('kind')} value={v.kind} disabled={!!category} onChange={kind=>setV({...v,kind})}>
   {catalogGroups.map(group=><option key={group.id} value={group.id}>{t(group.label)}</option>)}
 </Dropdown></div><label><span>{t('color')}</span><input type="color" value={v.color} onChange={e=>setV({...v,color:e.target.value})}/></label><div className="form-dropdown"><span>{t('icon')}</span><Dropdown label={t('icon')} value={v.icon} onChange={icon=>setV({...v,icon})}>
   {categoryIconOptions.map(icon=><option key={icon} value={icon}>{icon}</option>)}
 </Dropdown></div><div className="category-preview span-2"><CategoryIcon category={v}/><strong>{v.name||t('categoryName')}</strong><small>{v.nameEn}</small></div></div></div>{saveError&&<p className="form-error place-form-error" role="alert">{t(saveError)}</p>}<div className="modal-footer"><button className="button secondary" type="button" data-dialog-dismiss disabled={busy}>{t('cancel')}</button><button className="button primary" disabled={busy}>{t(busy?'saving':'save')}</button></div></form></Modal>;
}
const mobileAdminQuery='(max-width: 700px)';
const overviewTabs=[
  ['summary','overviewSummary','dashboard'],
  ['activity','overviewActivity','clock'],
  ['traffic','overviewTraffic','chart'],
];

function OverviewTabs({value,onChange,t}) {
  const active=overviewTabs.findIndex(([id])=>id===value);
  function moveTab(event){
    const last=overviewTabs.length-1;
    const offsets={ArrowLeft:active-1,ArrowRight:active+1,Home:0,End:last};
    if(!Object.hasOwn(offsets,event.key))return;
    event.preventDefault();
    const index=(offsets[event.key]+overviewTabs.length)%overviewTabs.length;
    onChange(overviewTabs[index][0]);
    event.currentTarget.querySelectorAll('[role="tab"]')[index]?.focus({preventScroll:true});
  }
  return <div className="overview-switch" role="tablist" aria-label={t('overview')} onKeyDown={moveTab}
    style={{'--overview-index':active}}>
    {overviewTabs.map(([id,label,icon])=><button type="button" key={id} role="tab" id={`overview-tab-${id}`}
      aria-controls="overview-panel" aria-selected={value===id} tabIndex={value===id?0:-1} onClick={()=>onChange(id)}>
      <Icon name={icon} size={15}/><span>{t(label)}</span>
    </button>)}
  </div>;
}
const isMobileAdmin=()=>window.matchMedia?.(mobileAdminQuery).matches??false;
function subscribeMobileAdmin(notify) {
  const media=window.matchMedia?.(mobileAdminQuery);
  media?.addEventListener?.('change',notify);
  return ()=>media?.removeEventListener?.('change',notify);
}

function MobilePlaceCard({place,category,categoryName,groupLabel,t,lang,index,onDetails}) {
  const [image]=placePhotoUrls(place);
  return <li className="admin-mobile-place" style={{'--card-delay':`${index*34}ms`,'--category-color':category.color}}>
    <button type="button" className="admin-mobile-place-main" aria-haspopup="dialog" onClick={onDetails}>
      <span className="admin-mobile-place-image">
        <CategoryIcon category={category} size={20}/>
        {image&&<img key={image} src={image} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true;}}/>}
      </span>
      <span className="admin-mobile-place-copy">
        <strong>{placeText(place,'name',lang)}</strong>
        <span className="admin-mobile-place-address"><Icon name="pin" size={13}/><span title={placeText(place,'address',lang)}>{placeText(place,'address',lang)}</span></span>
      </span>
      <Icon name="right" size={16}/>
    </button>
    <div className="admin-mobile-place-meta">
      <span className="admin-category-tag">{categoryName}</span>
      <Status value={place.status} t={t}/>
      <small>{groupLabel}</small>
    </div>
  </li>;
}

function PlacePreview({place,categories,groupLabel,t,lang,editing,busy,saveError,onEdit,onSave,onCancel,onDelete,onClose,inDialog=false}) {
  const editor=usePlaceEditor({place,categories,onSave,t,lang,busy,saveError,active:editing});
  const [metadataOpen,setMetadataOpen]=useState(false);
  const category=getCategory(categories,place.category);
  const images=placePhotoUrls(place);
  const demoPhone=isDemoPhone(place.phone);
  const number=phoneHref(place.phone);
  const timestamp=Date.parse(place.updatedAt);
  const updated=Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(timestamp)
    : null;
  const hours=Object.fromEntries(placeHourRows(place,lang));
  const contact=<>{number!=='tel:'&&!demoPhone?<a href={number}>{place.phone}</a>:place.phone||t('noPhone')}
    {demoPhone&&<small> · {t('demoPhone')}</small>}</>;
  const facts=[
    ['phone','phone',contact], ['owner','building',placeText(place,'owner',lang)],
    ['opensAt','clock',hours.opensAt], ['closesAt','clock',hours.closesAt],
    ['hours','',hours.hours,true], ['waste','recycle',placeText(place,'waste',lang),true], ['description','list',placeText(place,'description',lang),true],
  ];
  const gallery=images.length?<PlaceGallery images={images} name={placeText(place,'name',lang)} t={t}/>:
    <p className="admin-preview-no-photo"><Icon name="image" size={18}/>{t('noPlacePhotos')}</p>;
  function factField(key,icon){
    if(key==='phone')return editor.phoneField(icon);
    if(key==='opensAt'||key==='closesAt')return editor.timeField(key,icon);
    return editor.field(key,{
      icon, label:key==='hours'?'hoursNotes':key, textarea:key==='description', rows:2,
      maxLength:{owner:150,hours:100,waste:250}[key],
    });
  }
  return <><form className="admin-preview-content" aria-label={t('details')} data-editing={editing}
    style={{'--preview-accent':category?.color}} onSubmit={editing?editor.submit:event=>event.preventDefault()}
    onInvalid={event=>{
      const details=event.target.closest('details');
      if(details)details.open=true;
    }}>
    <header className="admin-sheet-heading">
      {category&&<span className="preview-category"><CategoryIcon category={category} size={16}/>
        <span><small>{groupLabel}</small><strong>{lang==='en'?category.nameEn:category.name}</strong></span>
      </span>}
      {editing&&<span className="admin-preview-edit-label"><Icon name="edit" size={13}/>{t('edit')}</span>}
      {!inDialog&&<button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label={t('closeDetails')} title={t('closeDetails')}><Icon name="x" size={19}/></button>}
    </header>
    <div className="admin-preview-body" inert={editing&&busy}>
      <section className="admin-preview-section admin-preview-identity">
        <h4><Icon name="pin" size={15}/>{t('basicInfo')}</h4>
        <div className="admin-preview-fields">
        {editing?<>
          {editor.field('name',{required:true,maxLength:150})}
          {editor.field('address',{required:true,maxLength:250,icon:'pin'})}
        </>:<>
          <div className="admin-preview-field"><small>{t('name')}</small><h3>{placeText(place,'name',lang)}</h3></div>
          <div className="admin-preview-field"><small><Icon name="pin" size={13}/>{t('address')}</small><p>{placeText(place,'address',lang)}</p></div>
        </>}
        <div className="admin-preview-classification">
          {editing?<>{editor.groupField}{editor.categoryField}{editor.statusField}</>:<>
            <div className="admin-preview-field"><small>{t('kind')}</small><p>{groupLabel}</p></div>
            <div className="admin-preview-field"><small>{t('category')}</small><p>{category&&(lang==='en'?category.nameEn:category.name)}</p></div>
            <div className="admin-preview-field"><small>{t('status')}</small><Status value={place.status} t={t}/></div>
          </>}
        </div>
        </div>
      </section>
      <section className="admin-preview-section">
      <h4><Icon name="list" size={15}/>{t('details')}</h4>
      <dl className="admin-preview-facts">
        {facts.filter(([key,,value])=>editing?(key!=='waste'||editor.acceptsWaste):value).map(([key,icon,value,wide])=>
          <div key={key} className={wide?'admin-preview-wide-fact':undefined}>
            {editing?<><dt className="sr-only">{t(key)}</dt><dd>{factField(key,icon)}</dd></>:<>
              <dt>{icon&&<Icon name={icon} size={13}/>} {t(key)}</dt><dd>{value}</dd>
            </>}
          </div>)}
        {editing&&editor.hoursHint&&<div className="admin-preview-wide-fact"><dt className="sr-only">{t('hours')}</dt><dd>{editor.hoursHint}</dd></div>}
      </dl>
      </section>
      <section className="admin-preview-section admin-preview-photos">
        <h4><Icon name="image" size={15}/>{t('placeImages')}{images.length>0&&<span>{images.length}</span>}</h4>
        {gallery}
        {editing&&<details className="admin-preview-photo-editor">
          <summary>{t('edit')} · {t('placeImages')}</summary>
          {editor.imageFields}
        </details>}
      </section>
      <details className="admin-preview-section admin-preview-metadata" onToggle={event=>setMetadataOpen(event.currentTarget.open)}>
        <summary><Icon name="info" size={15}/>{t('dataDetails')}<Icon name="down" size={14}/></summary>
        {editing?<div className="admin-preview-fields">
          <div className="admin-preview-coordinates">{editor.coordinateFields}</div>
          {metadataOpen&&editor.coordinatePicker}
          {editor.field('source',{maxLength:150})}
        </div>:<dl>
          <div><dt>{t('coordinates')}</dt><dd>{place.lat.toFixed(6)}, {place.lng.toFixed(6)}</dd></div>
          {place.source&&<div><dt>{t('source')}</dt><dd>{placeText(place,'source',lang)}</dd></div>}
          {updated&&<div><dt>{t('updated')}</dt><dd><time dateTime={place.updatedAt}>{updated}</time></dd></div>}
          {!inDialog&&<div><dt>{t('directions')}</dt><dd><a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">Google Maps ↗</a></dd></div>}
        </dl>}
      </details>
      {editing&&editor.englishFields}
    </div>
    <div className="admin-preview-footer">
      {editing&&editor.errorMessage}
      <div className="admin-preview-actions">
        {editing?<>
          <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>{t('cancel')}</button>
          <button className="button primary" type="submit" disabled={busy}><Icon name="check" size={16}/>{t(busy?'saving':'save')}</button>
        </>:<>
          <button className="button primary" type="button" onClick={()=>{editor.reset();onEdit();}} disabled={busy}><Icon name="edit" size={16}/>{t('edit')}</button>
          <button className="button secondary danger-text" type="button" onClick={onDelete} disabled={busy}><Icon name="delete" size={16}/>{t('delete')}</button>
        </>}
      </div>
    </div>
  </form>{editor.imagePreview}</>;
}

export default function Admin({data,commit,t,lang,notify,onLogout,email,getIdToken}) {
 const mobile=useSyncExternalStore(subscribeMobileAdmin,isMobileAdmin);
 const [tab,setTab]=useState('overview');
 const [overview,setOverview]=useState('summary');
 const [query,setQuery]=useState('');
 const [groupFilter,setGroupFilter]=useState('all');
 const [category,setCategory]=useState('all');
 const [status,setStatus]=useState('all');
 const [page,setPage]=useState(1);
 const [edit,setEdit]=useState(null);
 const [editCategory,setEditCategory]=useState(null);
 const [deleting,setDeleting]=useState(null);
 const [previewId,setPreviewId]=useState(null);
 const [hoveredPlaceId,setHoveredPlaceId]=useState(null);
 const mapPanel=useRef(null);
 const [busy,setBusy]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [saveError,setSaveError]=useState('');
 const saving=useRef(false);
 const {places,categories}=data;
 const group=catalogGroups.find(item=>item.id===tab);
 const scope=group?.id ?? (groupFilter==='all'?'map':groupFilter);
 const categoryName=item=>lang==='en'?item.nameEn:item.name;
 const groupName=id=>t(catalogGroups.find(item=>item.id===id)?.label??id);
 const groups=catalogGroups.map(item=>{
   const children=categories.filter(category=>category.kind===item.id);
   const ids=new Set(children.map(category=>category.id));
   return {...item,children,count:places.filter(place=>ids.has(place.category)).length};
 });
 const alerts=places.filter(place=>getCategory(categories,place.category)?.kind==='green'&&isAlert(place));
 const visibleCategories=categories.filter(item=>scope==='map'||item.kind===scope);
 const filtered=useMemo(()=>{
   const rank=new Map(catalogGroups.flatMap(group=>categories.filter(category=>category.kind===group.id)).map((item,index)=>[item.id,index]));
   return filterPlaces(places,categories,{query,category,status,scope})
     .sort((a,b)=>(rank.get(a.category)??0)-(rank.get(b.category)??0)||a.name.localeCompare(b.name,'vi'));
 },[places,categories,query,category,status,scope]);
 const pages=Math.max(1,Math.ceil(filtered.length/7));
 const current=Math.min(page,pages);
 const visible=filtered.slice((current-1)*7,current*7);
 const inlineEdit=Boolean(edit?.place);
 const preview=places.find(place=>place.id===previewId)??edit?.place;
 const mapPlaces=useMemo(()=>{
   if(!preview||filtered.some(place=>place.id===preview.id))return filtered;
   return [...filtered,preview];
 },[filtered,preview]);
 const mapHoverId=!inlineEdit&&visible.some(place=>place.id===hoveredPlaceId)?hoveredPlaceId:null;
 const recent=[...places].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,5);
 const title=tab==='overview'?'overview':tab==='categories'?'manageCategories':group?.label??'managePlaces';

 function clearFilters(){
   setQuery('');setGroupFilter('all');setCategory('all');setStatus('all');setPage(1);
 }
 function navigate(next){
   if(inlineEdit){if(saving.current)return;closeDialog(setEdit);}
   setTab(next);setPreviewId(null);setHoveredPlaceId(null);clearFilters();
   if(window.scrollY>0)window.scrollTo({top:0,behavior:'instant'});
 }
 function revealMap(){
   if(mobile||!window.matchMedia?.('(max-width: 1000px)').matches)return;
   const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   requestAnimationFrame(()=>mapPanel.current?.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'}));
 }
 function changeGroup(value){
   if(group)navigate(value==='all'?'places':value);
   else{setGroupFilter(value);setCategory('all');setStatus('all');setPage(1);}
 }
 function changeCategory(value){
   setCategory(value);setPage(1);
 }
 function selectPreview(id){
   if(inlineEdit)return;
   setPreviewId(id);
   revealMap();
 }
 function closePreview(){
   if(saving.current)return;
   if(inlineEdit)closeDialog(setEdit);
   setPreviewId(null);
 }
 function closeDialog(setDialog){
   if(!saving.current){setSaveError('');setDialog(null);}
 }
 function recordChanged(original, current) {
   if (!original || JSON.stringify(original)===JSON.stringify(current)) return false;
   setSaveError('catalogConflict');
   return true;
 }
 async function apply(next,onSuccess){
   if(saving.current)return;
   saving.current=true;setBusy(true);setSaveError('');
   try { await commit(next);onSuccess(); }
   catch(error){setSaveError(error.message);}
   finally {saving.current=false;setBusy(false);}
 }
 function savePlace(place){
   const existing=places.find(item=>item.id===place.id);
   if(recordChanged(edit.place,existing))return;
   const next=existing?places.map(item=>item.id===place.id?place:item):[place,...places];
   return apply({...data,places:next},()=>{setEdit(null);notify('saved');});
 }
 function saveCategory(item){
   const existing=categories.find(category=>category.id===item.id);
   if(recordChanged(editCategory.category,existing))return;
   const next=existing?categories.map(category=>category.id===item.id?item:category):[...categories,item];
   return apply({...data,categories:next},()=>{setEditCategory(null);notify('saved');});
 }
 function remove(){
   const collection=deleting.type==='category'?'categories':'places';
   const records=data[collection];
   if(recordChanged(deleting.record,records.find(item=>item.id===deleting.record.id)))return;
   if(collection==='categories'&&places.some(place=>place.category===deleting.record.id)){
     setSaveError('categoryInUse');return;
   }
   return apply({...data,[collection]:records.filter(item=>item.id!==deleting.record.id)},()=>{
     if(collection==='places'&&previewId===deleting.record.id)setPreviewId(null);
     setDeleting(null);notify(collection==='categories'?'categoryDeleted':'deleted');
   });
 }
 function add(){
   if(group&&!groupHasCategories(group.id)){notify('noCategory');return;}
   setEdit({initialKind:group?.id});
 }
 const placeCard=preview&&<PlacePreview key={preview.id} place={preview} categories={categories}
   groupLabel={groupName(getCategory(categories,preview.category)?.kind??'safe')} t={t} lang={lang} inDialog={mobile}
   editing={inlineEdit} busy={busy} saveError={saveError} onClose={closePreview}
   onEdit={()=>setEdit({place:preview})} onSave={savePlace} onCancel={()=>closeDialog(setEdit)}
   onDelete={()=>setDeleting({type:'place',record:preview})}/>;
 function groupHasCategories(id){return categories.some(category=>category.kind===id);}
 async function exportData(){
   if(exporting)return;
   setExporting(true);
   try {
     const {exportCatalog}=await import('../lib/exportCatalog.js');
     await exportCatalog(data,t,lang);
     notify('exported');
   } catch {notify('excelError');}
   finally {setExporting(false);}
 }
 const nav=[{id:'overview',label:'overview',icon:'dashboard'},{id:'places',label:'places',icon:'pin'},...catalogGroups,{id:'categories',label:'categories',icon:'tags'}];
 const states=['active','clean','warning','overloaded','inactive'];
 const stateCounts=states.map(id=>({id,count:places.filter(place=>place.status===id).length}));

 return <div className="admin-layout">
   <aside className="admin-sidebar">
     <div className="admin-sidebar-label">{t('workspace')}</div>
     <nav aria-label={t('workspace')} style={{'--dock-index':nav.findIndex(item=>item.id===tab)}}>{nav.map(item=><button key={item.id} data-section={item.id}
       className={tab===item.id?'active':''} aria-label={t(item.label)} title={t(item.label)} aria-current={tab===item.id?'page':undefined} onClick={()=>navigate(item.id)}>
       <Icon name={item.icon}/><span>{t(item.label)}</span>{item.id==='green'&&alerts.length>0&&<b>{alerts.length}</b>}
     </button>)}</nav>
     <div className="admin-sidebar-bottom">
       <div className="admin-profile"><span>AD</span><div><strong>SafeMap Admin</strong><small>{email}</small></div></div>
       <button className="text-button" onClick={onLogout}><Icon name="logout" size={16}/>{t('logout')}</button>
     </div>
   </aside>
   <main className="admin-main">
     <div className="admin-heading">
       <div><div className="eyebrow">{t('dataLabel')}</div><h1>{t(title)}</h1>{tab==='overview'&&<p>{t('adminSubtitle')}</p>}</div>
       <div className="admin-heading-actions">
         <button className="button secondary" onClick={exportData} disabled={exporting}><Icon name="download" size={16}/>{t(exporting?'exportingExcel':'exportExcel')}</button>
         {tab!=='categories'&&<button className="button primary" onClick={add} disabled={inlineEdit}><Icon name="plus" size={16}/>{t('add')}</button>}
       </div>
     </div>
     <div className="admin-content" key={tab}>
       {tab==='overview'?<>
         <OverviewTabs value={overview} onChange={setOverview} t={t}/>
         <div className="overview-view" key={overview} id="overview-panel" role="tabpanel" aria-labelledby={`overview-tab-${overview}`} tabIndex={0}>
           {overview==='summary'?<>
             <div className="stats-grid">
               {[{id:'places',label:'total',icon:'pin',count:places.length},...groups].map((item,index)=><button key={item.id}
                 className={`stat-card stat-${index}`} onPointerMove={moveCardHighlight} onClick={()=>navigate(item.id)}>
                 <div><span>{t(item.label)}</span><span className="stat-icon"><Icon name={item.icon} size={20}/></span></div>
                 <strong>{String(item.count).padStart(2,'0')}</strong><small>{t('viewAll')} <span className="stat-arrow"><Icon name="arrow" size={15}/></span></small>
               </button>)}
             </div>
             <div className="overview-grid">
               <section className="panel">
                 <div className="panel-heading"><h2>{t('groupDistribution')}</h2><Icon name="tags" size={18}/></div>
                 <div className="admin-chart">{groups.map(item=><button key={item.id} onClick={()=>navigate(item.id)} className="admin-chart-row" style={{'--chart-color':item.color}}>
                   <span>{t(item.label)}</span><b>{item.count}</b><i><i style={{width:`${places.length?100*item.count/places.length:0}%`}}/></i>
                 </button>)}</div>
               </section>
               <section className="panel">
                 <div className="panel-heading"><h2>{t('statusDistribution')}</h2><Icon name="list" size={18}/></div>
                 <div className="admin-chart">{stateCounts.map(item=><button key={item.id} data-status={item.id} className="admin-chart-row"
                   onClick={()=>{navigate('places');setStatus(item.id);}}>
                   <span>{t(item.id)}</span><b>{item.count}</b><i><i style={{width:`${places.length?100*item.count/places.length:0}%`}}/></i>
                 </button>)}</div>
               </section>
             </div>
           </>:overview==='activity'?<div className="overview-grid">
             <section className="panel attention-panel">
               <div className="panel-heading"><div><span className="section-kicker">GREENPOINT</span><h2>{t('attention')}</h2></div>
                 <button className="text-button" onClick={()=>{navigate('green');setStatus('alerts');}}>{t('viewAll')}<Icon name="arrow" size={15}/></button>
               </div>
               {alerts.length?alerts.map(place=><div className="attention-row" key={place.id}>
                 <CategoryIcon category={getCategory(categories,place.category)}/><div><strong>{placeText(place,'name',lang)}</strong><p>{placeText(place,'address',lang)}</p><Status value={place.status} t={t}/></div>
                 <button className="icon-button" aria-label={`${t('edit')} ${placeText(place,'name',lang)}`} onClick={()=>{navigate('green');selectPreview(place.id);setEdit({place});}}><Icon name="edit" size={16}/></button>
               </div>):<div className="empty-state"><Icon name="check"/><p>{t('noAlerts')}</p></div>}
             </section>
             <section className="panel recent-panel">
               <div className="panel-heading"><h2>{t('recent')}</h2><button className="text-button" onClick={()=>navigate('places')}>{t('viewAll')}</button></div>
               {recent.length?<div className="recent-places">{recent.map(place=>{
                 const item=getCategory(categories,place.category);
                 const timestamp=Date.parse(place.updatedAt);
                 const time=Number.isFinite(timestamp)?new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(timestamp):t('unknownDate');
                 return <button key={place.id} onClick={()=>{navigate('places');selectPreview(place.id);}}>
                   <CategoryIcon category={item} size={17}/>
                   <span className="recent-place-label"><strong>{placeText(place,'name',lang)}</strong><small>{placeText(place,'address',lang)}</small>
                     <span>{categoryName(item)} <span aria-hidden="true">·</span> {groupName(item.kind)}</span>
                   </span>
                   <span className="recent-place-meta"><time dateTime={Number.isFinite(timestamp)?place.updatedAt:undefined}>{time}</time><Status value={place.status} t={t}/></span>
                   <Icon name="right" size={15}/>
                 </button>;
               })}</div>:<div className="empty-state">{t('noResults')}</div>}
             </section>
           </div>:<TrafficDashboard t={t} lang={lang} getIdToken={getIdToken}/>}

         </div>
       </>:tab==='categories'?<div className="admin-category-groups">
         {groups.map(item=><section className="panel category-group-panel" key={item.id} style={{'--group-color':item.color}}>
           <div className="panel-heading"><div><span className="section-kicker">{t('kind')}</span><h2>{t(item.label)} <span className="count-pill">{item.children.length}</span></h2></div>
             <button className="button secondary" onClick={()=>setEditCategory({initialKind:item.id})}><Icon name="plus" size={16}/>{t('addCategory')}</button>
           </div>
           {item.children.length?<div className="category-grid">{item.children.map(child=>{
             const count=places.filter(place=>place.category===child.id).length;
             return <article className="category-card" key={child.id} style={{'--category-color':child.color}}>
               <CategoryIcon category={child}/><h3>{categoryName(child)}</h3>
               <button className="text-button category-place-count" onClick={()=>{navigate(item.id);setCategory(child.id);}}>{count} {t('results')}</button>
               <div><button className="text-button" onClick={()=>setEditCategory({category:child})}><Icon name="edit" size={14}/>{t('edit')}</button>
                 <button className="text-button danger-text" aria-label={`${t('delete')} ${child.name}`} onClick={()=>{
                   if(count){notify('categoryInUse');return;}setDeleting({type:'category',record:child});
                 }}><Icon name="delete" size={14}/></button></div>
             </article>;
           })}</div>:<div className="empty-state">{t('noCategory')}</div>}
         </section>)}
       </div>:<section className="admin-places">
       <div className={`admin-places-layout ${mobile?'is-mobile':''}`}>
       <div className="panel admin-places-toolbar">
         <div className="panel-heading"><h2>{t(group?.label??'allPlaces')} <span className="count-pill">{filtered.length}</span></h2>
           {!mobile&&<button type="button" className="button secondary admin-open-map" onClick={revealMap}><Icon name="map" size={16}/>{t('viewMap')}</button>}
         </div>
         <div className="table-toolbar">
           <div className="search-field"><Icon name="search" size={18}/><input aria-label={t('search')} placeholder={t('search')} value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}}/>
             {query&&<button aria-label={t('clearSearch')} onClick={()=>{setQuery('');setPage(1);}}><Icon name="x" size={14}/></button>}</div>
           <div className="admin-filter-row">
             <span>{t('kind')}</span>
             <div className="category-chips" role="group" aria-label={t('kind')}>
               <button type="button" aria-pressed={!group&&groupFilter==='all'} onClick={()=>changeGroup('all')}>{t('allGroups')}</button>
               {catalogGroups.map(item=><button type="button" key={item.id} aria-pressed={(group?.id??groupFilter)===item.id}
                 style={{'--chip-color':item.color}} onClick={()=>changeGroup(item.id)}><Icon name={item.icon} size={14}/>{t(item.label)}</button>)}
             </div>
           </div>
           <div className="admin-filter-row">
             <span>{t('category')}</span>
             <div className="category-chips" key={scope} role="group" aria-label={t('category')}>
               <button type="button" aria-pressed={category==='all'} onClick={()=>changeCategory('all')}>{t('allCategories')}</button>
               {visibleCategories.map(item=><button type="button" key={item.id} aria-pressed={category===item.id}
                 style={{'--chip-color':item.color}} onClick={()=>changeCategory(item.id)}><Icon name={item.icon} size={14}/>{categoryName(item)}</button>)}
             </div>
           </div>
           {(query||groupFilter!=='all'||category!=='all'||status!=='all')&&
             <div className="admin-filter-footer">
               {status!=='all'&&<Status value={status==='alerts'?'alertStatus':status} t={t}/>}
               <button type="button" className="text-button admin-clear-filters" onClick={clearFilters}><Icon name="x" size={15}/>{t('clearFilters')}</button>
             </div>}
         </div>
       </div>
       <div className="panel admin-places-list" aria-label={t('places')}>
         {mobile?<ul className="admin-mobile-places" key={`${scope}:${category}:${current}`}>
           {visible.map((place,index)=>{
             const item=getCategory(categories,place.category);
             return <MobilePlaceCard key={place.id} place={place} category={item} categoryName={categoryName(item)} groupLabel={groupName(item.kind)}
               index={index} t={t} lang={lang} onDetails={()=>selectPreview(place.id)}/>;
           })}
         </ul>:<div className="table-scroll"><table><thead><tr><th scope="col">{t('name')}</th><th scope="col">{t('category')}</th><th scope="col">{t('status')}</th></tr></thead>
           <tbody key={current}>{visible.map((place,index)=>{
             const item=getCategory(categories,place.category);
             return <tr key={place.id} className={previewId===place.id?'is-previewed':undefined}
               style={{'--ui-order':index}}
               onPointerEnter={event=>{if(event.pointerType==='mouse')setHoveredPlaceId(place.id);}}
               onPointerLeave={()=>setHoveredPlaceId(id=>id===place.id?null:id)}
               onClick={event=>{if(!event.target.closest('button'))selectPreview(place.id);}}>
               <td><div className="table-place"><CategoryIcon category={item} size={17}/><div>
                 <button className="admin-place-name" type="button" aria-disabled={inlineEdit} aria-expanded={previewId===place.id} onClick={()=>selectPreview(place.id)}>{placeText(place,'name',lang)}</button>
                 <small>{placeText(place,'address',lang)}</small>{group?.id==='green'&&placeText(place,'waste',lang)&&<small>{placeText(place,'waste',lang)}</small>}
               </div></div></td>
               <td><span className="admin-category-tag" style={{'--category-color':item.color}}>{categoryName(item)}</span>{!group&&<small className="table-group-label">{groupName(item.kind)}</small>}</td>
               <td><Status value={place.status} t={t}/></td>
             </tr>;
           })}</tbody></table>
           {!visible.length&&<div className="empty-state"><Icon name="search" size={30}/><h3>{t('noResults')}</h3></div>}
         </div>}
         {mobile&&!visible.length&&<div className="empty-state"><Icon name="search" size={30}/><h3>{t('noResults')}</h3></div>}
         <div className="pagination"><span aria-live="polite">{filtered.length} {t('results')}</span><div>
           <button className="icon-button" disabled={current<=1} aria-label={t('previousPage')} onClick={()=>setPage(current-1)}><Icon name="left" size={16}/></button>
           <span>{t('page')} {current} {t('of')} {pages}</span>
           <button className="icon-button" disabled={current>=pages} aria-label={t('nextPage')} onClick={()=>setPage(current+1)}><Icon name="right" size={16}/></button>
         </div></div>
       </div>
       {!mobile&&<aside ref={mapPanel} className={`admin-place-preview ${preview?'has-place':''}`} aria-label={t('viewMap')}
         onKeyDown={event=>{if(event.key==='Escape'&&!event.defaultPrevented&&!inlineEdit)closePreview();}}>
         <div className="admin-preview-map">
           <AdminPlacesMap places={mapPlaces} categories={categories} selected={preview?.id} hovered={mapHoverId} onSelect={selectPreview} t={t} lang={lang}/>
           <div className="admin-preview-header"><h2>{t('viewMap')}</h2></div>
         </div>
         {placeCard}
       </aside>}
       </div>
       </section>}
     </div>
     <p className="admin-notice"><Icon name="help" size={16}/><span>{t('adminFirebase')}</span></p>
   </main>
   {mobile&&preview&&<Modal title={t('details')} className="admin-place-dialog" onClose={closePreview} t={t} dismissible={!busy}>
     {placeCard}
   </Modal>}
   {edit&&!inlineEdit&&<PlaceForm initialKind={edit.initialKind} categories={categories} onSave={savePlace}
     onClose={()=>closeDialog(setEdit)} t={t} lang={lang} busy={busy} saveError={saveError}/>}
   {editCategory&&<CategoryForm category={editCategory.category} initialKind={editCategory.initialKind} onSave={saveCategory}
     onClose={()=>closeDialog(setEditCategory)} t={t} busy={busy} saveError={saveError}/>}
   {deleting&&<Modal title={t(deleting.type==='category'?'confirmCategory':'confirmDelete')} onClose={()=>closeDialog(setDeleting)} t={t} dismissible={!busy}>
     <div className="delete-content"><span className="delete-icon"><Icon name="delete" size={25}/></span><strong>{placeText(deleting.record,'name',lang)}</strong><p>{t('deleteHint')}</p></div>
     {saveError&&<p className="form-error place-form-error" role="alert">{t(saveError)}</p>}
     <div className="modal-footer"><button className="button secondary" type="button" data-dialog-dismiss disabled={busy}>{t('cancel')}</button>
       <button className="button danger" onClick={remove} disabled={busy}>{t(busy?'saving':'delete')}</button></div>
   </Modal>}
 </div>;
}
