import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { placeHourRows } from '../lib/placeHours';
import MapView from './MapView';
import PlaceGallery from './PlaceGallery';
import { CENTER } from '../lib/mapCenter';
import RouteGuide from './RouteGuide';
import useNavigation from './useNavigation';
import { fetchRoute, routeModes } from '../lib/routing';
import { Status } from './Admin';
import { filterPlaces, getCategory, directionsUrl, haversine, formatDistance, safeImage, placePhotoUrls, phoneHref, isDemoPhone, isAlert, markerColor } from '../lib/domain';

const scopes=[['map','explore','map'],['safe','safe','shield'],['green','green','recycle'],['partner','partner','leaf']];
const areaCenter={lat:CENTER[0],lng:CENTER[1]};
const greenStatuses=['all','alerts','clean','warning','overloaded','inactive'];

const PlaceCards=memo(function PlaceCards({places,categories,selected,previewed,position,t,lang,actions,listRef}) {
  return <div className="places-list" ref={listRef}>{places.length?places.map(p=>{
    const c=getCategory(categories,p.category);
    const color=markerColor(c);
    const image=safeImage(p.image);
    const preview=()=>actions.current.preview(p.id);
    const leave=()=>actions.current.leave(p.id);
    return <button className={`place-card ${p.status==='inactive'?'is-inactive':''} ${previewed===p.id?'is-previewed':''}`}
      style={{'--place-accent':color}} aria-pressed={p.id===selected} key={p.id}
      onPointerEnter={event=>{if(event.pointerType==='mouse')preview();}} onPointerLeave={leave}
      onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))preview();}} onBlur={leave}
      onClick={()=>actions.current.select(p.id)}>
      <div className="place-card-content">
        <h3>{p.name}</h3>
        <span className="place-type" style={{color}}><Icon name={c.icon} size={13}/><span>{lang==='en'?c.nameEn:c.name}</span></span>
        <p><Icon name="pin" size={13}/><span>{p.address}</span></p>
        {isAlert(p)?<span className={`place-alert alert-${p.status}`}>{t(p.status)}</span>:
          p.status==='inactive'?<span className="place-alert">{t('inactive')}</span>:null}
      </div>
      <span className={`place-category-icon place-thumbnail category-${c.kind}`} style={{'--category-color':color}}>
        <Icon name={c.icon} size={21}/>
        {image&&<img key={image} src={image} alt="" loading="lazy" decoding="async" onError={e=>{e.currentTarget.hidden=true;}}/>}
      </span>
      <span className="card-distance">{position?formatDistance(haversine(position,p)):<Icon name="right" size={16}/>}</span>
    </button>;
  }):<div className="empty-state"><h3>{t('empty')}</h3><p>{t('emptyHint')}</p>
    <button className="text-button" onClick={()=>actions.current.clear()}>{t('clearFilters')}</button>
  </div>}</div>;
});

function PlaceDetails({place,categories,position,t,lang,onClose,routing}) {
  const c=getCategory(categories,place.category);
  const images=placePhotoUrls(place);
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
          {phone&&!demoPhone&&<a className="button secondary" href={phoneHref(phone)}><Icon name="phone" size={16}/>{t('call')}</a>}
        </dd></div>
        {[['owner',place.owner],['waste',place.waste],...placeHourRows(place),['description',place.description]].filter(([,value])=>value).map(([key,value])=><div key={key}><dt>{t(key)}</dt><dd>{value}</dd></div>)}
      </dl>
      <details className="detail-metadata"><summary>{t('dataDetails')}<Icon name="down" size={14}/></summary><dl><div><dt>{t('coordinates')}</dt><dd>{place.lat.toFixed(6)}, {place.lng.toFixed(6)}</dd></div>{place.source&&<div><dt>{t('source')}</dt><dd>{place.source}</dd></div>}</dl></details>
      {place.source==='Dữ liệu minh họa'&&<p className="detail-demo">{t('demoNote')}</p>}
    </div>
  </section>;
}

export default function PublicApp({mapStyle,setMapStyle,welcomePhase,data,scope,setScope,selected,setSelected,t,lang,position,onLocate,onRouteLocate,locating,onSos}) {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('all');
  const [status,setStatus]=useState('all');
  const [expanded,setExpanded]=useState(Boolean(selected));
  const [searchOpen,setSearchOpen]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [hoverScope,setHoverScope]=useState(null);
  const [previewScope,setPreviewScope]=useState(null);
  const [previewed,setPreviewed]=useState(null);
  const [focusRevision,setFocusRevision]=useState(0);
  const placesList=useRef(null);
  const placeCardActions=useRef(null);
  const scopeCopy=useRef(null);
  const collapseControl=useRef(null);
  const expandControl=useRef(null);
  const previousListView=useRef({scope,expanded});
  const searchToggle=useRef(null);
  const listToggle=useRef(null);
  useLayoutEffect(()=>{
    if(placesList.current)placesList.current.scrollTop=0;
  },[scope,query,category,status]);
  useLayoutEffect(()=>{
    const previous=previousListView.current;
    previousListView.current={scope,expanded};
    const scopeChanged=previous.scope!==scope;
    const mobileListOpened=expanded&&!previous.expanded&&!selected&&window.matchMedia?.('(max-width: 700px)').matches;
    if((!scopeChanged&&!mobileListOpened)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const direction=scopeChanged&&scopes.findIndex(([id])=>id===scope)>scopes.findIndex(([id])=>id===previous.scope)?1:-1;
    const cards=Array.from(placesList.current?.querySelectorAll('.place-card')??[]).slice(0,8);
    const elements=scopeChanged?[scopeCopy.current,...cards]:cards;
    const animations=elements.map((element,index)=>element?.animate?.([
      {opacity:.48,transform:`translateX(${direction*13}px)`},
      {opacity:1,transform:'translateX(0)'},
    ],{duration:365,delay:Math.min(index*45,235),easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'}));
    return ()=>animations.forEach(animation=>animation?.cancel());
  },[scope,expanded,selected]);
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
  const groupPreviews=useMemo(()=>scopes.map(([id,label,icon])=>({
    id,label,icon,
    places:filterPlaces(data.places,data.categories,{scope:id}),
    categories:data.categories.filter(category=>category.kind===id),
  })),[data]);
  const hoverPlaces=groupPreviews.find(group=>group.id===hoverScope)?.places??null;
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
  const resetMobileSearch=()=>{clear();setScope('map');};
  const changeScope=next=>{
    if(next===scope)return;
    setCategory('all');
    setStatus('all');
    clearSelection();
    setScope(next);
  };
  const showResults=()=>{setSearchOpen(false);setExpanded(true);listToggle.current?.focus({preventScroll:true});};
  const closeSearch=()=>{setSearchOpen(false);searchToggle.current?.focus({preventScroll:true});};
  const toggleSearch=()=>{
    if(searchOpen){closeSearch();return;}
    setSearchOpen(true);
    setExpanded(false);
  };
  const toggleSidebar=()=>{
    const focusTarget=sidebarCollapsed?collapseControl:expandControl;
    setHoverScope(null);
    setSidebarCollapsed(!sidebarCollapsed);
    requestAnimationFrame(()=>focusTarget.current?.focus({preventScroll:true}));
  };
  const selectPlace=id=>{
    if(!visible.some(point=>point.id===id)){
      const point=data.places.find(point=>point.id===id);
      if(!point)return;
      setScope(hoverScope==='map'?'map':getCategory(data.categories,point.category).kind);
      setQuery('');
      setCategory('all');
      setStatus('all');
    }
    setHoverScope(null);
    setSidebarCollapsed(false);
    if(id!==selected)cancelRoute();
    setPicking(null);
    setSearchOpen(false);
    setPreviewed(null);
    setSelected(id);
    setFocusRevision(revision=>revision+1);
    setExpanded(true);
  };
  const closeDetails=clearSelection;
  placeCardActions.current={
    select:selectPlace, preview:setPreviewed, leave:id=>setPreviewed(previous=>previous===id?null:previous), clear,
  };
  const dismissPopup=()=>{
    setSearchOpen(false);
    setExpanded(false);
    listToggle.current?.focus({preventScroll:true});
  };
  const toggleList=()=>{
    if(expanded&&!place){dismissPopup();return;}
    setSearchOpen(false);
    clearSelection();
    setExpanded(true);
  };
  const hasFilters=Boolean(query.trim())||category!=='all'||status!=='all'||scope!=='map';
  const searchPreview=useMemo(()=>{
    if(hasFilters)return visible;
    if(position)return visible.slice(0,4);
    return [...visible].sort((a,b)=>haversine(areaCenter,a)-haversine(areaCenter,b)).slice(0,4);
  },[hasFilters,position,visible]);
  const scopeIndex=scopes.findIndex(([id])=>id===scope);
  const [, scopeLabel, scopeIcon]=scopes[scopeIndex];
  const previewGroup=id=>{
    setPreviewScope(id);
    setHoverScope(id);
  };
  return <main className="public-app" data-welcome={welcomePhase}>
    <div className={`map-workspace ${expanded?'sheet-expanded':''} ${place?'has-detail':''}`}
      data-scope={scope} data-sidebar={sidebarCollapsed?'collapsed':'open'} data-search-open={searchOpen}>
      <div className="mobile-map-actions">
        <button ref={searchToggle} className={`map-tool ${hasFilters?'has-filters':''}`} aria-label={t('search')} aria-expanded={searchOpen} aria-controls="map-search-panel" onClick={toggleSearch}><Icon name={searchOpen?'x':'search'} size={21}/></button>
        <button ref={listToggle} className="map-tool" aria-label={t('nearby')} aria-expanded={expanded} aria-controls="public-sheet-content" onClick={toggleList}><Icon name="list" size={21}/></button>
      </div>
      <div className="public-sidebar-region">
      {sidebarCollapsed&&<div className="sidebar-rail">
        <button ref={expandControl} type="button" aria-controls="desktop-map-sidebar" aria-expanded={false}
          aria-label={t('expandSidebar')} title={t('expandSidebar')} onClick={toggleSidebar}><Icon name="right" size={20}/></button>
        <nav aria-label={t('modules')} onPointerLeave={()=>setHoverScope(null)} onBlur={event=>{
          if(!event.currentTarget.contains(event.relatedTarget))setHoverScope(null);
        }} onKeyDown={event=>{if(event.key==='Escape')setHoverScope(null);}}>
          {scopes.map(([id,label,icon])=><button type="button" key={id}
            aria-label={t(label)} aria-describedby={hoverScope===id?'sidebar-group-preview':undefined}
            aria-pressed={scope===id} data-previewed={hoverScope===id}
            onPointerEnter={event=>{if(event.pointerType==='mouse')previewGroup(id);}}
            onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))previewGroup(id);}}
            onClick={()=>{changeScope(id);toggleSidebar();}}><Icon name={icon} size={21}/></button>)}
        </nav>
      </div>}
      <div className="sidebar-group-preview" id="sidebar-group-preview" data-open={Boolean(hoverScope)}
        data-scope={previewScope} role="tooltip" aria-hidden={!hoverScope}>
        {groupPreviews.map(({id,icon,places,categories})=><div key={id} className="sidebar-preview-panel"
          data-active={previewScope===id} aria-hidden={hoverScope!==id}>
          <div className="sidebar-preview-title"><Icon name={icon} size={22}/><strong>{id==='map'?'SafeMap An Thượng':t(`${id}Title`)}</strong></div>
          <p>{t(id==='map'?'subtitle':`${id}Subtitle`)}</p>
          <ul>{id==='map'?scopes.slice(1).map(([group,label,groupIcon])=><li key={group}><Icon name={groupIcon} size={14}/>{t(label)}</li>):
            categories.map(category=><li key={category.id}><Icon name={category.icon} size={14}/>{lang==='en'?category.nameEn:category.name}</li>)}</ul>
          <small>{places.length} {t('results')}</small>
        </div>)}
      </div>
      <div className="sidebar-drawer" id="desktop-map-sidebar">
      <section className={`explore-panel ${searchOpen?'is-open':''}`} id="map-search-panel" aria-label={t('search')} onKeyDown={e=>{if(e.key==='Escape'&&searchOpen)closeSearch();}}>
        <div className="public-intro">
          <button ref={collapseControl} type="button" className="sidebar-collapse" aria-controls="desktop-map-sidebar"
            aria-label={t('collapseSidebar')} title={t('collapseSidebar')} onClick={toggleSidebar}><Icon name="left" size={17}/></button>
          <div className="scope-copy" ref={scopeCopy}>
            <span className="eyebrow">{t(scope==='map'?'localGuide':scopeLabel)}</span>
            <h1>{scope==='map'?<>{t('explore')} <span className="title-accent">An Thượng.</span></>:t(`${scope}Title`)}</h1>
            <p>{t(scope==='map'?'subtitle':`${scope}Subtitle`)}</p>
          </div>
          <span className="scope-art" aria-hidden="true">
            <svg className="scope-art-trace" viewBox="0 0 124 124"><path d="M12 75H36V33H88V59H118"/><circle cx="12" cy="75" r="3"/><circle cx="118" cy="59" r="3"/></svg>
            <Icon name={scopeIcon} size={30}/>
          </span>
        </div>
        <nav className="public-tabs" aria-label={t('modules')} style={{'--scope-index':scopeIndex}}>{scopes.map(([id,label,icon])=><button key={id} data-group={id} className={scope===id?'active':''} aria-pressed={scope===id} onClick={()=>changeScope(id)}><Icon name={icon} size={15}/><span>{t(label)}</span></button>)}</nav>
        <div className="public-toolbar">
          <div className="search-field"><Icon name="search" size={18}/><input placeholder={t('search')} aria-label={t('search')} value={query} onKeyDown={e=>{if(e.key==='Enter'&&searchOpen&&visible.length)showResults();}} onChange={e=>{setQuery(e.target.value);clearSelection();}}/>{query&&<button type="button" onClick={()=>{setQuery('');clearSelection();}} aria-label={t('clearSearch')}><Icon name="x" size={15}/></button>}</div>
          <div className="public-filters" id="public-filters">
            <div className="public-filter-section">
              <span>{t('category')}</span>
              <div className="category-chips" key={scope} role="group" aria-label={t('category')}>
                <button type="button" aria-pressed={category==='all'} onClick={()=>{setCategory('all');clearSelection();}}>{t('all')}</button>
                {scopeCats.map(c=><button type="button" key={c.id} aria-pressed={category===c.id} style={{'--chip-color':markerColor(c)}} onClick={()=>{setCategory(c.id);clearSelection();}}>
                  <Icon name={c.icon} size={14}/>{lang==='en'?c.nameEn:c.name}
                </button>)}
              </div>
            </div>
            {scope==='green'&&<div className="public-filter-section">
              <span>{t('status')}</span>
              <div className="category-chips status-chips" role="group" aria-label={t('status')}>
                {greenStatuses.map(value=><button type="button" key={value} data-status={value} aria-pressed={status===value}
                  onClick={()=>{setStatus(value);clearSelection();}}>{t(value==='all'?'allStatus':value==='alerts'?'alertStatus':value)}</button>)}
              </div>
            </div>}
          </div>
        </div>
        <div className="mobile-search-footer">
          <div className="mobile-search-summary">
            <p className="mobile-search-caption" role="status">
              {!searchPreview.length?t('empty'):hasFilters?`${visible.length} ${t('results')}`:t(position?'nearby':'nearAreaCenter')}
              {searchPreview.length>0&&hasFilters&&!position&&<span> · {t('fromAreaCenter')}</span>}
            </p>
            {hasFilters&&<button type="button" className="mobile-clear-filters" onClick={resetMobileSearch}><Icon name="x" size={14}/>{t('clearFilters')}</button>}
          </div>
          {searchPreview.length>0&&<ul className="mobile-search-preview" aria-label={t('nearby')}>
            {searchPreview.map((p,index)=>{
              const c=getCategory(data.categories,p.category);
              const distance=formatDistance(haversine(position||areaCenter,p));
              return <li key={p.id} style={{'--preview-index':Math.min(index,3)}}>
                <button type="button" onClick={()=>selectPlace(p.id)} style={{'--preview-color':markerColor(c)}}>
                  <Icon name={c.icon} size={17}/><span><strong>{p.name}</strong><small>{p.address}</small></span>
                  <span className="search-preview-trailing"><span className="search-preview-distance">{distance}</span><Icon name="right" size={13}/></span>
                </button>
              </li>;
            })}
          </ul>}
          <button className="button primary mobile-search-results" onClick={showResults} disabled={!visible.length}>{t('showAllPlaces')}<Icon name="right" size={16}/></button>
        </div>
      </section>
      <aside className="places-sidebar" onKeyDown={event=>{
        if(expanded&&event.key==='Escape'&&!event.defaultPrevented&&!event.target.closest('dialog')&&listToggle.current?.offsetWidth)dismissPopup();
      }}>
        <div className="sheet-header">
          {place?<div className="sheet-detail-header">
            <span className="sheet-grip" aria-hidden="true"/>
            <div className="sheet-detail-bar">
              <button type="button" aria-label={t('nearby')} onClick={closeDetails}><Icon name="back" size={18}/></button>
              <h2>{place.name}</h2>
              <button type="button" aria-label={t('close')} aria-expanded={expanded} aria-controls="public-sheet-content" onClick={dismissPopup}><Icon name="x" size={18}/></button>
            </div>
          </div>:<button className="sheet-handle" aria-label={t('close')} aria-expanded={expanded} aria-controls="public-sheet-content" onClick={dismissPopup}>
            <span className="sheet-grip" aria-hidden="true"/>
            <span className="sheet-summary"><Icon name="list" size={18}/><strong>{t('nearby')}</strong><span className="sheet-count">{visible.length}</span><Icon className="sheet-chevron" name="x" size={18}/></span>
          </button>}
          <div className="list-heading"><h2>{t('nearby')}<span>{visible.length}</span></h2>{position&&<span>{t('nearest')}</span>}</div>
        </div>
        <div className="public-sheet-content" id="public-sheet-content">
          {place&&<PlaceDetails key={place.id} place={place} categories={data.categories} position={position} t={t} lang={lang} routing={routing} onClose={closeDetails}/>}
          <PlaceCards places={visible} categories={data.categories} selected={selected} previewed={previewed}
            position={position} t={t} lang={lang} actions={placeCardActions} listRef={placesList}/>
        </div><div className="list-footer"><span className="live-dot"/>{t('community')}<span>{t('area')}</span></div>
      </aside>
      </div>
      </div>
      <MapView style={mapStyle} setStyle={setMapStyle} welcomePhase={welcomePhase} focusRevision={focusRevision} navigation={navigation}
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
        route={navigation.route} routeMode={activeRequest?.mode} routeOrigin={activeRequest?origin:null} pickingOrigin={pickingOrigin} onPickOrigin={chooseOrigin} onCancelOrigin={exitRoute} places={hoverScope?data.places:visible} hoverPlaces={hoverPlaces} categories={data.categories} selected={selected} previewed={place?null:previewed} onPreview={setPreviewed} onSelect={selectPlace} position={position} lang={lang} t={t} onLocate={onLocate} locating={locating} onSos={onSos}/>
    </div>
  </main>;
}
