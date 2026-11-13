import {normalize,safeImage,statuses} from './domain.js';
import {isClockTime} from './placeHours.js';
import {defaultSchedule,validSchedule,wasteTypes,placeWasteTypes} from './editorial.js';
import {translatedPlaceFields} from './locale.js';
export const importColumns=[
 ['id','Mã địa điểm','Place ID'],['category','Mã danh mục','Category ID'],['name','Tên địa điểm','Place name'],['address','Địa chỉ','Address'],['lat','Vĩ độ','Latitude'],['lng','Kinh độ','Longitude'],['phone','Số điện thoại','Phone number'],['owner','Đơn vị phụ trách','Responsible organization'],['waste','Loại rác tiếp nhận','Accepted materials'],['wasteTypes','Mã loại rác','Material type IDs'],['status','Trạng thái','Status'],['opensAt','Giờ mở cửa','Opens at'],['closesAt','Giờ đóng cửa','Closes at'],['hours','Giờ hoạt động','Opening hours'],['image','URL ảnh chính','Cover image URL'],['images','Link ảnh phụ','Additional image URLs'],['description','Mô tả','Description'],['source','Nguồn dữ liệu','Source'],['nameEn','Tên tiếng Anh','English name'],['addressEn','Địa chỉ tiếng Anh','English address'],['ownerEn','Đơn vị phụ trách tiếng Anh','English operator'],['wasteEn','Loại rác tiếng Anh','English materials'],['hoursEn','Ghi chú giờ tiếng Anh','English hours notes'],['descriptionEn','Mô tả tiếng Anh','English description'],
 ...Array.from({length:7},(_,index)=>[`day${index}`,['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'][index],['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][index]]),['holidays','Ngày nghỉ đặc biệt','Holiday dates'],
];
const aliases={category:['Danh mục','Category'],image:['URL hình ảnh','Image URL'],lat:['latitude'],lng:['longitude'],images:['Link ảnh phụ','Gallery image URLs','Ảnh phụ','Additional photos'],source:['Data source'],id:['id'],nameEn:['nameEn'],holidays:['Ngày nghỉ / lịch đặc biệt','Holidays / special hours']};
const text=value=>String(value??'').trim();
function dayValue(value){
 const clean=normalize(text(value));
 if(['nghi','closed','off'].includes(clean))return {closed:true,allDay:false,opensAt:'08:00',closesAt:'17:00'};
 if(['24/7','24h','24 gio','24 hours'].includes(clean))return {closed:false,allDay:true,opensAt:'00:00',closesAt:'23:59'};
 const pair=clean.match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/);
 return pair&&isClockTime(pair[1])&&isClockTime(pair[2])&&pair[1]!==pair[2]?{closed:false,allDay:false,opensAt:pair[1],closesAt:pair[2]}:null;
}
export function parseImportRows(rows,data,{update=false,idFactory=()=>crypto.randomUUID(),now=new Date().toISOString()}={}){
 if(!Array.isArray(rows)||rows.length<2||rows.length>201)throw Error('importTooLarge');
 const headers=rows[0].map(value=>normalize(text(value)));
 const positions=Object.fromEntries(importColumns.map(([key,vi,en])=>[key,headers.findIndex(value=>[key,vi,en,...(aliases[key]||[])].some(name=>normalize(name)===value))]));
 const categoryId=headers.findIndex(value=>['ma danh muc','category id','categoryid'].includes(value));if(categoryId>=0)positions.category=categoryId;
 if(['name','address','category','lat','lng'].some(key=>positions[key]<0))throw Error('importBadFile');
 const seenIds=new Set(),seenNames=new Map();
 for(const point of data.places.filter(point=>!point.deletedAt))seenNames.set(normalize(point.name+'|'+point.address),point.id);
 const parsed=rows.slice(1).flatMap((row,index)=>{
  if(row.every(value=>value==null||text(value)===''))return [];
  const get=key=>positions[key]>=0?text(row[positions[key]]):undefined;
  const errors=[];
  const suppliedId=get('id'),existing=suppliedId&&data.places.find(place=>place.id===suppliedId);
  if(existing&&(!update||existing.deletedAt))errors.push('importDuplicate');
  const category=get('category')&&data.categories.find(item=>[item.id,item.name,item.nameEn].some(value=>normalize(value)===normalize(get('category'))));
  if(!category)errors.push('importCategory');
  const point={phone:'',owner:'',waste:'',description:'',source:'',image:'',images:[],...structuredClone(existing||{}),id:suppliedId||idFactory(),name:get('name'),address:get('address'),category:category?.id||'',lat:Number(get('lat')?.replace(',','.')),lng:Number(get('lng')?.replace(',','.')),visibility:'hidden',review:{status:'pending'},updatedAt:now};
  if(!point.name||!point.address||point.name.length>150||point.address.length>250)errors.push('importRequired');
  if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng)||Math.abs(point.lat)>90||Math.abs(point.lng)>180||get('lat')===''||get('lng')==='')errors.push('importCoordinates');
  if(!/^[\w-]{1,100}$/.test(point.id)||seenIds.has(point.id))errors.push('importDuplicate');seenIds.add(point.id);
  const pair=normalize(point.name+'|'+point.address),duplicate=seenNames.get(pair);
  if(duplicate&&duplicate!==point.id)errors.push('importDuplicate');seenNames.set(pair,point.id);
  for(const key of ['phone','owner','waste','description','source','hours','nameEn','addressEn','ownerEn','wasteEn','hoursEn','descriptionEn','opensAt','closesAt'])if(get(key)!==undefined)point[key]=get(key);
  if(get('wasteTypes')!==undefined){
   point.wasteTypes=[...new Set(get('wasteTypes').split(/[;,\n]/).map(value=>text(value).toLowerCase()).filter(Boolean))];
   if(point.wasteTypes.some(type=>!wasteTypes.includes(type)))errors.push('importWasteTypes');
  }else if(get('waste')!==undefined)point.wasteTypes=placeWasteTypes({waste:point.waste});
  if(Object.entries(translatedPlaceFields).some(([key,max])=>(point[`${key}En`]?.length||0)>max))errors.push('importRequired');
  if((point.opensAt||point.closesAt)&&(!isClockTime(point.opensAt)||!isClockTime(point.closesAt)||point.opensAt===point.closesAt))errors.push('importHours');
  const raw=get('status');
  const mapped={active:['hoat dong','active'],clean:['sach se','clean'],warning:['can ve sinh','needs cleaning'],overloaded:['qua tai','overloaded'],inactive:['tam ngung','temporarily closed']};
  point.status=raw?Object.keys(mapped).find(key=>[key,...mapped[key]].includes(normalize(raw))):existing?.status||(category?.kind==='green'?'clean':'active');
  if(!statuses.includes(point.status))errors.push('required');
  if(get('image')!==undefined){point.image=get('image');if(point.image&&!safeImage(point.image))errors.push('invalidImageUrl');}
  if(get('images')!==undefined){point.images=get('images').split(/[\n;]/).map(text).filter(Boolean);if(point.images.length>5||point.images.some(url=>!safeImage(url))||new Set([point.image,...point.images].filter(Boolean)).size!==[point.image,...point.images].filter(Boolean).length)errors.push('invalidGallery');}
  const hasDays=Array.from({length:7},(_,i)=>get(`day${i}`)).some(Boolean);
  if(hasDays){const days=Array.from({length:7},(_,i)=>dayValue(get(`day${i}`)));if(days.some(day=>!day))errors.push('scheduleInvalid');else {point.schedule={enabled:true,days,exceptions:[]};point.opensAt='';point.closesAt='';}}
  if(get('holidays')){
   point.schedule=point.schedule||defaultSchedule(point);
   point.schedule.exceptions=get('holidays').split(/[,;\n]/).map(text).filter(Boolean).map(value=>{const [date,hours]=value.split('=');return {date,...(hours?dayValue(hours)||{closed:false,allDay:false,opensAt:'',closesAt:''}:{closed:true,allDay:false,opensAt:'08:00',closesAt:'17:00'})};});
  }
  if(point.schedule&&!validSchedule(point.schedule))errors.push('scheduleInvalid');
  return [{row:index+2,point,errors:[...new Set(errors)],update:Boolean(existing)}];
 });
 if(!parsed.length)throw Error('importNoRows');
 if(data.places.length+parsed.filter(row=>!row.update).length>200)throw Error('catalogLimit');
 return parsed;
}
export async function downloadImportTemplate(data,lang='vi'){
 const {default:write}=await import('write-excel-file/browser');
 const row=values=>values.map(value=>({value}));
 await write([
  {sheet:lang==='en'?'Places':'Địa điểm',data:[row(importColumns.map(column=>column[lang==='en'?2:1]))],columns:importColumns.map(()=>({width:24}))},
  {sheet:lang==='en'?'Categories':'Danh mục',data:[row(['ID','Nhóm / Group','Tên / Name','English']),...data.categories.map(category=>row([category.id,category.kind,category.name,category.nameEn]))],columns:[{width:24},{width:20},{width:30},{width:30}]},
  {sheet:lang==='en'?'Material IDs':'Mã loại rác',data:[row([lang==='en'?'Material type IDs (separate with ;)':'Mã loại rác (ngăn cách bằng ;)']),...wasteTypes.map(type=>row([type]))],columns:[{width:42}]},
 ]).toFile('safemap-import-template.xlsx');
}
