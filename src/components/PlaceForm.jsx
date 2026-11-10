import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import Dropdown from './Dropdown';
import { isClockTime, readPlaceHours } from '../lib/placeHours';
import { catalogGroups } from '../lib/catalogGroups';
import { CoordinatePicker } from './MapView';
import { CENTER } from '../lib/mapCenter';
import { getCategory, safeImage, statuses } from '../lib/domain';
import { translatedPlaceFields } from '../lib/locale';
const maxExtraImages=5;

function placeValues(place,categories,initialKind) {
  return {
    name:'', category:categories.find(c=>!initialKind||c.kind===initialKind)?.id||categories[0]?.id,
    address:'', phone:'', owner:'', lat:CENTER[0], lng:CENTER[1], waste:'',
    status:initialKind==='green'?'clean':'active', description:'', source:'',
    ...place, image:safeImage(place?.image), ...readPlaceHours(place),
  };
}

function placeGallery(place) {
  const urls=Array.isArray(place?.images)?place.images.map(safeImage).filter(Boolean):[];
  return [...new Set(urls)].filter(url=>url!==place?.image).map((url,index)=>({id:`saved-${index}`,url}));
}

export function usePlaceEditor({place,categories,initialKind,onSave,t,lang,busy,saveError,active=true}) {
  const [values,setValues]=useState(()=>placeValues(place,categories,initialKind));
  const [gallery,setGallery]=useState(()=>placeGallery(place));
  const nextImageId=useRef(0);
  const [error,setError]=useState('');
  const [previews,setPreviews]=useState({main:'',others:{}});
  const [preview,setPreview]=useState(null);
  useEffect(()=>{
    if(!active)return;
    const timer=setTimeout(()=>{
      const main=safeImage(String(values.image||'').trim());
      const others=Object.fromEntries(gallery.map(({id,url})=>[id,safeImage(url.trim())]));
      setPreviews({main,others});
    },420);
    return ()=>clearTimeout(timer);
  },[active,values.image,gallery]);
  function reset(){
    setValues(placeValues(place,categories,initialKind));
    setGallery(placeGallery(place));
    setError('');
  }
  const set=(key,value)=>{
    setError('');
    setValues(v=>({...v,[key]:value}));
  };
  function addImage(){
    if(gallery.length>=maxExtraImages)return;
    const id=nextImageId.current++;
    setGallery(items=>[...items,{id,url:''}]);
    setError('');
  }
  const mainUrl=String(values.image??'').trim();
  const imageUrls=gallery.map(item=>item.url.trim());
  const imageIssues=imageUrls.map((url,index)=>{
    if(!url)return '';
    if(!safeImage(url))return 'invalidImageUrl';
    return url===mainUrl||imageUrls.indexOf(url)!==index?'duplicateGalleryImage':'';
  });
  const kind=getCategory(categories,values.category)?.kind;
  const field=(key,options={})=><label className={options.full?'span-2':undefined}>
    <span>{options.icon&&<Icon name={options.icon} size={13}/>}<span>{t(options.label||key)}</span>{options.required&&<em>*</em>}</span>
    {options.textarea?<textarea name={key} lang={options.lang} value={values[key]||''} onChange={e=>set(key,e.target.value)} maxLength={1000} rows={options.rows||3}/>:
      <input name={key} lang={options.lang} value={values[key]??''} onChange={e=>set(key,e.target.value)} type={options.type||'text'}
        required={options.required} maxLength={options.maxLength} pattern={options.pattern} placeholder={options.placeholder}/>}
  </label>;
  const phoneField=icon=>field('phone',{icon,type:'tel',pattern:'[+0-9 \\(\\)\\-]{0,25}',maxLength:25});
  function submit(e){
    e.preventDefault();
    if(busy)return;
    const form=e.currentTarget;
    const name=values.name.trim();
    const address=values.address.trim();
    const opensAt=form.elements.namedItem('opensAt').value;
    const closesAt=form.elements.namedItem('closesAt').value;
    const image=safeImage(mainUrl);
    const images=imageUrls.filter(Boolean);
    function showError(message,control){
      setError(message);
      if(!control)return;
      const details=control.closest('details');
      if(details)details.open=true;
      control.focus();
    }
    if(!name||!address){showError('required',form.elements.namedItem(!name?'name':'address'));return;}
    if(mainUrl&&!image){showError('invalidImageUrl',form.elements.namedItem('image'));return;}
    if((opensAt||closesAt)&&(!isClockTime(opensAt)||!isClockTime(closesAt)||opensAt===closesAt)){
      showError('hoursInvalid',form.elements.namedItem(!opensAt?'opensAt':'closesAt'));
      return;
    }
    if(images.length>maxExtraImages||imageIssues.some(Boolean)){
      showError('invalidGallery',form.querySelector('.extra-image-row [aria-invalid="true"]'));
      return;
    }
    const p={...values,name,address,opensAt,closesAt,lat:Number(values.lat),lng:Number(values.lng),id:place?.id||crypto.randomUUID(),image,images,updatedAt:new Date().toISOString()};
    for(const key of Object.keys(translatedPlaceFields)){
      const field=`${key}En`;
      const translation=values[field]?.trim();
      if(translation)p[field]=translation;
      else delete p[field];
    }
    if(!['green','partner'].includes(kind)){p.waste='';delete p.wasteEn;}
    if(kind!=='green'&&['clean','warning','overloaded'].includes(p.status))p.status='active';
    onSave(p);
  }
  const groupField=<div className="form-dropdown"><span>{t('kind')}</span><Dropdown label={t('kind')} value={kind} onChange={group=>{
      const next=categories.find(category=>category.kind===group);
      if(next){setError('');setValues(v=>({...v,category:next.id,status:v.status==='inactive'?v.status:group==='green'?'clean':'active'}));}
    }}>{catalogGroups.map(group=><option key={group.id} value={group.id} disabled={!categories.some(category=>category.kind===group.id)}>{t(group.label)}</option>)}</Dropdown></div>;
  const categoryField=<div className="form-dropdown"><span>{t('category')} <em>*</em></span><Dropdown label={t('category')} value={values.category} onChange={value=>set('category',value)}>
      {categories.filter(category=>category.kind===kind).map(category=><option key={category.id} value={category.id}>{lang==='en'?category.nameEn:category.name}</option>)}
    </Dropdown></div>;
  const timeField=(key,icon)=><label key={key}><span>{icon&&<Icon name={icon} size={13}/>}<span>{t(key)}</span></span>
        <input type="time" name={key} value={values[key]} aria-invalid={error==='hoursInvalid'} onInput={event=>set(key,event.currentTarget.value)} onChange={event=>set(key,event.currentTarget.value)}/>
      </label>;
  const hoursHint=values.opensAt&&values.closesAt&&values.closesAt<values.opensAt&&
    <p className="field-hint">{t('hoursNextDay')}</p>;
  const statusField=<div className="form-dropdown"><span>{t('status')}</span><Dropdown label={t('status')} value={values.status} onChange={value=>set('status',value)}>
      {statuses.filter(s=>kind==='green'||['active','inactive'].includes(s)).map(s=><option key={s} value={s}>{t(s)}</option>)}
    </Dropdown></div>;
  const coordinateFields=[['lat','latitude',90],['lng','longitude',180]].map(([key,label,max])=>
    <label key={key}><span>{t(label)} <em>*</em></span>
      <input type="number" step="any" min={-max} max={max} required value={values[key]} onChange={e=>set(key,e.target.value)}/>
    </label>);
  const coordinatePicker=<CoordinatePicker lat={Number(values.lat)} lng={Number(values.lng)}
    onChange={coords=>{setError('');setValues(v=>({...v,...coords}));}} t={t} lang={lang}/>;
  const englishFields=<details className="span-2 admin-preview-section admin-preview-metadata">
    <summary><Icon name="globe" size={15}/>{t('englishPlaceDetails')}<Icon name="down" size={14}/></summary>
    <p className="field-hint">{t('englishOptional')}</p>
    <div className="form-grid">
      {Object.entries(translatedPlaceFields).filter(([key])=>key!=='waste'||['green','partner'].includes(kind))
        .map(([key,maxLength])=><div key={key} className="span-2">
          {field(`${key}En`,{label:key,lang:'en',maxLength,textarea:key==='description',rows:2})}
        </div>)}
    </div>
  </details>;
  const imageFields=<fieldset className="span-2 place-image-fields">
      <legend>{t('placeImages')}</legend>
      <div className="main-image-field">
        <button type="button" className="main-image-preview" disabled={!previews.main}
          aria-label={t('previewMainImage')} onClick={()=>setPreview(previews.main)}>
          {previews.main?<PreviewImage key={previews.main} url={previews.main} t={t}/>:<span>{t('noMainImage')}</span>}
        </button>
        <div><label><span>{t('mainImage')}</span><input name="image" value={values.image??''} inputMode="url" aria-invalid={error==='invalidImageUrl'}
          onChange={event=>set('image',event.target.value)} placeholder={t('imageHint')}/></label>
          <small>{t('mainImageHint')}</small></div>
      </div>
      <div className="extra-image-field">
        <div className="extra-image-heading"><strong>{t('galleryUrls')}</strong><span>{gallery.length}/{maxExtraImages}</span></div>
        <p className="field-hint">{t('galleryHint')}</p>
        {gallery.map(({id,url},index)=>{
          const label=`${t('galleryImage')} ${index+1}`;
          const issue=imageIssues[index];
          const thumbnail=previews.others[id]===url.trim()&&!issue?previews.others[id]:'';
          return <div className="extra-image-row" key={id}>
            <button type="button" className="main-image-preview extra-image-preview" disabled={!thumbnail}
              aria-label={`${t('previewImages')} · ${label}`} onClick={()=>setPreview(thumbnail)}>
              {thumbnail?<PreviewImage key={thumbnail} url={thumbnail} t={t}/>:<Icon name="image" size={20}/>}
            </button>
            <label><span>{label}</span>
              <input value={url} inputMode="url" placeholder="https://…" autoFocus={typeof id==='number'}
                aria-invalid={Boolean(issue)}
                onChange={event=>{
                  const value=event.target.value;
                  setGallery(items=>items.map(item=>item.id===id?{...item,url:value}:item));
                  setError('');
                }}/>
              {issue&&<small className="extra-image-error">{t(issue)}</small>}
            </label>
            <button type="button" className="icon-button extra-image-remove" aria-label={`${t('delete')} · ${label}`}
              onClick={()=>{setGallery(items=>items.filter(item=>item.id!==id));setError('');}}><Icon name="delete" size={16}/></button>
          </div>;
        })}
        <button type="button" className="button secondary add-extra-image" disabled={gallery.length>=maxExtraImages}
          onClick={addImage}><Icon name="plus" size={16}/>{t('addGalleryImage')}</button>
      </div>
    </fieldset>;
  return {
    field, phoneField, timeField, hoursHint, groupField, categoryField, statusField, coordinateFields, coordinatePicker, imageFields, englishFields,
    acceptsWaste:['green','partner'].includes(kind), reset, submit,
    errorMessage:(error||saveError)&&<p className="form-error place-form-error" role="alert">{t(error||saveError)}</p>,
    imagePreview:preview&&<Modal title={t('previewImages')} onClose={()=>setPreview(null)} t={t} className="image-link-modal">
      <PreviewImage key={preview} url={preview} t={t}/>
    </Modal>,
  };
}

export default function PlaceForm({categories,initialKind,onSave,onClose,t,lang,busy,saveError}) {
  const editor=usePlaceEditor({categories,initialKind,onSave,t,lang,busy,saveError});
  const {field,timeField}=editor;
  return <>
    <Modal title={t('addTitle')} onClose={onClose} t={t} wide dismissible={!busy}>
      <form onSubmit={editor.submit} aria-busy={busy}>
        <div className="form-scroll">
          <div className="form-section-heading"><Icon name="list" size={16}/>{t('basicInfo')}</div>
          <div className="form-grid">
            {field('name',{required:true,full:true,maxLength:150})}
            {editor.groupField}{editor.categoryField}
            {editor.phoneField()}
            {field('address',{required:true,full:true,maxLength:250})}
            {field('owner',{full:true,maxLength:150})}
            <fieldset className="span-2 hours-fields">
              <legend>{t('hours')}</legend>
              <div>{timeField('opensAt')}{timeField('closesAt')}</div>
              {editor.hoursHint}
              {field('hours',{maxLength:100,placeholder:t('hoursExample'),label:'hoursNotes'})}
            </fieldset>
            {editor.statusField}
            {editor.acceptsWaste&&field('waste',{full:true,maxLength:250})}
          </div>
          <div className="form-section-heading"><Icon name="pin" size={16}/>{t('locationSection')}</div>
          <div className="form-grid">
            {editor.coordinateFields}
            <div className="span-2">{editor.coordinatePicker}</div>
            {editor.imageFields}
            {field('description',{full:true,textarea:true})}
            {field('source',{full:true,maxLength:150})}
            {editor.englishFields}
          </div>
        </div>
        {editor.errorMessage}
        <div className="modal-footer">
          <button className="button secondary" type="button" data-dialog-dismiss disabled={busy}>{t('cancel')}</button>
          <button className="button primary" type="submit" disabled={busy}><Icon name="check" size={16}/>{t(busy?'saving':'save')}</button>
        </div>
      </form>
    </Modal>
    {editor.imagePreview}
  </>;
}


function PreviewImage({url,t}) {
  const [failed,setFailed]=useState(false);
  return failed?<span role="status">{t('previewImageError')}</span>:
    <img src={url} alt={t('previewImages')} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}
