import { useEffect, useRef, useState } from 'react';
import Icon from './components/Icon';
import Modal from './components/Modal';
import MapWelcome from './components/MapWelcome';
import PublicApp from './components/PublicApp';
import Admin, { Login } from './components/Admin';
import { loadData, saveData } from './lib/domain';
import { messages } from './lib/i18n';
function readSession(){try{return sessionStorage.getItem('safemap-demo-session')==='yes';}catch{return false;}}
function Brand({onClick}) {return <button className="brand" onClick={onClick}><span className="brand-mark"><Icon name="leaf" size={23}/></span><span><strong>SafeMap<span className="brand-separator">/</span><b>An Thượng</b></strong><small>AN TOÀN · TIỆN ÍCH · MÔI TRƯỜNG</small></span></button>;}
export default function App(){
 const [welcomePhase,setWelcomePhase]=useState('open');
 const [initial]=useState(()=>{try{return loadData(window.localStorage);}catch{return loadData({getItem(){throw Error();}});}}),[data,setData]=useState(initial.data),[lang,setLang]=useState('vi'),[mode,setMode]=useState('public'),[session,setSession]=useState(readSession),[scope,setScope]=useState('map'),[selected,setSelected]=useState(null),[position,setPosition]=useState(null),[locating,setLocating]=useState(false),[sos,setSos]=useState(false),[toast,setToast]=useState('');
 const timer=useRef(null),mounted=useRef(true),gpsPending=useRef(null);const t=key=>messages[lang][key]||key;
 function notify(message){setToast(message);clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),5500);}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(timer.current);};},[]);
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 useEffect(()=>{if(initial.error)notify(t('loadError'));else if(initial.migrated)notify(t('migrated'));},[]);
 function commit(next){try{saveData(window.localStorage,next);setData(next);return true;}catch{notify(t('storageError'));return false;}}
 function login(){setSession(true);try{sessionStorage.setItem('safemap-demo-session','yes');}catch{}setMode('admin');}
 function logout(){setSession(false);try{sessionStorage.removeItem('safemap-demo-session');}catch{}setMode('public');}
 function locate(manual=true,recenter=manual){
   if(gpsPending.current)return gpsPending.current;
   if(!navigator.geolocation){if(manual)notify(t('gpsUnavailable'));return Promise.resolve(null);}
   setLocating(true);
   if(manual)notify(t('loadingGps'));
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
       if(manual)notify(t('gpsError'));
     }
     resolve(null);
   },{enableHighAccuracy:true,timeout:15000,maximumAge:30000})).finally(()=>{gpsPending.current=null;});
   gpsPending.current=pending;
   return pending;
 }
 useEffect(()=>{
   let disposed=false;
   let permission;
   const sync=()=>{
     if(disposed)return;
     if(permission.state==='granted')locate(false);
     else setPosition(null);
   };
   navigator.permissions?.query({name:'geolocation'}).then(status=>{
     if(disposed)return;
     permission=status;
     permission.addEventListener?.('change',sync);
     sync();
   }).catch(()=>{});
   return ()=>{disposed=true;permission?.removeEventListener?.('change',sync);};
 },[]);
 return <><header className={`site-header ${mode==='public'?'map-mode-header':''}`}><Brand onClick={()=>setMode('public')}/><span className="header-location">Đà Nẵng, Việt Nam<span className="header-location-dot"/></span><div className="header-controls"><div className="view-switch"><button className={mode==='public'?'active':''} onClick={()=>setMode('public')}><span>{t('community')}</span></button><button className={mode==='admin'?'active':''} aria-label={t('admin')} onClick={()=>setMode('admin')}><Icon className="mobile-admin-icon" name="dashboard" size={20}/><span>{t('admin')}</span></button></div>{mode==='admin'&&session&&<button className="icon-button header-logout" aria-label={t('logout')} title={t('logout')} onClick={logout}><Icon name="logout" size={17}/></button>}<span className="header-divider"/><label className="language-control"><Icon name="globe" size={15}/><select value={lang} aria-label="Language / Ngôn ngữ" onChange={e=>setLang(e.target.value)}><option value="vi">VI</option><option value="en">EN</option></select></label></div></header>{mode==='public'?<PublicApp welcomePhase={welcomePhase} data={data} scope={scope} setScope={setScope} selected={selected} setSelected={setSelected} t={t} lang={lang} position={position} onLocate={()=>locate()} onRouteLocate={()=>locate(false)} locating={locating} onSos={()=>setSos(true)}/>:session?<Admin data={data} commit={commit} t={t} lang={lang} notify={notify} onLogout={logout} onViewMap={id=>{setScope('map');setSelected(id);setMode('public');}}/>:<Login onLogin={login} onBack={()=>setMode('public')} t={t}/>} {mode==='public'&&welcomePhase!=='closed'&&<MapWelcome t={t} onReveal={()=>setWelcomePhase('revealing')} onEnter={()=>setWelcomePhase('closed')}/>} {sos&&<Modal title={t('emergency')} onClose={()=>setSos(false)} t={t}><div className="sos-content"><div className="sos-intro"><span><Icon name="phone" size={25}/></span><p>{t('sosNote')}</p></div>{[['shield','police','113'],['heart','medical','115'],['fire','fire','114']].map(([icon,key,num])=><a className="emergency-row" href={`tel:${num}`} key={num}><span className="emergency-icon"><Icon name={icon} size={23}/></span><span><strong>{t(key)}</strong><small>{num}</small></span><span className="call-emergency"><Icon name="phone" size={17}/>{t('call')}</span></a>)}</div></Modal>}{toast&&<div className="toast" role="status"><Icon name="help" size={18}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label={t('close')}><Icon name="x" size={15}/></button></div>}</>;
}
