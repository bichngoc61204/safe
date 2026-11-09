import { useMemo, useRef, useState } from 'react';
import Icon, { categoryIconOptions } from './Icon';
import Modal from './Modal';
import Dropdown from './Dropdown';
import { catalogGroups } from '../lib/catalogGroups';
import PlaceForm from './PlaceForm';
import { CoordinatePicker } from './MapView';
import { filterPlaces, getCategory, isAlert } from '../lib/domain';
export function Status({value,t}) {return <span className={`status status-${value}`}><i/>{t(value)}</span>;}
export function CategoryIcon({category,size=19}){return <span className="category-icon" style={{'--category-color':category.color,background:category.color+'13',color:category.color}}><Icon name={category.icon} size={size}/></span>;}
export function Login({onLogin,onBack,t,demo,available,editorStatus}){
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
 const message = error || (editorStatus==='denied'?'editorDenied':editorStatus==='error'&&!demo?'editorError':'');
 return <main className="login-page"><div className="login-story"><div className="login-symbol"><Icon name="map" size={86}/><span className="orbit one"><Icon name="shield" size={25}/></span><span className="orbit two"><Icon name="recycle" size={25}/></span><span className="orbit three"><Icon name="leaf" size={25}/></span></div><div className="eyebrow">SAFEMAP AN THƯỢNG</div><h1>{t('loginTitle')}</h1><p>{t('footer')}</p><div className="login-pills"><span><Icon name="shield" size={15}/>SafePoint</span><span><Icon name="recycle" size={15}/>GreenPoint</span></div></div><div className="login-form-area"><button className="text-button" onClick={onBack}><Icon name="back" size={16}/>{t('loginBack')}</button><form className="login-form" onSubmit={submit}><span className="login-lock"><Icon name="lock" size={23}/></span><h2>{t('login')}</h2><p>{t(demo?'loginSubtitle':'editorLoginSubtitle')}</p><label><span>{t('email')}</span><input type="email" autoComplete="username" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} placeholder={demo?"admin@safemap.vn":undefined} required/></label><label><span>{t('password')}</span><div className="password-field"><input type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} required/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}><Icon name={show?'eyeoff':'eye'} size={18}/></button></div></label>{message&&<p className="form-error" role="alert">{t(message)}</p>}<button className="button primary login-submit" disabled={pending||!available}>{t(pending?'editorChecking':'login')}<Icon name="right" size={17}/></button>{demo&&<div className="demo-account"><strong>{t('demoAccount')}</strong><code>admin@safemap.vn<br/>SafeMap2026!</code><button className="text-button" type="button" onClick={()=>{setEmail('admin@safemap.vn');setPassword('SafeMap2026!');setError('');}}>{t('fillDemo')}<Icon name="arrow" size={15}/></button></div>}{demo&&<small><Icon name="help" size={14}/>{t('loginNotice')}</small>}</form></div></main>;
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
 return <Modal title={t(category?'edit':'addCategory')} onClose={onClose} t={t}><form onSubmit={e=>{e.preventDefault();if(v.name.trim()&&v.nameEn.trim())onSave({...v,name:v.name.trim(),nameEn:v.nameEn.trim()});}}><div className="form-scroll"><div className="form-grid"><label className="span-2"><span>{t('categoryName')} *</span><input required value={v.name} maxLength={60} onChange={e=>setV({...v,name:e.target.value})}/></label><label className="span-2"><span>{t('nameEn')} *</span><input required value={v.nameEn} maxLength={60} onChange={e=>setV({...v,nameEn:e.target.value})}/></label><div className="form-dropdown span-2"><span>{t('kind')}</span><Dropdown label={t('kind')} value={v.kind} disabled={!!category} onChange={kind=>setV({...v,kind})}>
   {catalogGroups.map(group=><option key={group.id} value={group.id}>{t(group.label)}</option>)}
 </Dropdown></div><label><span>{t('color')}</span><input type="color" value={v.color} onChange={e=>setV({...v,color:e.target.value})}/></label><div className="form-dropdown"><span>{t('icon')}</span><Dropdown label={t('icon')} value={v.icon} onChange={icon=>setV({...v,icon})}>
   {categoryIconOptions.map(icon=><option key={icon} value={icon}>{icon}</option>)}
 </Dropdown></div><div className="category-preview span-2"><CategoryIcon category={v}/><strong>{v.name||t('categoryName')}</strong><small>{v.nameEn}</small></div></div></div>{saveError&&<p className="form-error place-form-error" role="alert">{t(saveError)}</p>}<div className="modal-footer"><button className="button secondary" type="button" onClick={onClose}>{t('cancel')}</button><button className="button primary" disabled={busy}>{t(busy?'saving':'save')}</button></div></form></Modal>;
}
function PlacePreview({place,category,t,lang,onClose,onEdit}) {
  return <aside className="admin-place-preview" aria-labelledby="admin-preview-title" onKeyDown={e=>{if(e.key==='Escape')onClose();}}>
    <div className="admin-preview-header">
      <h2 id="admin-preview-title">{t('details')}</h2>
      <button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}><Icon name="x" size={19}/></button>
    </div>
    <CoordinatePicker lat={place.lat} lng={place.lng} readOnly t={t}/>
    <div className="admin-preview-content">
      <span className="preview-category"><CategoryIcon category={category} size={16}/>{lang==='en'?category.nameEn:category.name}</span>
      <h3>{place.name}</h3>
      <Status value={place.status} t={t}/>
      <dl>{[['address',place.address],['phone',place.phone],['owner',place.owner],['hours',place.hours],['waste',place.waste],['description',place.description]].filter(([,value])=>value).map(([key,value])=><div key={key}><dt>{t(key)}</dt><dd>{value}</dd></div>)}</dl>
      <button className="button secondary" type="button" onClick={onEdit}><Icon name="edit" size={16}/>{t('edit')}</button>
    </div>
  </aside>;
}

export default function Admin({data,commit,t,lang,notify,onLogout,email,demo}) {
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
 const [busy,setBusy]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [saveError,setSaveError]=useState('');
 const saving=useRef(false);
 const {places,categories}=data;
 const group=catalogGroups.find(item=>item.id===tab);
 const scope=group?.id ?? (groupFilter==='all'?'map':groupFilter);
 const preview=places.find(place=>place.id===previewId);
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
     .sort((a,b)=>(rank.get(a.category)??0)-(rank.get(b.category)??0)||a.name.localeCompare(b.name,lang));
 },[places,categories,query,category,status,scope,lang]);
 const pages=Math.max(1,Math.ceil(filtered.length/7));
 const current=Math.min(page,pages);
 const visible=filtered.slice((current-1)*7,current*7);
 const recent=[...places].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,5);
 const title=tab==='overview'?'overview':tab==='categories'?'manageCategories':group?.label??'managePlaces';

 function clearFilters(){
   setQuery('');setGroupFilter('all');setCategory('all');setStatus('all');setPage(1);
 }
 function navigate(next){
   setTab(next);setPreviewId(null);clearFilters();
   if(window.scrollY>0)window.scrollTo({top:0,behavior:'instant'});
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
   return apply({...data,places:next},()=>{setEdit(null);notify(t('saved'));});
 }
 function saveCategory(item){
   const existing=categories.find(category=>category.id===item.id);
   if(recordChanged(editCategory.category,existing))return;
   const next=existing?categories.map(category=>category.id===item.id?item:category):[...categories,item];
   return apply({...data,categories:next},()=>{setEditCategory(null);notify(t('saved'));});
 }
 function remove(){
   const collection=deleting.type==='category'?'categories':'places';
   const records=data[collection];
   if(recordChanged(deleting.record,records.find(item=>item.id===deleting.record.id)))return;
   if(collection==='categories'&&places.some(place=>place.category===deleting.record.id)){
     setSaveError('categoryInUse');return;
   }
   return apply({...data,[collection]:records.filter(item=>item.id!==deleting.record.id)},()=>{
     setDeleting(null);notify(t(collection==='categories'?'categoryDeleted':'deleted'));
   });
 }
 function add(){
   if(group&&!groupHasCategories(group.id)){notify(t('noCategory'));return;}
   setEdit({initialKind:group?.id});
 }
 function groupHasCategories(id){return categories.some(category=>category.kind===id);}
 async function exportData(){
   if(exporting)return;
   setExporting(true);
   try {
     const {exportCatalog}=await import('../lib/exportCatalog.js');
     await exportCatalog(data,t,lang);
     notify(t('exported'));
   } catch {notify(t('excelError'));}
   finally {setExporting(false);}
 }
 const nav=[{id:'overview',label:'overview',icon:'dashboard'},{id:'places',label:'places',icon:'pin'},...catalogGroups,{id:'categories',label:'categories',icon:'tags'}];
 const states=['active','clean','warning','overloaded','inactive'];
 const stateCounts=states.map(id=>({id,count:places.filter(place=>place.status===id).length}));

 return <div className="admin-layout">
   <aside className="admin-sidebar">
     <div className="admin-sidebar-label">{t('workspace')}</div>
     <nav aria-label={t('workspace')}>{nav.map(item=><button key={item.id} data-section={item.id}
       className={tab===item.id?'active':''} aria-current={tab===item.id?'page':undefined} onClick={()=>navigate(item.id)}>
       <Icon name={item.icon}/><span>{t(item.label)}</span>{item.id==='green'&&alerts.length>0&&<b>{alerts.length}</b>}
     </button>)}</nav>
     <div className="admin-sidebar-bottom">
       <div className="admin-profile"><span>AD</span><div><strong>SafeMap Admin</strong><small>{email||(demo?'admin@safemap.vn':'')}</small></div></div>
       <button className="text-button" onClick={onLogout}><Icon name="logout" size={16}/>{t('logout')}</button>
     </div>
   </aside>
   <main className="admin-main">
     <div className="admin-heading">
       <div><div className="eyebrow">{t('dataLabel')}</div><h1>{t(title)}</h1>{tab==='overview'&&<p>{t('adminSubtitle')}</p>}</div>
       <div className="admin-heading-actions">
         <button className="button secondary" onClick={exportData} disabled={exporting}><Icon name="download" size={16}/>{t(exporting?'exportingExcel':'exportExcel')}</button>
         {tab!=='categories'&&<button className="button primary" onClick={add}><Icon name="plus" size={16}/>{t('add')}</button>}
       </div>
     </div>
     <div className="admin-content" key={tab}>
       {tab==='overview'?<>
         <nav className="overview-switch" aria-label={t('overview')}>{[['summary','overviewSummary'],['activity','overviewActivity'],['traffic','overviewTraffic']].map(([id,label])=>
           <button type="button" key={id} aria-pressed={overview===id} onClick={()=>setOverview(id)}>{t(label)}</button>
         )}</nav>
         <div className="overview-view" key={overview}>
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
                 <CategoryIcon category={getCategory(categories,place.category)}/><div><strong>{place.name}</strong><p>{place.address}</p><Status value={place.status} t={t}/></div>
                 <button className="icon-button" aria-label={`${t('edit')} ${place.name}`} onClick={()=>setEdit({place})}><Icon name="edit" size={16}/></button>
               </div>):<div className="empty-state"><Icon name="check"/><p>{t('noAlerts')}</p></div>}
             </section>
             <section className="panel recent-panel">
               <div className="panel-heading"><h2>{t('recent')}</h2><button className="text-button" onClick={()=>navigate('places')}>{t('viewAll')}</button></div>
               <div className="recent-places">{recent.map(place=><button key={place.id} onClick={()=>{navigate('places');setPreviewId(place.id);}}>
                 <strong>{place.name}</strong><small>{String(place.updatedAt||'').slice(0,10)}</small>
               </button>)}</div>
             </section>
           </div>:<section className="panel traffic-panel">
             <div className="panel-heading"><h2>{t('overviewTraffic')}</h2></div>
             <div className="traffic-content"><p>{t('trafficUnavailable')}</p>
               <a className="button secondary" href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">{t('openFirebase')}</a>
             </div>
           </section>}
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
                   if(count){notify(t('categoryInUse'));return;}setDeleting({type:'category',record:child});
                 }}><Icon name="delete" size={14}/></button></div>
             </article>;
           })}</div>:<div className="empty-state">{t('noCategory')}</div>}
         </section>)}
       </div>:<section className="panel admin-places">
         <div className="panel-heading"><h2>{t(group?.label??'allPlaces')} <span className="count-pill">{filtered.length}</span></h2></div>
         <div className="table-toolbar">
           <div className="search-field"><Icon name="search" size={18}/><input aria-label={t('search')} placeholder={t('search')} value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}}/>
             {query&&<button aria-label={t('clearSearch')} onClick={()=>{setQuery('');setPage(1);}}><Icon name="x" size={14}/></button>}</div>
           {!group&&<Dropdown label={t('kind')} value={groupFilter} onChange={value=>{setGroupFilter(value);setCategory('all');setPage(1);}}>
             <option value="all">{t('allGroups')}</option>{catalogGroups.map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}
           </Dropdown>}
           <Dropdown label={t('category')} value={category} onChange={value=>{setCategory(value);setPage(1);}}>
             <option value="all">{t('allCategories')}</option>{visibleCategories.map(item=><option key={item.id} value={item.id}>{categoryName(item)}</option>)}
           </Dropdown>
           <Dropdown label={t('status')} value={status} onChange={value=>{setStatus(value);setPage(1);}}>
             <option value="all">{t('allStatus')}</option>{(scope==='map'||scope==='green')&&<option value="alerts">{t('alertStatus')}</option>}
             {states.map(item=><option key={item} value={item}>{t(item)}</option>)}
           </Dropdown>
           {(query||groupFilter!=='all'||category!=='all'||status!=='all')&&<button className="text-button" onClick={clearFilters}>{t('clearFilters')}</button>}
         </div>
         <div className="table-scroll"><table><thead><tr><th>{t('name')}</th><th>{t('category')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
           <tbody>{visible.map(place=>{
             const item=getCategory(categories,place.category);
             return <tr key={place.id} className={previewId===place.id?'is-previewed':undefined}
               onClick={event=>{if(!event.target.closest('button'))setPreviewId(place.id);}}>
               <td><div className="table-place"><CategoryIcon category={item} size={17}/><div>
                 <button className="admin-place-name" type="button" aria-expanded={previewId===place.id} onClick={()=>setPreviewId(place.id)}>{place.name}</button>
                 <small>{place.address}</small>{group?.id==='green'&&place.waste&&<small>{place.waste}</small>}
               </div></div></td>
               <td><span className="admin-category-tag" style={{'--category-color':item.color}}>{categoryName(item)}</span>{!group&&<small className="table-group-label">{groupName(item.kind)}</small>}</td>
               <td><Status value={place.status} t={t}/></td>
               <td><div className="table-actions">
                 <button className="icon-button" aria-label={`${t('viewMap')} ${place.name}`} title={t('viewMap')} onClick={()=>setPreviewId(place.id)}><Icon name="map" size={16}/></button>
                 <button className="icon-button" aria-label={`${t('edit')} ${place.name}`} title={t('edit')} onClick={()=>setEdit({place})}><Icon name="edit" size={16}/></button>
                 <button className="icon-button danger-text" aria-label={`${t('delete')} ${place.name}`} title={t('delete')} onClick={()=>setDeleting({type:'place',record:place})}><Icon name="delete" size={16}/></button>
               </div></td>
             </tr>;
           })}</tbody></table>
           {!visible.length&&<div className="empty-state"><Icon name="search" size={30}/><h3>{t('noResults')}</h3></div>}
         </div>
         {visible.length>0&&<div className="pagination"><span>{filtered.length} {t('results')}</span><div>
           <button className="icon-button" disabled={current<=1} aria-label={t('previousPage')} onClick={()=>setPage(current-1)}><Icon name="left" size={16}/></button>
           <span>{t('page')} {current} {t('of')} {pages}</span>
           <button className="icon-button" disabled={current>=pages} aria-label={t('nextPage')} onClick={()=>setPage(current+1)}><Icon name="right" size={16}/></button>
         </div></div>}
       </section>}
     </div>
     <p className="admin-notice"><Icon name="help" size={16}/><span>{t(demo?'adminDemo':'adminFirebase')}</span></p>
   </main>
   {preview&&<PlacePreview place={preview} category={getCategory(categories,preview.category)} t={t} lang={lang}
     onClose={()=>setPreviewId(null)} onEdit={()=>setEdit({place:preview})}/>}
   {edit&&<PlaceForm place={edit.place} initialKind={edit.initialKind} categories={categories} onSave={savePlace}
     onClose={()=>closeDialog(setEdit)} t={t} lang={lang} busy={busy} saveError={saveError} demo={demo}/>}
   {editCategory&&<CategoryForm category={editCategory.category} initialKind={editCategory.initialKind} onSave={saveCategory}
     onClose={()=>closeDialog(setEditCategory)} t={t} busy={busy} saveError={saveError}/>}
   {deleting&&<Modal title={t(deleting.type==='category'?'confirmCategory':'confirmDelete')} onClose={()=>closeDialog(setDeleting)} t={t}>
     <div className="delete-content"><span className="delete-icon"><Icon name="delete" size={25}/></span><strong>{deleting.record.name}</strong><p>{t('deleteHint')}</p></div>
     {saveError&&<p className="form-error place-form-error" role="alert">{t(saveError)}</p>}
     <div className="modal-footer"><button className="button secondary" onClick={()=>closeDialog(setDeleting)} disabled={busy}>{t('cancel')}</button>
       <button className="button danger" onClick={remove} disabled={busy}>{t(busy?'saving':'delete')}</button></div>
   </Modal>}
 </div>;
}
