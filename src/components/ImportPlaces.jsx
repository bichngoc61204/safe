import {useMemo,useRef,useState} from 'react';
import Icon from './Icon';
import Modal from './Modal';
import Dropdown from './Dropdown';
import {parseImportRows,downloadImportTemplate} from '../lib/importCatalog';
export default function ImportPlaces({data,onSave,onClose,t,lang,busy}){
 const [rows,setRows]=useState(null),[update,setUpdate]=useState(false),[error,setError]=useState(''),[reading,setReading]=useState(false),[filename,setFilename]=useState('');
 const input=useRef(null);
 const result=useMemo(()=>{if(!rows)return {items:[],error:''};try{return {items:parseImportRows(rows,data,{update}),error:''};}catch(error){return {items:[],error:error.message};}},[rows,data,update]);
 const valid=result.items.length>0&&!result.error&&result.items.every(row=>!row.errors.length);
 async function read(event){const file=event.target.files[0];if(!file)return;setError('');setRows(null);setFilename(file.name);if(file.size>2*1024*1024||!file.name.toLowerCase().endsWith('.xlsx')){setError('importTooLarge');return;}setReading(true);try{const {readSheet}=await import('read-excel-file/browser');const next=await readSheet(file,1);setRows(next);}catch(error){if(import.meta.env.DEV){console.warn('[SafeMap] Excel preview:',error);}setError('importBadFile');}finally{setReading(false);}}
 async function save(){if(!valid||busy)return;setError('');try{const imported=new Map(result.items.map(row=>[row.point.id,row.point]));const places=data.places.map(place=>{const next=imported.get(place.id);imported.delete(place.id);return next||place;});await onSave({...data,places:[...places,...imported.values()]});onClose();}catch(error){setError(error.message||'operationError');}}
 return <Modal title={t('importTitle')} onClose={onClose} t={t} wide dismissible={!busy&&!reading} className="import-modal">
  <div className="community-modal-body"><p>{t('importHint')} {t('hidden')}.</p><div className="community-button-row"><button className="button secondary" onClick={()=>downloadImportTemplate(data,lang).catch(()=>setError('excelError'))}><Icon name="download" size={16}/>{t('downloadTemplate')}</button><button className="button secondary" disabled={reading} onClick={()=>input.current.click()}><Icon name="upload" size={16}/>{t('chooseExcel')}</button><input ref={input} type="file" accept=".xlsx" hidden onChange={read}/></div>
   {filename&&<p>{filename}</p>}<div className="form-dropdown"><span>{t('importMode')}</span><Dropdown label={t('importMode')} value={update?'update':'add'} onChange={value=>setUpdate(value==='update')}><option value="add">{t('importAdd')}</option><option value="update">{t('importUpdate')}</option></Dropdown></div>
   {reading&&<p role="status">{t('importReading')}</p>}{(error||result.error)&&<p role="alert" className="form-error">{t(error||result.error)}</p>}
   {result.items.length>0&&<><p>{result.items.length} {t('results')} · {result.items.filter(row=>!row.errors.length).length} {t('importValid')}</p><div className="import-preview-scroll"><table><thead><tr><th>{t('importRow')}</th><th>{t('name')}</th><th>{t('category')}</th><th>{t('importErrors')}</th></tr></thead><tbody>{result.items.map(row=><tr key={row.row}><td>{row.row}</td><td><strong>{row.point.name}</strong><small>{row.point.address}</small></td><td>{data.categories.find(category=>category.id===row.point.category)?.name||'—'}</td><td>{row.errors.length?row.errors.map(key=>t(key)).join(' · '):t('importValid')}</td></tr>)}</tbody></table></div>{!valid&&<p className="field-hint">{t('importBlocked')}</p>}</>}
  </div><div className="modal-footer"><button type="button" className="button secondary" data-dialog-dismiss disabled={busy||reading}>{t('cancel')}</button><button className="button primary" disabled={!valid||busy||reading} onClick={save}>{t(busy?'saving':'importConfirm')}</button></div>
 </Modal>;
}
