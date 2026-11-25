import { useEffect, useRef, useState } from 'react';
import Icon from './components/Icon';
import {BrandIdentity} from './components/BrandLogo';
import LanguageSwitch from './components/LanguageSwitch';
import Modal from './components/Modal';
import MapWelcome from './components/MapWelcome';
import PublicApp from './components/PublicApp';
import Admin, { Login } from './components/Admin';
import { useFirebaseBackend } from './components/useFirebaseBackend';
import { messages } from './lib/i18n';
const linkedPlace=()=>new URLSearchParams(window.location.search).get('place');
const isAdminPath = () => /^\/admin(?:\/|\.html)?$/.test(window.location.pathname);
const emptyCatalog = { places: [], categories: [] };
const catalogMessages = {
 loading: 'catalogLoading', missing: 'catalogMissing', error: 'catalogError', config: 'catalogConfig',
};
const languageKey='safemap-language';
function savedLanguage() {
 try { return localStorage.getItem(languageKey)==='en'?'en':'vi'; }
 catch { return 'vi'; }
}
function Brand({onClick,t}) {return <button type="button" className="brand" onClick={onClick}><BrandIdentity t={t}/></button>;}
export default function App(){
 const [welcomePhase,setWelcomePhase]=useState(()=>linkedPlace()?'closed':'open');
 const [mapStyle,setMapStyle]=useState('light');
 const firebase = useFirebaseBackend();
 const [lang,setLang]=useState(savedLanguage),[mode,setMode]=useState(()=>isAdminPath()?'admin':'public'),[scope,setScope]=useState('map'),[selected,setSelected]=useState(linkedPlace),[position,setPosition]=useState(null),[locating,setLocating]=useState(false),[sos,setSos]=useState(false),[toast,setToast]=useState('');
 function openMap(){
   if(isAdminPath())window.history.pushState(null,'','/');
   setWelcomePhase('closed');
   setMode('public');
 }
 useEffect(()=>{
   const sync=()=>{setMode(isAdminPath()?'admin':'public');setSelected(linkedPlace());};
   window.addEventListener('popstate',sync);
   return ()=>window.removeEventListener('popstate',sync);
 },[]);
 useEffect(() => {
   if (mode === 'public' && import.meta.env?.PROD) {
     firebase.backend?.enableTraffic().catch(() => {});
   }
 }, [firebase.backend, mode]);
 const data = firebase.catalog?.data ?? emptyCatalog;
 const session = firebase.editor.status === 'editor';
 const adminCatalog=firebase.management||firebase.catalog;
 const adminData=adminCatalog?.data||emptyCatalog;
 const catalogNotice = catalogMessages[firebase.catalogStatus] || (firebase.catalog?.cached ? 'catalogCached' : '');
 const uiLang=mode==='admin'?'vi':lang;
 useEffect(()=>{
   const robots=document.querySelector('meta[name="robots"]');
   if(robots)robots.content=mode==='admin'?'noindex, nofollow':'index, follow, max-image-preview:large';
   document.title=mode==='admin'?'Quản trị | SafeMap An Thượng':'SafeMap An Thượng | Bản đồ an toàn và hỗ trợ cộng đồng Đà Nẵng';
   // The built admin entry has no public metadata. Restore its public canonical
   // when returning to the map without a full page load.
   if(mode==='public'&&!document.querySelector('link[rel="canonical"]')){
     const canonical=document.createElement('link');canonical.rel='canonical';
     canonical.href='https://www.safemap-anthuong.com/';document.head.append(canonical);
   }
 },[mode]);
 const timer=useRef(null),mounted=useRef(true),gpsPending=useRef(null);const t=key=>messages[uiLang][key]||key;
 function notify(message){setToast(message);clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),5500);}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(timer.current);};},[]);
 useEffect(()=>{
   document.documentElement.lang=uiLang;
   try { localStorage.setItem(languageKey,lang); } catch { /* Private browsing may block storage. */ }
 },[lang,uiLang]);
 async function commit(next) {
   if(firebase.backend?.observeManagement&&!['ready','legacy'].includes(firebase.managementStatus))throw new Error(firebase.managementStatus==='rules'?'rulesNeeded':'catalogUnavailable');
   if (!session || firebase.catalogStatus !== 'ready' || adminCatalog?.cached) throw new Error('catalogUnavailable');
   try {
     await firebase.save(next, adminCatalog.revision);
   } catch (error) {
     const message = ['catalogConflict', 'catalogInvalid', 'catalogLimit', 'supportLevelRequired'].includes(error.message)
       ? error.message : error.code==='permission-denied'?'rulesNeeded':'catalogSaveError';
     throw new Error(message);
   }
 }
 useEffect(()=>{
   if(mode==='public'&&selected&&firebase.catalogStatus==='ready'&&!data.places.some(place=>place.id===selected)){
     setSelected(null);notify('placeUnavailable');
   }
 },[selected,data,mode,firebase.catalogStatus]);
 async function logout() {
   try { await firebase.backend.logout(); }
   catch { notify('logoutError'); }
 }
 function locate(manual=true,recenter=manual){
   if(gpsPending.current)return gpsPending.current;
   if(!navigator.geolocation){if(manual)notify('gpsUnavailable');return Promise.resolve(null);}
   setLocating(true);
   if(manual)notify('loadingGps');
   const pending=new Promise(resolve=>navigator.geolocation.getCurrentPosition(({coords,timestamp})=>{
     const point={lat:coords.latitude,lng:coords.longitude,recenter,measuredAt:timestamp??Date.now()};
     if(mounted.current){
       setPosition(point);
       setLocating(false);
       if(manual)setToast('');
     }
     resolve(point);
   },error=>{
     if(mounted.current){
       setLocating(false);
       if(error.code===1)setPosition(null);
       if(manual)notify('gpsError');
     }
     resolve(null);
   },{enableHighAccuracy:true,timeout:15000,maximumAge:30000})).finally(()=>{gpsPending.current=null;});
   gpsPending.current=pending;
   return pending;
 }
 useEffect(()=>{
   if(mode!=='public')return;
   let disposed=false;
   let permission;
   // Request on entry even when the browser has not asked for permission yet.
   // This also works on browsers without the Permissions API.
   locate(false);
   const sync=()=>{
     if(disposed)return;
     if(permission.state==='granted')locate(false);
     else setPosition(null);
   };
   navigator.permissions?.query?.({name:'geolocation'})?.then(status=>{
     if(disposed)return;
     permission=status;
     permission.addEventListener?.('change',sync);
   }).catch(()=>{});
   return ()=>{disposed=true;permission?.removeEventListener?.('change',sync);};
 },[mode]);
 return <><header className={`site-header ${mode==='public'?'map-mode-header':'admin-mode-header'}`}>
   <Brand onClick={openMap} t={t}/>
   <span className="header-location">{t('headerLocation')}<span className="header-location-dot"/></span>
   <div className="header-controls">
     {mode==='admin'&&<a className="admin-map-link" aria-label={t('community')} href="/" onClick={event=>{
       if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
       event.preventDefault();openMap();
     }}><Icon name="map" size={17}/><span>{t('community')}</span></a>}
     {mode==='admin'&&session&&<button className="icon-button header-logout" aria-label={t('logout')} title={t('logout')} onClick={logout}><Icon name="logout" size={17}/></button>}
     {mode==='public'&&<LanguageSwitch lang={lang} onChange={setLang} t={t}/>}
     {mode==='public'&&<button type="button" className="map-theme-toggle" aria-label={t('mapDark')}
       aria-pressed={mapStyle==='dark'} title={t(mapStyle==='dark'?'mapLight':'mapDark')}
       onClick={()=>setMapStyle(style=>style==='dark'?'light':'dark')}>
       <Icon key={mapStyle==='dark'?'dark':'light'} name={mapStyle==='dark'?'moon':'sun'} size={17}/>
     </button>}
   </div>
 </header>{mode==='public'?<PublicApp mapStyle={mapStyle} setMapStyle={setMapStyle} welcomePhase={welcomePhase} data={data} scope={scope} setScope={setScope} selected={selected} setSelected={setSelected} t={t} lang={lang} position={position} onLocate={()=>locate()} onRouteLocate={()=>locate(false)} locating={locating} onSos={()=>setSos(true)} backend={firebase.backend}/>:session && firebase.catalog && (!firebase.backend?.observeManagement||['ready','legacy','rules'].includes(firebase.managementStatus)) ? <Admin data={adminData} currentRevision={adminCatalog?.revision} backend={firebase.backend} managementStatus={firebase.managementStatus} commit={commit} t={t} lang={uiLang} notify={notify} onLogout={logout} email={firebase.editor.email} editor={firebase.editor} getIdToken={firebase.backend?.getIdToken}/>
 : session || firebase.editor.status==='checking' ? <main className="admin-main"><p role="status">{t(session?catalogNotice:'editorChecking')}</p></main>
 : <Login onLogin={firebase.backend?.login} onBack={openMap} t={t} available={Boolean(firebase.backend)} editorStatus={firebase.editor.status}/>} {mode==='public'&&welcomePhase!=='closed'&&<MapWelcome t={t} lang={lang} onLanguageChange={setLang} onReveal={()=>setWelcomePhase('revealing')} onEnter={()=>setWelcomePhase('closed')}/>} {sos&&<Modal title={t('emergency')} onClose={()=>setSos(false)} t={t}><div className="sos-content"><div className="sos-intro"><span><Icon name="phone" size={25}/></span><p>{t('sosNote')}</p></div>{[['shield','police','113'],['heart','medical','115'],['fire','fire','114']].map(([icon,key,num])=><a className="emergency-row" href={`tel:${num}`} key={num}><span className="emergency-icon"><Icon name={icon} size={23}/></span><span><strong>{t(key)}</strong><small>{num}</small></span><span className="call-emergency"><Icon name="phone" size={17}/>{t('call')}</span></a>)}</div></Modal>}{catalogNotice && !toast && <div className="toast" role="status"><Icon name="info" size={18}/><span>{t(catalogNotice)}</span>{firebase.catalogStatus==='error'&&<button type="button" onClick={firebase.retry} aria-label={t('routeRetry')}>{t('routeRetry')}</button>}</div>}{toast&&<div className="toast" role="status"><Icon name="help" size={18}/><span>{t(toast)}</span><button onClick={()=>setToast('')} aria-label={t('close')}><Icon name="x" size={15}/></button></div>}</>;
}
