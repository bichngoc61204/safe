import { useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { CoordinatePicker } from './MapView';
import { CENTER } from '../lib/data';
import { getCategory, safeImage, statuses } from '../lib/domain';
export default function PlaceForm({place,categories,initialKind,onSave,onClose,t,lang}) {
  const [values,setValues]=useState(()=>({...{name:'',category:categories.find(c=>initialKind?c.kind===initialKind:true)?.id||categories[0].id,address:'',phone:'',owner:'',lat:CENTER[0],lng:CENTER[1],waste:'',status:initialKind==='green'?'clean':'active',hours:'',description:'',image:'',source:'Dữ liệu minh họa'},...place}));
  const [error,setError]=useState('');
  const set=(key,value)=>{
    setError('');
    setValues(v=>({...v,[key]:value}));
  };
  const kind=getCategory(categories,values.category)?.kind;
  const field=(key,options={})=><label className={options.full?'span-2':''}><span>{t(key)} {options.required&&<em>*</em>}</span>{options.textarea?<textarea value={values[key]||''} onChange={e=>set(key,e.target.value)} maxLength={1000} rows={3}/>:<input value={values[key]??''} onChange={e=>set(key,e.target.value)} type={options.type||'text'} required={options.required} maxLength={options.maxLength} pattern={options.pattern} placeholder={options.placeholder}/>}</label>;
  function submit(e){
    e.preventDefault();
    const name=values.name.trim();
    const address=values.address.trim();
    const image=safeImage(values.image);
    if(!name||!address){setError('required');return;}
    if(String(values.image??'').trim()&&!image){setError('invalidImageUrl');return;}
    const p={...values,name,address,lat:Number(values.lat),lng:Number(values.lng),id:place?.id||crypto.randomUUID(),image,updatedAt:new Date().toISOString()};
    if(!['green','partner'].includes(kind))p.waste='';
    if(kind!=='green'&&['clean','warning','overloaded'].includes(p.status))p.status='active';
    onSave(p);
  }
  return <Modal title={t(place?'editTitle':'addTitle')} onClose={onClose} t={t} wide><form onSubmit={submit}><div className="form-scroll"><div className="form-section-heading"><Icon name="list" size={16}/>{t('basicInfo')}</div><div className="form-grid">{field('name',{required:true,full:true,maxLength:150})}<label><span>{t('category')} <em>*</em></span><select value={values.category} onChange={e=>{const c=getCategory(categories,e.target.value);setValues(v=>({...v,category:c.id,status:c.kind===kind||v.status==='inactive'?v.status:c.kind==='green'?'clean':'active'}));}}>{categories.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}</select></label>{field('phone',{type:'tel',pattern:'[+0-9 \\(\\)\\-]{0,25}',maxLength:25})}{field('address',{required:true,full:true,maxLength:250})}{field('owner',{full:true,maxLength:150})}{field('hours',{maxLength:100})}<label><span>{t('status')}</span><select value={values.status} onChange={e=>set('status',e.target.value)}>{statuses.filter(s=>kind==='green'||['active','inactive'].includes(s)).map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>{['green','partner'].includes(kind)&&field('waste',{full:true,maxLength:250})}</div><div className="form-section-heading"><Icon name="pin" size={16}/>{t('locationSection')}</div><div className="form-grid"><label><span>Latitude <em>*</em></span><input type="number" step="any" min="-90" max="90" required value={values.lat} onChange={e=>set('lat',e.target.value)}/></label><label><span>Longitude <em>*</em></span><input type="number" step="any" min="-180" max="180" required value={values.lng} onChange={e=>set('lng',e.target.value)}/></label><div className="span-2"><CoordinatePicker lat={Number(values.lat)} lng={Number(values.lng)} onChange={coords=>setValues(v=>({...v,...coords}))} t={t}/></div>{field('image',{full:true,placeholder:t('imageHint')})}{field('description',{full:true,textarea:true})}{field('source',{full:true,maxLength:150})}</div></div>{error&&<p className="form-error place-form-error" role="alert">{t(error)}</p>}<div className="modal-footer"><button className="button secondary" type="button" onClick={onClose}>{t('cancel')}</button><button className="button primary" type="submit"><Icon name="check" size={16}/>{t('save')}</button></div></form></Modal>;
}
