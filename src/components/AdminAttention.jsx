import {useEffect,useRef,useState} from 'react';
import Icon from './Icon';
import '../admin-attention.css';

export function AttentionBadge({count=0,label,tone='amber',status='ready'}){
 const failed=status==='error',unknown=status!=='ready';
 if(!count&&!failed)return null;
 const value=count?`${count>99?'99':count}${count>99||unknown?'+':''}`:'!';
 return <b key={value} className={`admin-attention-badge tone-${failed?'red':tone}`} title={label} aria-label={label}>{value}</b>;
}

export function usePendingReports(backend){
 const [state,setState]=useState({items:[],status:'loading'});
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let alive=true;
  setState({items:[],status:'loading'});
  if(!backend?.observePendingReports){setState({items:[],status:'error'});return;}
  const stop=backend.observePendingReports(items=>{
   if(alive)setState({items,status:'ready'});
  },()=>{if(alive)setState(previous=>({...previous,status:'error'}));});
  return ()=>{alive=false;stop?.();};
 },[backend,attempt]);
 return {...state,retry:()=>setAttempt(value=>value+1)};
}

export function AttentionNotice({attention,pending,onOpen,paused=false}){
 const [notice,setNotice]=useState(null);
 const seen=useRef(null);
 const initialized=useRef(false);
 useEffect(()=>{
  if(pending.status!=='ready')return;
  const ids=new Set(pending.items.map(item=>item.id));
  if(!initialized.current){
   initialized.current=true;
   if(attention.total)setNotice({title:'Có việc cần kiểm tra',text:`${attention.quality} điểm cần rà soát · ${attention.reports} phản ánh chờ · ${attention.trash} điểm trong thùng rác`,tab:attention.reports?'reports':attention.quality?'quality':'trash'});
  }else{
   const added=pending.items.filter(item=>!seen.current?.has(item.id));
   if(added.length)setNotice({title:added.length===1?'Có phản ánh cần kiểm tra':`${added.length} phản ánh cần kiểm tra`,text:added.length===1?added[0].placeName:'Mở hộp thư để xem các địa điểm được phản ánh.',tab:'reports'});
   else if(!attention.total||(notice?.tab==='reports'&&!attention.reports))setNotice(null);
  }
  seen.current=ids;
 },[pending.items,pending.status,attention.total,attention.quality,attention.reports,attention.trash]);
 useEffect(()=>{
  if(!notice)return;
  const timer=setTimeout(()=>setNotice(null),7000);
  return ()=>clearTimeout(timer);
 },[notice]);
 if(paused||!notice)return null;
 return <aside className="admin-attention-notice" aria-label="Thông báo quản trị">
  <Icon name="alert" size={19}/><div role="status"><strong>{notice.title}</strong><p>{notice.text}</p></div>
  <button type="button" className="attention-open" onClick={()=>{onOpen(notice.tab);setNotice(null);}}>Xem<Icon name="right" size={14}/></button>
  <button type="button" className="attention-dismiss" aria-label="Đóng thông báo quản trị" onClick={()=>setNotice(null)}><Icon name="x" size={15}/></button>
 </aside>;
}
