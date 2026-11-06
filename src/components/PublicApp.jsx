import { useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import MapView from './MapView';
import { Status } from './Admin';
import { filterPlaces, getCategory, directionsUrl, osmDirectionsUrl, haversine, formatDistance, safeImage, phoneHref, isAlert, markerColor } from '../lib/domain';

function PlaceDetails({place,categories,position,t,lang,onClose}) {
  const c=getCategory(categories,place.category);
  const [failed,setFailed]=useState(false);
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
      <div className="detail-buttons"><a className="button primary" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer"><Icon name="navigation" size={16}/>{t('directions')}<Icon name="arrow" size={15}/></a>{phone&&<a className="button secondary" href={phoneHref(phone)}><Icon name="phone" size={16}/>{t('call')}</a>}</div>
      <a className="osm-directions" href={osmDirectionsUrl(place,position)} target="_blank" rel="noopener noreferrer">{t('osmDirections')}<Icon name="arrow" size={13}/></a>
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
  const [expanded,setExpanded]=useState(false);
  const [previewed,setPreviewed]=useState(null);
  const touchStart=useRef(null);
  const visible=useMemo(()=>filterPlaces(data.places,data.categories,{query,category,scope,status,position}),[data,query,category,scope,status,position]);
  const place=visible.find(p=>p.id===selected);
  const scopeCats=data.categories.filter(c=>scope==='map'||c.kind===scope);
  const clear=()=>{setQuery('');setCategory('all');setStatus('all');setSelected(null);};
  const changeScope=next=>{clear();setScope(next);};
  return <main className="public-app">
    <div className={`map-workspace ${expanded?'sheet-expanded':''} ${place?'has-detail':''}`}>
      <section className="explore-panel" aria-label={t('search')}>
        <div className="public-intro"><div><span className="eyebrow">{t('localGuide')}</span><h1>{scope==='map'?<>{t('explore')}{' '}<span className="title-accent">An Thượng<span>.</span></span></>:t(scope==='safe'?'safeTitle':scope==='green'?'greenTitle':'partnerTitle')}</h1><p>{t('subtitle')}</p></div><span className="intro-art" aria-hidden="true"><Icon name="leaf" size={108} strokeWidth={0.8}/></span></div>
        <nav className="public-tabs" aria-label={t('modules')}>{[['map','explore','map'],['safe','safe','shield'],['green','green','recycle'],['partner','partner','leaf']].map(([id,label,icon])=><button key={id} className={scope===id?'active':''} aria-pressed={scope===id} onClick={()=>changeScope(id)}><Icon name={icon} size={15}/><span>{t(label)}</span></button>)}</nav>
        <div className="public-toolbar">
          <div className="search-field"><Icon name="search" size={18}/><input placeholder={t('search')} aria-label={t('search')} value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);}}/>{query&&<button onClick={()=>{setQuery('');setSelected(null);}} aria-label={t('clearFilters')}><Icon name="x" size={15}/></button>}</div>
          <div className="filter-row"><label className="filter-select"><select aria-label={t('category')} value={category} onChange={e=>{setCategory(e.target.value);setSelected(null);}}><option value="all">{t('allCategories')}</option>{scopeCats.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}</select></label>{scope==='green'?<select className="public-status" aria-label={t('status')} value={status} onChange={e=>{setStatus(e.target.value);setSelected(null);}}><option value="all">{t('allStatus')}</option><option value="alerts">{t('alertStatus')}</option>{['clean','warning','overloaded','inactive'].map(s=><option key={s} value={s}>{t(s)}</option>)}</select>:<span className="filter-result">{visible.length} {t('results')}</span>}</div>
        </div>
      </section>
      <aside className="places-sidebar">
        <div className="sheet-header" onTouchStart={e=>{touchStart.current=e.touches[0].clientY;}} onTouchEnd={e=>{const delta=e.changedTouches[0].clientY-touchStart.current;if(Math.abs(delta)>45)setExpanded(delta<0);}}>
          <button className="sheet-handle" aria-expanded={expanded} aria-label={t(expanded?'collapse':'expand')} onClick={()=>setExpanded(!expanded)}><span/></button>
          <div className="list-heading"><h2>{place?t('details'):t('nearby')}{!place&&<span>{visible.length}</span>}</h2>{!place&&<span>{position?t('nearest'):t('defaultSort')}</span>}</div>
        </div>
        {place?<PlaceDetails key={place.id} place={place} categories={data.categories} position={position} t={t} lang={lang} onClose={()=>setSelected(null)}/>:<div className="places-list" key={`${scope}-${category}-${status}`}>{visible.length?visible.map(p=>{const c=getCategory(data.categories,p.category);return <button className={`place-card ${p.status==='inactive'?'is-inactive':''} ${previewed===p.id?'is-previewed':''}`} key={p.id}
          onPointerEnter={event=>{if(event.pointerType==='mouse')setPreviewed(p.id);}}
          onPointerLeave={()=>setPreviewed(id=>id===p.id?null:id)}
          onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setPreviewed(p.id);}}
          onBlur={()=>setPreviewed(id=>id===p.id?null:id)}
          onClick={()=>{setPreviewed(null);setSelected(p.id);setExpanded(true);}}>
          <span className={`place-category-icon category-${c.kind}`} style={{'--category-color':markerColor(c)}}><Icon name={c.icon} size={21}/></span>
          <div className="place-card-content"><span className="place-type" style={{color:markerColor(c)}}>{lang==='en'?c.nameEn:c.name}</span><h3>{p.name}</h3><p>{p.address}</p>{isAlert(p)?<span className={`place-alert alert-${p.status}`}>{t(p.status)}</span>:p.status==='inactive'?<span className="place-alert">{t('inactive')}</span>:null}</div>
          <span className="card-distance">{position?formatDistance(haversine(position,p)):<Icon name="right" size={16}/>}</span>
        </button>}):<div className="empty-state"><h3>{t('empty')}</h3><p>{t('emptyHint')}</p><button className="text-button" onClick={clear}>{t('clearFilters')}</button></div>}</div>}
        <div className="list-footer"><span className="live-dot"/>{t('demo')}<span>{t('area')}</span></div>
      </aside>
      <MapView places={visible} categories={data.categories} selected={selected} previewed={place?null:previewed} onPreview={setPreviewed} onSelect={id=>{setPreviewed(null);setSelected(id);setExpanded(true);}} position={position} lang={lang} t={t} onLocate={onLocate} locating={locating} onSos={onSos}/>
    </div>
  </main>;
}
