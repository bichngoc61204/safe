import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import Dropdown from './Dropdown';
import { isClockTime, readPlaceHours } from '../lib/placeHours';
import { catalogGroups } from '../lib/catalogGroups';
import { CoordinatePicker } from './MapView';
import { CENTER } from '../lib/mapCenter';
import { getCategory, safeImage, statuses } from '../lib/domain';
const maxExtraImages=5;

export default function PlaceForm({place,categories,initialKind,onSave,onClose,t,lang,busy,saveError}) {
  const [values,setValues]=useState(()=>({...{name:'',category:categories.find(c=>initialKind?c.kind===initialKind:true)?.id||categories[0].id,address:'',phone:'',owner:'',lat:CENTER[0],lng:CENTER[1],waste:'',status:initialKind==='green'?'clean':'active',hours:'',description:'',image:'',source:''},...place,image:safeImage(place?.image),...readPlaceHours(place)}));
  const [gallery,setGallery]=useState(()=>{
    const urls=Array.isArray(place?.images)?place.images.map(safeImage).filter(Boolean):[];
    return [...new Set(urls)].filter(url=>url!==place?.image).map((url,index)=>({id:`saved-${index}`,url}));
  });
  const nextImageId=useRef(0);
  const [error,setError]=useState('');
  const [previews,setPreviews]=useState({main:'',others:{}});
  const [preview,setPreview]=useState(null);
  useEffect(()=>{
    const timer=setTimeout(()=>{
      const main=safeImage(String(values.image||'').trim());
      const others=Object.fromEntries(gallery.map(({id,url})=>[id,safeImage(url.trim())]));
      setPreviews({main,others});
    },420);
    return ()=>clearTimeout(timer);
  },[values.image,gallery]);
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
  const field=(key,options={})=><label className={options.full?'span-2':''}><span>{t(key)} {options.required&&<em>*</em>}</span>{options.textarea?<textarea value={values[key]||''} onChange={e=>set(key,e.target.value)} maxLength={1000} rows={3}/>:<input value={values[key]??''} onChange={e=>set(key,e.target.value)} type={options.type||'text'} required={options.required} maxLength={options.maxLength} pattern={options.pattern} placeholder={options.placeholder}/>}</label>;
  function submit(e){
    e.preventDefault();
    if(busy)return;
    const name=values.name.trim();
    const address=values.address.trim();
    const opensAt=e.currentTarget.elements.namedItem('opensAt').value;
    const closesAt=e.currentTarget.elements.namedItem('closesAt').value;
    const image=safeImage(mainUrl);
    const images=imageUrls.filter(Boolean);
    if(!name||!address){setError('required');return;}
    if(mainUrl&&!image){setError('invalidImageUrl');return;}
    if((opensAt||closesAt)&&(!isClockTime(opensAt)||!isClockTime(closesAt)||opensAt===closesAt)){
      setError('hoursInvalid');return;
    }
    if(images.length>maxExtraImages||imageIssues.some(Boolean)){setError('invalidGallery');return;}
    const p={...values,name,address,opensAt,closesAt,lat:Number(values.lat),lng:Number(values.lng),id:place?.id||crypto.randomUUID(),image,images,updatedAt:new Date().toISOString()};
    if(!['green','partner'].includes(kind))p.waste='';
    if(kind!=='green'&&['clean','warning','overloaded'].includes(p.status))p.status='active';
    onSave(p);
  }
  return <><Modal title={t(place?'editTitle':'addTitle')} onClose={onClose} t={t} wide><form onSubmit={submit}><div className="form-scroll"><div className="form-section-heading"><Icon name="list" size={16}/>{t('basicInfo')}</div><div className="form-grid">{field('name',{required:true,full:true,maxLength:150})}<div className="form-dropdown"><span>{t('kind')}</span><Dropdown label={t('kind')} value={kind} onChange={group=>{
      const next=categories.find(category=>category.kind===group);
      if(next)setValues(v=>({...v,category:next.id,status:v.status==='inactive'?v.status:group==='green'?'clean':'active'}));
    }}>{catalogGroups.map(group=><option key={group.id} value={group.id} disabled={!categories.some(category=>category.kind===group.id)}>{t(group.label)}</option>)}</Dropdown></div>
    <div className="form-dropdown"><span>{t('category')} <em>*</em></span><Dropdown label={t('category')} value={values.category} onChange={value=>set('category',value)}>
      {categories.filter(category=>category.kind===kind).map(category=><option key={category.id} value={category.id}>{lang==='en'?category.nameEn:category.name}</option>)}
    </Dropdown></div>{field('phone',{type:'tel',pattern:'[+0-9 \\(\\)\\-]{0,25}',maxLength:25})}{field('address',{required:true,full:true,maxLength:250})}{field('owner',{full:true,maxLength:150})}<fieldset className="span-2 hours-fields">
      <legend>{t('hours')}</legend>
      <div>{['opensAt','closesAt'].map(key=><label key={key}><span>{t(key)}</span>
        <input type="time" name={key} value={values[key]} onInput={event=>set(key,event.currentTarget.value)} onChange={event=>set(key,event.currentTarget.value)}/>
      </label>)}</div>
      {values.opensAt&&values.closesAt&&values.closesAt<values.opensAt&&<p className="field-hint">{t('hoursNextDay')}</p>}
      <label><span>{t('hoursNotes')}</span><input value={values.hours} maxLength={100} onChange={event=>set('hours',event.target.value)} placeholder={t('hoursExample')}/></label>
    </fieldset><div className="form-dropdown"><span>{t('status')}</span><Dropdown label={t('status')} value={values.status} onChange={value=>set('status',value)}>
      {statuses.filter(s=>kind==='green'||['active','inactive'].includes(s)).map(s=><option key={s} value={s}>{t(s)}</option>)}
    </Dropdown></div>{['green','partner'].includes(kind)&&field('waste',{full:true,maxLength:250})}</div><div className="form-section-heading"><Icon name="pin" size={16}/>{t('locationSection')}</div><div className="form-grid"><label><span>Latitude <em>*</em></span><input type="number" step="any" min="-90" max="90" required value={values.lat} onChange={e=>set('lat',e.target.value)}/></label><label><span>Longitude <em>*</em></span><input type="number" step="any" min="-180" max="180" required value={values.lng} onChange={e=>set('lng',e.target.value)}/></label><div className="span-2"><CoordinatePicker lat={Number(values.lat)} lng={Number(values.lng)} onChange={coords=>setValues(v=>({...v,...coords}))} t={t}/></div><fieldset className="span-2 place-image-fields">
      <legend>{t('placeImages')}</legend>
      <div className="main-image-field">
        <button type="button" className="main-image-preview" disabled={!previews.main}
          aria-label={t('previewMainImage')} onClick={()=>setPreview(previews.main)}>
          {previews.main?<PreviewImage key={previews.main} url={previews.main} t={t}/>:<span>{t('noMainImage')}</span>}
        </button>
        <div><label><span>{t('mainImage')}</span><input value={values.image??''} inputMode="url"
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
    </fieldset>{field('description',{full:true,textarea:true})}{field('source',{full:true,maxLength:150})}</div></div>{(error||saveError)&&<p className="form-error place-form-error" role="alert">{t(error||saveError)}</p>}<div className="modal-footer"><button className="button secondary" type="button" onClick={onClose} disabled={busy}>{t('cancel')}</button><button className="button primary" type="submit" disabled={busy}><Icon name="check" size={16}/>{t(busy?'saving':'save')}</button></div></form></Modal>
    {preview&&<Modal title={t('previewImages')} onClose={()=>setPreview(null)} t={t} className="image-link-modal">
      <PreviewImage key={preview} url={preview} t={t}/>
    </Modal>}
  </>;
}


function PreviewImage({url,t}) {
  const [failed,setFailed]=useState(false);
  return failed?<span role="status">{t('previewImageError')}</span>:
    <img src={url} alt={t('previewImages')} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}
