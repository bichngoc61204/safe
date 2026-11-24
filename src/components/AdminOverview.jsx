import { useMemo, useState } from 'react';
import Icon from './Icon';
import TrafficDashboard from './TrafficDashboard';
import {AttentionBadge} from './AdminAttention';
import { catalogGroups, groupPalette } from '../lib/catalogGroups';
import { getCategory, isAlert } from '../lib/domain';
import { isPublished, qualityIssues } from '../lib/editorial';
import { categoryVisualIcon, isCommunitySupport, isSupportLevel } from '../lib/supportLevels';
import { placeText } from '../lib/locale';
import '../admin-overview.css';

const tools=[
 {id:'quality',icon:'check',title:'Chất lượng dữ liệu',hint:'Bổ sung thông tin còn thiếu',tone:'blue'},
 {id:'reports',icon:'alert',title:'Thông tin cần kiểm tra',hint:'Tiếp nhận phản ánh địa điểm',tone:'amber'},
 {id:'history',icon:'history',title:'Lịch sử thay đổi',hint:'Xem ai đã thêm, sửa, xóa',tone:'violet'},
 {id:'trash',icon:'restore',title:'Thùng rác',hint:'Khôi phục điểm đã xóa',tone:'slate'},
];

export default function AdminOverview({data,t,lang,getIdToken,onNavigate,onCategory,onTools,onPoint,attention,reportStatus='ready'}){
 const [tab,setTab]=useState('summary');
 const places=useMemo(()=>data.places.filter(place=>!place.deletedAt),[data.places]);
 const groups=useMemo(()=>catalogGroups.map(group=>{
  const categories=data.categories.filter(category=>category.kind===group.id);
  const ids=new Set(categories.map(category=>category.id));
  const points=places.filter(place=>ids.has(place.category));
  return {...group,categories,points,published:points.filter(isPublished).length};
 }),[data.categories,places]);
 const published=places.filter(isPublished).length;
 const hidden=places.length-published;
 const trash=data.places.length-places.length;
 const issues=useMemo(()=>new Map(places.map(place=>[place.id,qualityIssues(place,data)])),[places,data]);
 const qualityCount=places.filter(place=>issues.get(place.id).length).length;
 const toolCounts=attention||{quality:qualityCount,trash,reports:0};
 const toolCountLabel=tool=>tool.id==='reports'&&reportStatus!=='ready'?(reportStatus==='error'?'Chưa tải được số phản ánh đang chờ':'Đang tải số phản ánh đang chờ'):`${tool.title}: ${toolCounts[tool.id]} mục cần xử lý`;
 const unassigned=places.filter(place=>isCommunitySupport(getCategory(data.categories,place.category))&&!isSupportLevel(place.supportLevel));
 const greenAlerts=places.filter(place=>getCategory(data.categories,place.category)?.kind==='green'&&isAlert(place));
 const unchecked=places.filter(place=>issues.get(place.id).includes('qualityReview'));
 const missingContact=places.filter(place=>issues.get(place.id).includes('qualityPhone'));
 const missingHours=places.filter(place=>issues.get(place.id).includes('qualityHours'));
 const priorities=useMemo(()=>{
  const ranked=places.map(place=>{
   const found=issues.get(place.id),category=getCategory(data.categories,place.category);
   if(isCommunitySupport(category)&&!isSupportLevel(place.supportLevel))return {place,category,rank:0,reason:'Chưa chọn mức hỗ trợ',tone:'amber'};
   if(category?.kind==='green'&&isAlert(place))return {place,category,rank:1,reason:t(place.status),tone:'red'};
   if(found.includes('qualityPhone'))return {place,category,rank:category?.kind==='safe'?2:category?.kind==='partner'?4:6,reason:'Cần kiểm tra số điện thoại',tone:'blue'};
   if(found.includes('qualityHours'))return {place,category,rank:category?.kind==='safe'?3:5,reason:'Cần bổ sung giờ hoạt động',tone:'blue'};
   if(found.includes('qualityReview'))return {place,category,rank:category?.kind==='safe'?4:7,reason:'Chưa xác minh thông tin',tone:'slate'};
   return null;
  }).filter(Boolean).sort((a,b)=>a.rank-b.rank||a.place.name.localeCompare(b.place.name,'vi'));
  return ranked.slice(0,5);
 },[places,issues,data.categories,t]);
 const communityCategories=data.categories.filter(category=>isCommunitySupport(category));
 const communityCategory=communityCategories[0];
 const checks=[
  {title:'Mức hỗ trợ chưa phân',hint:'Chỉ các điểm Hỗ trợ cộng đồng',value:unassigned.length,icon:'community',tone:'amber',action:()=>communityCategories.length===1?onCategory('safe',communityCategory.id,{supportLevel:'unassigned'}):onNavigate('safe',{supportLevel:'unassigned'})},
  {title:'Điểm xanh cần xử lý',hint:'Cần vệ sinh hoặc đang quá tải',value:greenAlerts.length,icon:'recycle',tone:'red',action:()=>onNavigate('green',{status:'alerts'})},
  {title:'Thông tin cần xác minh',hint:'Chưa xác minh hoặc đã quá 90 ngày',value:unchecked.length,icon:'check',tone:'blue',action:()=>onTools('quality','qualityReview')},
  {title:'Liên hệ cần bổ sung',hint:'Số điện thoại thiếu hoặc chưa hợp lệ',value:missingContact.length,icon:'phone',tone:'slate',action:()=>onTools('quality','qualityPhone')},
 ];
 const moveTab=event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const next=event.key==='Home'?'summary':event.key==='End'?'traffic':tab==='summary'?'traffic':'summary';setTab(next);
  event.currentTarget.querySelector(`[data-view="${next}"]`)?.focus({preventScroll:true});
 };
 return <div className="admin-overview-v2">
  <div className="ao-view-switch" role="tablist" aria-label="Tổng quan" onKeyDown={moveTab}>
   {[['summary','Điều hành','dashboard'],['traffic','Lượt truy cập','chart']].map(([id,label,icon])=><button key={id} type="button" role="tab" data-view={id} id={`overview-tab-${id}`} aria-selected={tab===id} aria-controls="overview-panel" tabIndex={tab===id?0:-1} onClick={()=>setTab(id)}><Icon name={icon} size={15}/>{label}</button>)}
  </div>
  <div className="ao-view" key={tab} id="overview-panel" role="tabpanel" aria-labelledby={`overview-tab-${tab}`}>
   {tab==='traffic'?<TrafficDashboard t={t} lang={lang} getIdToken={getIdToken} data={data} onPoint={onPoint}/>:<>
    <section className="ao-catalog-summary" aria-label="Tình hình dữ liệu địa điểm">
     <div className="ao-total"><span className="ao-section-label">Danh bạ An Thượng</span><div><strong>{places.length}</strong><span>địa điểm <br/>đang quản lý</span></div><button type="button" onClick={()=>onNavigate('places')}>Mở danh sách địa điểm <Icon name="right" size={15}/></button></div>
     <div className="ao-publication">
      <div><span className="ao-dot ao-dot-green"/><span><strong>{published}</strong> đang công khai</span><small>Hiển thị trên bản đồ cộng đồng</small></div>
      <div><span className="ao-dot ao-dot-slate"/><span><strong>{hidden}</strong> đang ẩn</span><small>Vẫn được giữ trong trang quản trị</small></div>
      <div><span className="ao-dot ao-dot-blue"/><span><strong>{data.categories.length}</strong> danh mục</span><small>Thuộc 3 nhóm chức năng</small></div>
     </div>
    </section>
    <section className="ao-groups" aria-label="Địa điểm theo nhóm">
     {groups.map((group,index)=>{const palette=groupPalette[group.id];return <article className="ao-group" key={group.id} style={{'--ao-ink':palette.ink,'--ao-wash':palette.wash,'--ao-line':palette.line,'--ao-order':index}}>
      <button type="button" className="ao-group-main" onClick={()=>onNavigate(group.id)}><span className="ao-group-icon"><Icon name={group.icon} size={22}/></span><span><strong>{t(group.label)}</strong><small>{group.published} công khai · {group.points.length-group.published} đang ẩn</small></span><b>{group.points.length}</b><Icon name="right" size={16}/></button>
      <div className="ao-group-categories" aria-label={`Danh mục ${t(group.label)}`}>
       {group.categories.length?group.categories.map(category=><button type="button" key={category.id} onClick={()=>onCategory(group.id,category.id)}><Icon name={categoryVisualIcon(category)} size={13}/>{category.name}<span>{group.points.filter(place=>place.category===category.id).length}</span></button>):<span>Chưa có danh mục</span>}
      </div>
     </article>;})}
    </section>
    <div className="ao-workspace">
     <section className="ao-panel ao-priority">
      <header><div><span className="ao-section-label">Rà soát địa điểm</span><h2>Ưu tiên kiểm tra</h2><p>Mở từng điểm để xem đầy đủ thông tin và chỉnh sửa.</p></div><button type="button" onClick={()=>onTools('quality')}>Xem tất cả <Icon name="right" size={14}/></button></header>
      {priorities.length?<div className="ao-point-list">{priorities.map(({place,category,reason,tone})=><button type="button" key={place.id} className="ao-point" onClick={()=>onPoint(place.id)}>
       <span className="ao-point-icon" style={{color:categoryColor(category),background:groupPalette[category?.kind]?.wash||'#f0f4f2'}}><Icon name={categoryVisualIcon(category)} size={18}/></span>
       <span className="ao-point-copy"><strong>{placeText(place,'name',lang)}</strong><small>{category?.name} · {t(category?.kind)}</small><span><Icon name="pin" size={12}/>{placeText(place,'address',lang)}</span><em className={`ao-reason ao-tone-${tone}`}>{reason}</em></span><Icon name="right" size={15}/>
      </button>)}</div>:<div className="ao-all-clear"><Icon name="check" size={27}/><strong>{places.length?'Chưa có mục cần ưu tiên kiểm tra':'Danh bạ chưa có địa điểm'}</strong><p>{places.length?'Xem công cụ Chất lượng dữ liệu để rà soát các thông tin bổ sung.':'Chọn Thêm địa điểm để bắt đầu xây dựng danh bạ.'}</p></div>}
     </section>
     <section className="ao-panel ao-checks"><header><div><span className="ao-section-label">Chất lượng vận hành</span><h2>Những việc cần chú ý</h2></div><Icon name="filter" size={18}/></header>
      <div>{checks.map(item=><button type="button" key={item.title} className={`ao-check ao-tone-${item.tone}`} onClick={item.action} disabled={!item.value}><span className="ao-check-icon"><Icon name={item.icon} size={18}/></span><span><strong>{item.title}</strong><small>{item.hint}</small></span><b>{item.value}</b></button>)}</div>
      <p className="ao-check-note"><Icon name="clock" size={14}/>{missingHours.length} điểm chưa đủ thông tin giờ hoạt động. Bổ sung giờ để bộ lọc “Đang mở cửa” hoạt động chính xác.</p>
     </section>
    </div>
    <section className="ao-tools" aria-label="Công cụ dữ liệu"><header><div><span className="ao-section-label">Quản lý dữ liệu</span><h2>Công cụ dữ liệu</h2></div><span>Kiểm tra, theo dõi và khôi phục</span></header><div className="ao-tool-strip">{tools.map((tool,index)=><button type="button" key={tool.id} className={`ao-tool ao-tone-${tool.tone}`} style={{'--ao-order':index}} onClick={()=>onTools(tool.id)}><span className="ao-tool-icon"><Icon name={tool.icon} size={20}/></span><span><strong>{tool.title}</strong><small>{tool.hint}</small></span>{tool.id==='history'?<Icon name="right" size={15}/>:<AttentionBadge count={toolCounts[tool.id]} label={toolCountLabel(tool)} tone={tool.id==='reports'?'red':tool.id==='trash'?'slate':'amber'} status={tool.id==='reports'?reportStatus:'ready'}/>}</button>)}</div></section>
   </>}
  </div>
 </div>;
}

function categoryColor(category){return groupPalette[category?.kind]?.ink||'#49645b';}
