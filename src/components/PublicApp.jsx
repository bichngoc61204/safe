import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import MapView from './MapView';
import PlaceGallery from './PlaceGallery';
import { demoPlacePhotos } from '../lib/data';
import RouteGuide from './RouteGuide';
import useNavigation from './useNavigation';
import { fetchRoute, routeModes } from '../lib/routing';
import { Status } from './Admin';
import { filterPlaces, getCategory, directionsUrl, haversine, formatDistance, safeImage, phoneHref, isDemoPhone, isAlert, markerColor } from '../lib/domain';

const scopes=[['map','explore','map'],['safe','safe','shield'],['green','green','recycle'],['partner','partner','leaf']];

function PlaceDetails({place,categories,position,t,lang,onClose,routing}) {
  const c=getCategory(categories,place.category);
  const [demoCall,setDemoCall]=useState(false);
  const image=safeImage(place.image);
  const demoPhotos=demoPlacePhotos[place.id];
  const images=image===demoPhotos?.[0].src?demoPhotos:image?[{src:image}]:[];
  const phone=String(place.phone||'').replace(/[^+\d]/g,'');
  const demoPhone=isDemoPhone(place.phone);
  return <section className="place-details" aria-label={t('details')}>
    <div className="detail-panel-header">
      <span>{t('details')}</span>
      <button className="icon-button detail-panel-close" onClick={onClose} aria-label={t('close')}><Icon name="x" size={19}/></button>
    </div>
    <PlaceGallery images={images} name={place.name} t={t}/>
    <div className="detail-content">
      <div className="detail-category"><span className="detail-category-icon" style={{color:markerColor(c),background:markerColor(c)+'13'}}><Icon name={c.icon} size={18}/></span>{lang==='en'?c.nameEn:c.name}</div>
      <h2>{place.name}</h2>
      <p className="detail-address">{place.address}</p>
      <div className="detail-status"><Status value={place.status} t={t}/><span>{position?formatDistance(haversine(position,place)):t('gpsHint')}</span></div>
      <div className="detail-buttons route-entry">
        <button className="button primary" onClick={routing.start}><Icon name="navigation" size={16}/>{t('routeOnMap')}</button>
        <a className="button secondary" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">Google Maps<Icon name="arrow" size={15}/></a>
      </div>
      <dl className="detail-info">
        <div><dt>{t('phone')}</dt><dd className="detail-phone">
          <span>{place.phone||t('noPhone')}{demoPhone&&<small>{t('demoPhone')}</small>}</span>
          {phone&&(demoPhone
            ? <button type="button" className="button secondary" onClick={()=>setDemoCall(true)}><Icon name="phone" size={16}/>{t('call')}</button>
            : <a className="button secondary" href={phoneHref(phone)}><Icon name="phone" size={16}/>{t('call')}</a>)}
          {demoCall&&<span className="demo-call-status" role="status">{t('demoCall')}</span>}
        </dd></div>
        {[['owner',place.owner],['waste',place.waste],['hours',place.hours],['description',place.description]].filter(([,value])=>value).map(([key,value])=><div key={key}><dt>{t(key)}</dt><dd>{value}</dd></div>)}
      </dl>
      <details className="detail-metadata"><summary>{t('dataDetails')}<Icon name="down" size={14}/></summary><dl><div><dt>{t('coordinates')}</dt><dd>{place.lat.toFixed(6)}, {place.lng.toFixed(6)}</dd></div><div><dt>{t('source')}</dt><dd>{place.source||t('demo')}</dd></div></dl></details>
      <p className="detail-demo">{t('demoNote')}</p>
    </div>
  </section>;
}

export default function PublicApp({welcomePhase,data,scope,setScope,selected,setSelected,t,lang,position,onLocate,onRouteLocate,locating,onSos}) {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('all');
  const [status,setStatus]=useState('all');
  const [expanded,setExpanded]=useState(Boolean(selected));
  const [searchOpen,setSearchOpen]=useState(false);
  const [previewed,setPreviewed]=useState(null);
  const touchStart=useRef(null);
  const placesList=useRef(null);
  const searchInput=useRef(null);
  const searchToggle=useRef(null);
  const listToggle=useRef(null);
  useEffect(()=>{
    if(placesList.current)placesList.current.scrollTop=0;
  },[scope,query,category,status]);
  useEffect(()=>{
    if(searchOpen)searchInput.current?.focus({preventScroll:true});
  },[searchOpen]);
  const [origin,setOrigin]=useState(null);
  const [picking,setPicking]=useState(null);
  const [request,setRequest]=useState(null);
  const [pendingGps,setPendingGps]=useState(null);
  const gpsIntent=useRef(null);
  const destinationRef=useRef(null);
  useEffect(()=>()=>{gpsIntent.current=null;},[]);
  const [routeResult,setRouteResult]=useState(null);
  const lastRouteRequest=useRef(0);
  const visible=useMemo(()=>filterPlaces(data.places,data.categories,{query,category,scope,status,position}),[data,query,category,scope,status,position]);
  const place=visible.find(p=>p.id===selected);
  destinationRef.current=place?.id;
  const activeRequest=request&&place?.id===request.destination.id?request:null;
  const result=activeRequest&&routeResult?.request===activeRequest?routeResult:null;
  const navigation=useNavigation(result?.route,activeRequest?.destination,activeRequest?.mode);
  const pickingOrigin=Boolean(place&&picking?.id===place.id);
  useEffect(()=>{
    if(!activeRequest)return;
    const controller=new AbortController();
    const timer=setTimeout(async ()=>{
      lastRouteRequest.current=Date.now();
      try {
        const route=await fetchRoute(activeRequest.origin,activeRequest.destination,activeRequest.mode,controller.signal);
        if(!controller.signal.aborted){
          setRouteResult({request:activeRequest,route,state:route?'ready':'empty'});
          if(route){setExpanded(false);setSearchOpen(false);}
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
  const cancelRoute=()=>{
    gpsIntent.current=null;
    setPendingGps(null);
    navigation.stop();
    setRequest(null);
    setOrigin(null);
    setPicking(null);
  };
  const exitRoute=()=>{cancelRoute();setExpanded(true);};
  const requestRoute=(point,mode)=>{
    setPicking(null);
    setExpanded(false);
    setSearchOpen(false);
    setRequest({origin:point,destination:place,mode});
  };
  const pickOrigin=(mode)=>{
    setRequest(null);
    setOrigin(null);
    setPicking({id:place.id,mode});
    setExpanded(false);
    setSearchOpen(false);
  };
  const routing={
    start:async ()=>{
      if(activeRequest&&(!result||result.route)){
        setExpanded(false);
        setSearchOpen(false);
        return;
      }
      if(gpsIntent.current?.id===place.id)return;
      cancelRoute();
      if(position&&Date.now()-position.measuredAt<=30000){requestRoute(position,routeModes[0]);return;}
      const intent={id:place.id};
      gpsIntent.current=intent;
      setPendingGps(intent);
      setExpanded(false);
      setSearchOpen(false);
      const point=await onRouteLocate();
      if(gpsIntent.current!==intent)return;
      gpsIntent.current=null;
      setPendingGps(null);
      if(destinationRef.current!==intent.id)return;
      if(point)requestRoute(point,routeModes[0]);
      else pickOrigin(routeModes[0]);
    }
  };
  const chooseOrigin=point=>{setOrigin(point);requestRoute(point,picking.mode);};
  const routeState=place&&pendingGps?.id===place.id?'loadingGps':activeRequest&&!result?.route?'route_'+(result?.state||'loading'):null;
  const scopeCats=data.categories.filter(c=>scope==='map'||c.kind===scope);
  const clearSelection=()=>{cancelRoute();setSelected(null);};
  const clear=()=>{setQuery('');setCategory('all');setStatus('all');clearSelection();};
  const changeScope=next=>{if(next!==scope){clear();setScope(next);}};
  const showResults=()=>{setSearchOpen(false);setExpanded(true);listToggle.current?.focus({preventScroll:true});};
  const closeSearch=()=>{setSearchOpen(false);searchToggle.current?.focus({preventScroll:true});};
  const toggleSearch=()=>{
    if(searchOpen){closeSearch();return;}
    setSearchOpen(true);
    setExpanded(false);
  };
  const selectPlace=id=>{
    if(id!==selected)cancelRoute();
    setPicking(null);
    setSearchOpen(false);
    setPreviewed(null);
    setSelected(id);
    setExpanded(true);
  };
  const closeDetails=clearSelection;
  const hasFilters=Boolean(query.trim())||category!=='all'||status!=='all'||scope!=='map';
  const scopeIndex=scopes.findIndex(([id])=>id===scope);
  const [, scopeLabel, scopeIcon]=scopes[scopeIndex];
  return <main className="public-app">
    <div className={`map-workspace ${expanded?'sheet-expanded':''} ${place?'has-detail':''}`} data-scope={scope}>
      <div className="mobile-map-actions">
        <button ref={searchToggle} className={`map-tool ${hasFilters?'has-filters':''}`} aria-label={t('search')} aria-expanded={searchOpen} aria-controls="map-search-panel" onClick={toggleSearch}><Icon name={searchOpen?'x':'search'} size={21}/></button>
        <button ref={listToggle} className="map-tool" aria-label={t('nearby')} aria-expanded={expanded} aria-controls="public-sheet-content" onClick={()=>{setSearchOpen(false);clearSelection();setExpanded(searchOpen||!expanded||Boolean(place));}}><Icon name="list" size={21}/></button>
      </div>
      <section className={`explore-panel ${searchOpen?'is-open':''}`} id="map-search-panel" aria-label={t('search')} onKeyDown={e=>{if(e.key==='Escape'&&searchOpen)closeSearch();}}>
        <div className="public-intro">
          <div className="scope-copy">
            <span className="eyebrow">{t(scope==='map'?'localGuide':scopeLabel)}</span>
            <h1>{scope==='map'?<>{t('explore')} <span className="title-accent">An Thượng.</span></>:t(`${scope}Title`)}</h1>
            <p>{t(scope==='map'?'subtitle':`${scope}Subtitle`)}</p>
          </div>
          <span className="scope-art" aria-hidden="true">
            <svg className="scope-art-trace" viewBox="0 0 124 124"><path d="M12 75H36V33H88V59H118"/><circle cx="12" cy="75" r="3"/><circle cx="118" cy="59" r="3"/></svg>
            <Icon name={scopeIcon} size={30}/>
          </span>
        </div>
        <nav className="public-tabs" aria-label={t('modules')} style={{'--scope-index':scopeIndex}}>{scopes.map(([id,label,icon])=><button key={id} className={scope===id?'active':''} aria-pressed={scope===id} onClick={()=>changeScope(id)}><Icon name={icon} size={15}/><span>{t(label)}</span></button>)}</nav>
        <div className="public-toolbar">
          <div className="search-field"><Icon name="search" size={18}/><input ref={searchInput} placeholder={t('search')} aria-label={t('search')} value={query} onKeyDown={e=>{if(e.key==='Enter'&&searchOpen&&visible.length)showResults();}} onChange={e=>{setQuery(e.target.value);clearSelection();}}/>{query&&<button onClick={()=>{setQuery('');clearSelection();}} aria-label={t('clearFilters')}><Icon name="x" size={15}/></button>}</div>
          <div className="filter-row" id="public-filters"><label className="filter-select"><select aria-label={t('category')} value={category} onChange={e=>{setCategory(e.target.value);clearSelection();}}><option value="all">{t('allCategories')}</option>{scopeCats.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}</select></label>{scope==='green'?<select className="public-status" aria-label={t('status')} value={status} onChange={e=>{setStatus(e.target.value);clearSelection();}}><option value="all">{t('allStatus')}</option><option value="alerts">{t('alertStatus')}</option>{['clean','warning','overloaded','inactive'].map(s=><option key={s} value={s}>{t(s)}</option>)}</select>:null}</div>
        </div>
        {visible.length
          ? <button className="button primary mobile-search-results" onClick={showResults}>{t('viewResults')} · {visible.length} {t('results')}</button>
          : <div className="mobile-search-empty"><span role="status">{t('empty')}</span>{hasFilters&&<button className="text-button" onClick={clear}>{t('clearFilters')}</button>}</div>}
      </section>
      <aside className="places-sidebar">
        <div className="sheet-header" onTouchStart={e=>{touchStart.current=e.touches[0].clientY;}} onTouchEnd={e=>{const start=touchStart.current;touchStart.current=null;if(start!==null){const delta=e.changedTouches[0].clientY-start;if(Math.abs(delta)>45)setExpanded(delta<0);}}}>
          {place?<div className="sheet-detail-header">
            <span className="sheet-grip" aria-hidden="true"/>
            <div className="sheet-detail-bar">
              <button type="button" aria-label={t('nearby')} onClick={closeDetails}><Icon name="back" size={18}/></button>
              <h2><Icon name="pin" size={15}/><span>{place.name}</span></h2>
              <button type="button" aria-label={t('close')} aria-expanded={expanded} aria-controls="public-sheet-content" onClick={()=>setExpanded(false)}><Icon name="down" size={18}/></button>
            </div>
          </div>:<button className="sheet-handle" aria-expanded={expanded} aria-controls="public-sheet-content" onClick={()=>setExpanded(open=>!open)}>
            <span className="sheet-grip" aria-hidden="true"/>
            <span className="sheet-summary"><Icon name="list" size={18}/><strong>{t('nearby')}</strong><span className="sheet-count">{visible.length}</span><Icon className="sheet-chevron" name="down" size={18}/></span>
          </button>}
          <div className="list-heading"><h2>{t('nearby')}<span>{visible.length}</span></h2>{position&&<span>{t('nearest')}</span>}</div>
        </div>
        <div className="public-sheet-content" id="public-sheet-content">{place&&<PlaceDetails key={place.id} place={place} categories={data.categories} position={position} t={t} lang={lang} routing={routing} onClose={closeDetails}/>}<div className="places-list" ref={placesList}>{visible.length?visible.map(p=>{const c=getCategory(data.categories,p.category);const image=safeImage(p.image);return <button className={`place-card ${p.status==='inactive'?'is-inactive':''} ${previewed===p.id?'is-previewed':''}`} aria-pressed={p.id===selected} key={p.id}
          onPointerEnter={event=>{if(event.pointerType==='mouse')setPreviewed(p.id);}}
          onPointerLeave={()=>setPreviewed(id=>id===p.id?null:id)}
          onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setPreviewed(p.id);}}
          onBlur={()=>setPreviewed(id=>id===p.id?null:id)}
          onClick={()=>selectPlace(p.id)}>
          <div className="place-card-content">
            <h3>{p.name}</h3>
            <span className="place-type" style={{color:markerColor(c)}}><Icon name={c.icon} size={13}/>{lang==='en'?c.nameEn:c.name}</span>
            <p><Icon name="pin" size={13}/><span>{p.address}</span></p>
            {isAlert(p)?<span className={`place-alert alert-${p.status}`}>{t(p.status)}</span>:p.status==='inactive'?<span className="place-alert">{t('inactive')}</span>:null}
          </div>
          <span className={`place-category-icon place-thumbnail category-${c.kind}`} style={{'--category-color':markerColor(c)}}>
            <Icon name={c.icon} size={21}/>
            {image&&<img src={image} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/>}
          </span>
          <span className="card-distance">{position?formatDistance(haversine(position,p)):<Icon name="right" size={16}/>}</span>
        </button>}):<div className="empty-state"><h3>{t('empty')}</h3><p>{t('emptyHint')}</p><button className="text-button" onClick={clear}>{t('clearFilters')}</button></div>}</div>
        </div><div className="list-footer"><span className="live-dot"/>{t('demo')}<span>{t('area')}</span></div>
      </aside>
      <MapView welcomePhase={welcomePhase} navigation={navigation}
        routeGuide={result?.route
          ? <RouteGuide key={activeRequest.mode+':'+lastRouteRequest.current} route={navigation.route} navigation={navigation} mode={activeRequest.mode} destination={place.name} onExit={exitRoute} onModeChange={mode=>requestRoute(activeRequest.origin,mode)} t={t}/>
          : routeState&&<section className="route-guide route-request-status">
              <div className="route-guide-heading"><span role="status">{t(routeState)}</span><button className="route-exit" onClick={exitRoute} aria-label={t('routeExit')}><Icon name="x" size={16}/></button></div>
              {result&&<div className="route-navigation-actions">
                <button className="button secondary" onClick={()=>requestRoute(activeRequest.origin,activeRequest.mode)}>{t('routeRetry')}</button>
                <button className="text-button" onClick={()=>pickOrigin(activeRequest.mode)}>{t('routePickOrigin')}</button>
                <a className="button secondary" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">Google Maps<Icon name="arrow" size={14}/></a>
              </div>}
            </section>}
        route={navigation.route} routeMode={activeRequest?.mode} routeOrigin={activeRequest?origin:null} pickingOrigin={pickingOrigin} onPickOrigin={chooseOrigin} onCancelOrigin={exitRoute} places={visible} categories={data.categories} selected={selected} previewed={place?null:previewed} onPreview={setPreviewed} onSelect={selectPlace} position={position} lang={lang} t={t} onLocate={onLocate} locating={locating} onSos={onSos}/>
    </div>
  </main>;
}
