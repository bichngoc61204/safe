import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import MapView from './MapView';
import RouteGuide from './RouteGuide';
import useNavigation from './useNavigation';
import { fetchRoute, routeModes } from '../lib/routing';
import { Status } from './Admin';
import { filterPlaces, getCategory, directionsUrl, haversine, formatDistance, safeImage, phoneHref, isAlert, markerColor } from '../lib/domain';

const scopes=[['map','explore','map'],['safe','safe','shield'],['green','green','recycle'],['partner','partner','leaf']];

function PlaceDetails({place,categories,position,t,lang,onClose,routing,onLocate,locating}) {
  const c=getCategory(categories,place.category);
  const [failed,setFailed]=useState(false);
  const routeOpen=routing.open;
  const [mode,setMode]=useState(routeModes[0]);
  const startPoint=routing.origin||position;
  const image=safeImage(place.image);
  const phone=String(place.phone||'').replace(/[^+\d]/g,'');
  return <div className="place-details">
    <button className="text-button detail-back" onClick={onClose}><Icon name="back" size={16}/>{t('nearby')}</button>
    {image&&!failed&&<img className="detail-image" src={image} alt={place.name} onError={()=>setFailed(true)}/>}
    <div className="detail-content">
      <div className="detail-category"><span className="detail-category-icon" style={{color:markerColor(c),background:markerColor(c)+'13'}}><Icon name={c.icon} size={18}/></span>{lang==='en'?c.nameEn:c.name}</div>
      <h2>{place.name}</h2>
      <p className="detail-address">{place.address}</p>
      <div className="detail-status"><Status value={place.status} t={t}/><span>{position?formatDistance(haversine(position,place)):t('gpsHint')}</span></div>
      <div className="detail-buttons route-entry">
        <button className="button primary" aria-expanded={routeOpen} onClick={routing.toggle}><Icon name="navigation" size={16}/>{t('routeOnMap')}</button>
        <a className="button secondary" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">Google Maps<Icon name="arrow" size={15}/></a>
        {phone&&<a className="button secondary" href={phoneHref(phone)}><Icon name="phone" size={16}/>{t('call')}</a>}
      </div>
      {routeOpen&&<div className="route-options">
        {routing.state&&<p className="route-summary" role="status">{t(`route_${routing.state}`)}</p>}
        <label>{t('routeMode')} <select value={mode} onChange={e=>setMode(e.target.value)}>{routeModes.map(id=><option key={id} value={id}>{t(`route_${id}`)}</option>)}</select></label>
        <p><strong>{t('routeOriginLabel')}</strong> · {t(routing.origin?'routeOriginPin':position?'routeOriginGps':'routeOriginMissing')}</p>
        <div className="route-actions">
          <button className="text-button" onClick={routing.pick}>{t(routing.origin?'routeChangeOrigin':'routePickOrigin')}</button>
          {routing.origin&&position&&<button className="text-button" onClick={routing.useGps}>{t('routeOriginGps')}</button>}
        </div>
        <div className="route-actions">
          {startPoint
            ? <button className="button primary" disabled={routing.state==='loading'} onClick={()=>routing.start(startPoint,mode)}>{t('routeCalculate')}</button>
            : <button className="button secondary" disabled={locating} onClick={onLocate}>{t(locating?'loadingGps':'routeEnableGps')}</button>}
          {routing.state&&<button className="text-button" onClick={routing.clear}>{t('routeClear')}</button>}
        </div>
      </div>}
      <dl className="detail-info">{[['phone',place.phone||t('noPhone')],['owner',place.owner],['waste',place.waste],['hours',place.hours],['description',place.description]].filter(([,v])=>v).map(([key,value])=><div key={key}><dt>{t(key)}</dt><dd>{value}</dd></div>)}</dl>
      <details className="detail-metadata"><summary>{t('dataDetails')}<Icon name="down" size={14}/></summary><dl><div><dt>{t('coordinates')}</dt><dd>{place.lat.toFixed(6)}, {place.lng.toFixed(6)}</dd></div><div><dt>{t('source')}</dt><dd>{place.source||t('demo')}</dd></div></dl></details>
      <p className="detail-demo">{t('demoNote')}</p>
    </div>
  </div>;
}

export default function PublicApp({data,scope,setScope,selected,setSelected,t,lang,position,onLocate,locating,onSos}) {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('all');
  const [status,setStatus]=useState('all');
  const [expanded,setExpanded]=useState(Boolean(selected));
  const [searchOpen,setSearchOpen]=useState(false);
  const [previewed,setPreviewed]=useState(null);
  const touchStart=useRef(null);
  const [origin,setOrigin]=useState(null);
  const [picking,setPicking]=useState(null);
  const [request,setRequest]=useState(null);
  const [routeEditor,setRouteEditor]=useState(null);
  const [routeResult,setRouteResult]=useState(null);
  const lastRouteRequest=useRef(0);
  const visible=useMemo(()=>filterPlaces(data.places,data.categories,{query,category,scope,status,position}),[data,query,category,scope,status,position]);
  const place=visible.find(p=>p.id===selected);
  const activeRequest=request&&place?.id===request.destination.id?request:null;
  const result=activeRequest&&routeResult?.request===activeRequest?routeResult:null;
  const navigation=useNavigation(result?.route,activeRequest?.destination,activeRequest?.mode);
  const pickingOrigin=Boolean(place&&picking===place.id);
  useEffect(()=>{
    if(!activeRequest)return;
    const controller=new AbortController();
    const timer=setTimeout(async ()=>{
      lastRouteRequest.current=Date.now();
      try {
        const route=await fetchRoute(activeRequest.origin,activeRequest.destination,activeRequest.mode,controller.signal);
        if(!controller.signal.aborted){
          setRouteResult({request:activeRequest,route,state:route?'ready':'empty'});
          if(route){setExpanded(false);setRouteEditor(null);setSearchOpen(false);}
        }
      } catch {
        if(!controller.signal.aborted)setRouteResult({request:activeRequest,state:'error'});
      } finally {
        clearTimeout(deadline);
      }
    },Math.max(0,1100-(Date.now()-lastRouteRequest.current)));
    const deadline=setTimeout(()=>{
      controller.abort();
      setRouteResult({request:activeRequest,state:'error'});
    },15000);
    return ()=>{clearTimeout(timer);clearTimeout(deadline);controller.abort();};
  },[activeRequest]);
  const exitRoute=()=>{
    navigation.stop();
    setRequest(null);
    setOrigin(null);
    setPicking(null);
    setRouteEditor(null);
    setExpanded(true);
  };
  const routing={
    origin,
    open:Boolean(place&&routeEditor===place.id&&!result?.route),
    toggle:()=>{
      if(result?.route){
        navigation.stop();
        setRequest(null);
        setExpanded(true);
        setRouteEditor(place.id);
      }else setRouteEditor(id=>id===place.id?null:place.id);
    },
    state:activeRequest&&!result?.route?(result?.state||'loading'):null,
    start:(point,mode)=>setRequest({origin:point,destination:place,mode}),
    clear:()=>setRequest(null),
    useGps:()=>{setOrigin(null);setRequest(null);},
    pick:()=>{setPicking(place.id);setExpanded(false);}
  };
  const chooseOrigin=point=>{setOrigin(point);setPicking(null);setRequest(null);setExpanded(true);};
  const scopeCats=data.categories.filter(c=>scope==='map'||c.kind===scope);
  const clear=()=>{setQuery('');setCategory('all');setStatus('all');setSelected(null);};
  const changeScope=next=>{clear();setScope(next);};
  const showResults=()=>{setSearchOpen(false);setExpanded(true);};
  const toggleSearch=()=>{setSearchOpen(!searchOpen);setExpanded(false);};
  const selectPlace=id=>{
    if(id!==selected){
      navigation.stop();
      setRequest(null);
      setRouteEditor(null);
      setOrigin(null);
    }
    setPicking(null);
    setSearchOpen(false);
    setPreviewed(null);
    setSelected(id);
    setExpanded(true);
  };
  const hasFilters=Boolean(query.trim())||category!=='all'||status!=='all'||scope!=='map';
  return <main className="public-app">
    <div className={`map-workspace ${expanded?'sheet-expanded':''} ${place?'has-detail':''}`}>
      <div className="mobile-map-actions">
        <button className={`map-tool ${hasFilters?'has-filters':''}`} aria-label={t('search')} aria-expanded={searchOpen} aria-controls="map-search-panel" onClick={toggleSearch}><Icon name={searchOpen?'x':'search'} size={21}/></button>
        <button className="map-tool" aria-label={t('nearby')} aria-expanded={expanded} aria-controls="public-sheet-content" onClick={()=>{setSearchOpen(false);setSelected(null);setExpanded(searchOpen||!expanded||Boolean(place));}}><Icon name="list" size={21}/></button>
      </div>
      <section className={`explore-panel ${searchOpen?'is-open':''}`} id="map-search-panel" aria-label={t('search')}>
        <div className="public-intro"><div><span className="eyebrow">{t('localGuide')}</span><h1>{scope==='map'?<>{t('explore')}{' '}<span className="title-accent">An Thượng<span>.</span></span></>:t(scope==='safe'?'safeTitle':scope==='green'?'greenTitle':'partnerTitle')}</h1><p>{t('subtitle')}</p></div><span className="intro-art" aria-hidden="true"><Icon name="leaf" size={108} strokeWidth={0.8}/></span></div>
        <nav className="public-tabs" aria-label={t('modules')} style={{'--scope-index':scopes.findIndex(([id])=>id===scope)}}>{scopes.map(([id,label,icon])=><button key={id} className={scope===id?'active':''} aria-pressed={scope===id} onClick={()=>changeScope(id)}><Icon name={icon} size={15}/><span>{t(label)}</span></button>)}</nav>
        <div className="public-toolbar">
          <div className="search-field"><Icon name="search" size={18}/><input placeholder={t('search')} aria-label={t('search')} value={query} onKeyDown={e=>{if(e.key==='Enter'&&searchOpen)showResults();}} onChange={e=>{setQuery(e.target.value);setSelected(null);}}/>{query&&<button onClick={()=>{setQuery('');setSelected(null);}} aria-label={t('clearFilters')}><Icon name="x" size={15}/></button>}</div>
          <div className="filter-row" id="public-filters"><label className="filter-select"><select aria-label={t('category')} value={category} onChange={e=>{setCategory(e.target.value);setSelected(null);}}><option value="all">{t('allCategories')}</option>{scopeCats.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}</select></label>{scope==='green'?<select className="public-status" aria-label={t('status')} value={status} onChange={e=>{setStatus(e.target.value);setSelected(null);}}><option value="all">{t('allStatus')}</option><option value="alerts">{t('alertStatus')}</option>{['clean','warning','overloaded','inactive'].map(s=><option key={s} value={s}>{t(s)}</option>)}</select>:<span className="filter-result">{visible.length} {t('results')}</span>}</div>
        </div>
        <button className="button primary mobile-search-results" onClick={showResults}>{t('viewAll')} · {visible.length} {t('results')}</button>
      </section>
      <aside className="places-sidebar">
        <div className="sheet-header" onTouchStart={e=>{touchStart.current=e.touches[0].clientY;}} onTouchEnd={e=>{const start=touchStart.current;touchStart.current=null;if(start!==null){const delta=e.changedTouches[0].clientY-start;if(Math.abs(delta)>45)setExpanded(delta<0);}}}>
          <button className="sheet-handle" aria-expanded={expanded} aria-controls="public-sheet-content" onClick={()=>setExpanded(open=>!open)}>
            <span className="sheet-grip" aria-hidden="true"/>
            <span className="sheet-summary"><Icon name={place?'pin':'list'} size={18}/><strong>{place?place.name:t('nearby')}</strong>{!place&&<span className="sheet-count">{visible.length}</span>}<Icon className="sheet-chevron" name="down" size={18}/></span>
          </button>
          <div className="list-heading"><h2>{place?t('details'):t('nearby')}{!place&&<span>{visible.length}</span>}</h2>{!place&&<span>{position?t('nearest'):t('defaultSort')}</span>}</div>
        </div>
        <div className="public-sheet-content" id="public-sheet-content">{place?<PlaceDetails key={place.id} place={place} categories={data.categories} position={position} t={t} lang={lang} routing={routing} onLocate={onLocate} locating={locating} onClose={()=>{setRequest(null);setPicking(null);setSelected(null);}}/>:<div className="places-list" key={`${scope}-${category}-${status}`}>{visible.length?visible.map(p=>{const c=getCategory(data.categories,p.category);return <button className={`place-card ${p.status==='inactive'?'is-inactive':''} ${previewed===p.id?'is-previewed':''}`} key={p.id}
          onPointerEnter={event=>{if(event.pointerType==='mouse')setPreviewed(p.id);}}
          onPointerLeave={()=>setPreviewed(id=>id===p.id?null:id)}
          onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setPreviewed(p.id);}}
          onBlur={()=>setPreviewed(id=>id===p.id?null:id)}
          onClick={()=>selectPlace(p.id)}>
          <span className={`place-category-icon category-${c.kind}`} style={{'--category-color':markerColor(c)}}><Icon name={c.icon} size={21}/></span>
          <div className="place-card-content"><span className="place-type" style={{color:markerColor(c)}}>{lang==='en'?c.nameEn:c.name}</span><h3>{p.name}</h3><p>{p.address}</p>{isAlert(p)?<span className={`place-alert alert-${p.status}`}>{t(p.status)}</span>:p.status==='inactive'?<span className="place-alert">{t('inactive')}</span>:null}</div>
          <span className="card-distance">{position?formatDistance(haversine(position,p)):<Icon name="right" size={16}/>}</span>
        </button>}):<div className="empty-state"><h3>{t('empty')}</h3><p>{t('emptyHint')}</p><button className="text-button" onClick={clear}>{t('clearFilters')}</button></div>}</div>}
        </div><div className="list-footer"><span className="live-dot"/>{t('demo')}<span>{t('area')}</span></div>
      </aside>
      <MapView navigation={navigation} routeGuide={result?.route&&<RouteGuide key={activeRequest.mode+':'+lastRouteRequest.current} route={navigation.route} navigation={navigation} mode={activeRequest.mode} destination={place.name} onExit={exitRoute} t={t}/>} route={navigation.route} routeMode={activeRequest?.mode} routeOrigin={origin} pickingOrigin={pickingOrigin} onPickOrigin={chooseOrigin} onCancelOrigin={()=>{setPicking(null);setExpanded(true);}} places={visible} categories={data.categories} selected={selected} previewed={place?null:previewed} onPreview={setPreviewed} onSelect={selectPlace} position={position} lang={lang} t={t} onLocate={onLocate} locating={locating} onSos={onSos}/>
    </div>
  </main>;
}
