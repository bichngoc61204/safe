import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import Modal from './Modal';
import { activityTime } from '../lib/adminActivity';
import { summarizeEditorActivity } from '../lib/editorStats';
import '../admin-accounts.css';

const errors = {
  accountDenied:'Chưa có quyền quản lý tài khoản. Kiểm tra vai trò admin tổng và Firestore Rules mới.',
  accountInvalid:'Kiểm tra email, tên hiển thị và mật khẩu (ít nhất 6 ký tự).',
  accountExists:'Tài khoản này đã được cấp quyền. Kiểm tra trong danh sách bên dưới.',
  accountGrantFailed:'Đã đăng ký thông tin đăng nhập nhưng chưa cấp được quyền. Kiểm tra Rules rồi thử lại với cùng email và mật khẩu.',
  'auth/email-already-in-use':'Email đã tồn tại. Dùng đúng mật khẩu hiện tại để liên kết tài khoản.',
  'auth/invalid-credential':'Email đã tồn tại nhưng mật khẩu chưa đúng. Kiểm tra lại thông tin tài khoản.',
  'auth/weak-password':'Mật khẩu chưa đáp ứng yêu cầu của Firebase.',
  'auth/invalid-email':'Email chưa hợp lệ.',
  'auth/too-many-requests':'Quá nhiều lần thử. Vui lòng chờ rồi thử lại.',
  'auth/network-request-failed':'Mất kết nối. Kiểm tra mạng rồi thử lại.',
};
const errorText = error => errors[error.code || error.message] || 'Chưa thực hiện được. Kiểm tra kết nối, quyền quản trị và thử lại.';
const date = value => activityTime(value) ? new Intl.DateTimeFormat('vi',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(activityTime(value)) : 'Chưa có hoạt động';
const action = fields => fields.includes('created')?'Thêm địa điểm':fields.includes('removed')?'Xóa địa điểm':fields.includes('deletedAt')?'Thùng rác / khôi phục':fields.includes('categories')?'Sửa danh mục':fields.includes('status')?'Đổi trạng thái':'Chỉnh sửa';
const fieldLabel=(field,t)=>({created:'Địa điểm mới',removed:'Địa điểm đã xóa',categories:'Danh mục địa điểm'}[field]||t(field));

export default function AdminAccounts({backend,editor,t,onOpen,data}) {
  const [accounts,setAccounts]=useState([]),[listState,setListState]=useState('loading');
  const [events,setEvents]=useState([]),[activityState,setActivityState]=useState('loading');
  const [attempt,setAttempt]=useState(0),[progress,setProgress]=useState(0),[period,setPeriod]=useState('all');
  const [selected,setSelected]=useState(null),[page,setPage]=useState(1);
  const [creating,setCreating]=useState(false),[draft,setDraft]=useState({displayName:'',email:'',password:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [toggle,setToggle]=useState(null);
  const lock=useRef(false);
  const activityPanel=useRef(null);
  useEffect(()=>{
    if(!selected)return;
    const frame=requestAnimationFrame(()=>activityPanel.current?.scrollIntoView?.({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
    return ()=>cancelAnimationFrame(frame);
  },[selected]);
  useEffect(()=>{
    setListState('loading');
    return backend.observeEditors(items=>{setAccounts(items);setListState('ready');},()=>setListState('error'));
  },[backend,attempt]);
  useEffect(()=>{
    const controller=new AbortController();
    setActivityState('loading');setProgress(0);
    backend.loadEditorActivity({signal:controller.signal,onProgress:count=>{if(!controller.signal.aborted)setProgress(count);}}).then(items=>{
      if(!controller.signal.aborted){setEvents(items);setActivityState('ready');}
    }).catch(()=>{if(!controller.signal.aborted)setActivityState('error');});
    return ()=>controller.abort();
  },[backend,attempt]);
  const since=useMemo(()=>period==='all'?0:Date.now()-Number(period)*86400000,[period,attempt]);
  const stats=useMemo(()=>summarizeEditorActivity(events,since),[events,since]);
  const rows=accounts.map(account=>({...account,stats:stats.find(row=>row.uid===account.uid)||stats.find(row=>!row.uid&&row.email===account.email)}))
    .sort((a,b)=>(b.role==='superadmin')-(a.role==='superadmin')||String(a.email||a.uid).localeCompare(String(b.email||b.uid)));
  const selectedAccount=rows.find(row=>row.uid===selected);
  const recent=events.filter(event=>(event.actor===selected||(!event.actor&&event.actorEmail===selectedAccount?.email))&&activityTime(event.createdAt)>=since)
    .flatMap(event=>(event.changes||[]).map(change=>({...change,event})));
  const count=(row,key)=>activityState==='ready'?(row.stats?.[key]||0):'—';
  async function create(event){
    event.preventDefault();if(lock.current)return;
    lock.current=true;setBusy(true);setError('');setNotice('');
    try {await backend.createEditorAccount(draft);setCreating(false);setDraft({displayName:'',email:'',password:''});setNotice('Đã thêm tài khoản con. Có thể đăng nhập và quản lý địa điểm ngay.');}
    catch(error){setError(errorText(error));}
    finally{lock.current=false;setBusy(false);}
  }
  async function changeAccess(){
    if(lock.current||!toggle)return;lock.current=true;setBusy(true);setError('');setNotice('');
    try{await backend.setEditorActive(toggle.uid,!toggle.active);setNotice(toggle.active?'Đã khóa quyền quản trị. Tài khoản này không thể đọc dữ liệu riêng hoặc lưu thay đổi.':'Đã mở lại quyền quản trị.');setToggle(null);}
    catch(error){setError(errorText(error));}
    finally{lock.current=false;setBusy(false);}
  }
  return <section className="admin-accounts" aria-label="Quản lý tài khoản">
    <div className="accounts-intro"><span className="accounts-lead-icon"><Icon name="lock" size={23}/></span><div><h2>Đội ngũ quản trị</h2><p>Tài khoản con quản lý đầy đủ địa điểm. Chỉ admin tổng được thêm, khóa và mở quyền tài khoản.</p></div><button type="button" className="button primary" onClick={()=>{setError('');setCreating(true);}}><Icon name="plus" size={16}/>Thêm tài khoản</button></div>
    {notice&&<p className="accounts-notice" role="status"><Icon name="check" size={17}/>{notice}</p>}
    <div className="accounts-toolbar"><div className="accounts-period" role="group" aria-label="Thời gian thống kê">{[['all','Toàn bộ lịch sử'],['30','30 ngày'],['7','7 ngày']].map(([value,label])=><button key={value} type="button" aria-pressed={period===value} onClick={()=>{setPeriod(value);setPage(1);}}>{label}</button>)}</div><button type="button" className="button secondary accounts-refresh" aria-label="Làm mới thống kê" title="Làm mới thống kê" disabled={activityState==='loading'} onClick={()=>setAttempt(v=>v+1)}><Icon name="restore" size={15}/><span>Làm mới</span></button></div>
    <p className="accounts-scope" role="status">{activityState==='loading'?`Đang đọc nhật ký hoạt động… ${progress?`(${progress} lượt lưu)`:''}`:activityState==='error'?'Chưa tải được thống kê. Bấm Làm mới để thử lại.':`Thống kê từ ${events.length} lượt lưu trong nhật ký. “Đổi trạng thái” là một phần của “Chỉnh sửa”.`}</p>
    {listState==='error'?<p className="form-error" role="alert">Chưa đọc được danh sách tài khoản. Cần xuất bản Firestore Rules mới và cấp vai trò superadmin trong Firebase Console.</p>:listState==='loading'?<p role="status">Đang tải danh sách tài khoản…</p>:<div className="accounts-grid">{rows.map(row=><article className="account-card" key={row.uid} data-disabled={row.active!==true}>
      <header><span className="account-avatar"><Icon name={row.role==='superadmin'?'lock':'family'} size={22}/></span><div><strong>{row.displayName||row.email||row.stats?.email||`Tài khoản ${row.uid.slice(0,8)}`}</strong><small>{row.displayName&&(row.email||row.stats?.email)}</small><span className="account-role">{row.role==='superadmin'?'Admin tổng':'Tài khoản con'}{row.uid===editor.uid?' · Bạn':''}</span></div><span className={`account-state ${row.active===true?'':'is-locked'}`}>{row.active===true?'Đang hoạt động':'Đã khóa'}</span></header>
      <dl>{[['added','Điểm đã thêm'],['edited','Lần sửa điểm'],['status','Đổi trạng thái'],['trash','Xóa / khôi phục']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{count(row,key)}</dd></div>)}</dl>
      <p className="account-last">Lần cuối: {activityState==='ready'?date(row.stats?.lastAt):'Đang kiểm tra…'}</p>
      <footer><button type="button" className="text-button" onClick={()=>{setSelected(row.uid);setPage(1);}}>Xem hoạt động <Icon name="right" size={14}/></button>{row.role!=='superadmin'&&row.uid!==editor.uid&&<button type="button" className="text-button" disabled={busy} onClick={()=>{setError('');setToggle(row);}}>{row.active===true?'Khóa quyền':'Mở lại quyền'}</button>}</footer>
    </article>)}</div>}
    {selectedAccount&&<section className="account-activity panel" ref={activityPanel}><header><div><h2>Hoạt động · {selectedAccount.displayName||selectedAccount.email||selectedAccount.stats?.email}</h2><p>{recent.length} thay đổi trong khoảng thời gian đã chọn</p></div><button className="icon-button" type="button" aria-label="Đóng hoạt động" onClick={()=>setSelected(null)}><Icon name="x"/></button></header>{activityState!=='ready'?<p role="status">Thống kê chưa sẵn sàng. Bấm Làm mới để tải lại.</p>:recent.length?<><ol>{recent.slice((page-1)*15,page*15).map((change,index)=><li key={`${change.event.revision}-${index}`}><span className="account-action">{action(change.fields||[])}</span><div><strong>{change.id==='categories'?'Danh mục địa điểm':change.name}</strong><small>{change.fields.map(field=>fieldLabel(field,t)).join(' · ')}</small></div><time>{date(change.event.createdAt)}</time>{data.places.some(place=>place.id===change.id&&!place.deletedAt)&&<button type="button" className="icon-button" aria-label={`Mở ${change.name}`} onClick={()=>onOpen(change.id)}><Icon name="right" size={16}/></button>}</li>)}</ol><div className="account-pagination"><button type="button" className="button secondary" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Trước</button><span>{page} / {Math.max(1,Math.ceil(recent.length/15))}</span><button type="button" className="button secondary" disabled={page*15>=recent.length} onClick={()=>setPage(v=>v+1)}>Sau</button></div></>:<p>Chưa có thay đổi được ghi nhận trong khoảng thời gian này.</p>}</section>}
    {creating&&<Modal title="Thêm tài khoản con" onClose={()=>{if(!busy){setCreating(false);setDraft({displayName:'',email:'',password:''});}}} dismissible={!busy} t={t}><form onSubmit={create}><div className="form-scroll accounts-create"><p>Tài khoản được cấp đầy đủ quyền quản lý địa điểm, không có quyền quản lý tài khoản khác.</p><label><span>Tên hiển thị</span><input value={draft.displayName} maxLength={80} onChange={e=>setDraft({...draft,displayName:e.target.value})}/></label><label><span>Email <em>*</em></span><input type="email" autoComplete="off" required maxLength={254} value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label><label><span>Mật khẩu <em>*</em></span><input type="password" autoComplete="new-password" required minLength={6} value={draft.password} onChange={e=>setDraft({...draft,password:e.target.value})}/></label><small>Ít nhất 6 ký tự. Mật khẩu không được lưu trong dữ liệu địa điểm hoặc nhật ký.</small>{error&&<p className="form-error" role="alert">{error}</p>}</div><div className="modal-footer"><button className="button secondary" type="button" data-dialog-dismiss disabled={busy}>Hủy</button><button className="button primary" disabled={busy}>{busy?'Đang tạo…':'Tạo tài khoản'}</button></div></form></Modal>}
    {toggle&&<Modal title={toggle.active?'Khóa quyền quản trị?':'Mở lại quyền quản trị?'} onClose={()=>{if(!busy)setToggle(null);}} dismissible={!busy} t={t}><div className="form-scroll"><p><strong>{toggle.email||toggle.stats?.email||toggle.uid}</strong></p><p>{toggle.active?'Tài khoản sẽ mất quyền truy cập trang quản trị và lưu thay đổi. Lịch sử hoạt động vẫn được giữ nguyên.':'Tài khoản được tiếp tục quản lý đầy đủ địa điểm.'}</p>{error&&<p className="form-error" role="alert">{error}</p>}</div><div className="modal-footer"><button className="button secondary" type="button" data-dialog-dismiss disabled={busy}>Hủy</button><button className="button primary" type="button" disabled={busy} onClick={changeAccess}>{busy?'Đang cập nhật…':'Xác nhận'}</button></div></Modal>}
  </section>;
}
