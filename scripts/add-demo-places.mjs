// Idempotent, explicitly labelled demonstration records. Credentials are read from stdin.
import {deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword} from 'firebase/auth';
import {getDoc} from 'firebase/firestore';
import {catalogRefs,writeCatalog,writeManagedCatalog} from '../src/lib/firebaseCatalog.js';
import {readFirebaseConfig} from '../src/lib/firebaseConfig.js';
import {normalize} from '../src/lib/domain.js';
const schedule=(opensAt,closesAt,allDay=false)=>({enabled:true,days:Array.from({length:7},()=>({closed:false,allDay,opensAt,closesAt})),exceptions:[]});
export function demoPlaces(categories){
 const pick=(kind,preferred)=>categories.find(category=>category.kind===kind&&preferred.test(normalize(category.name+' '+category.nameEn)))||categories.find(category=>category.kind===kind);
 const safe=pick('safe',/ho tro|support/),green=pick('green',/moi truong|environment/),partner=pick('partner',/dich vu|services/);
 if(!safe||!green||!partner)throw Error('Cần danh mục thuộc đủ ba nhóm.');
 const common={visibility:'published',review:{status:'pending'},source:'Dữ liệu minh họa',owner:'Nhóm trải nghiệm SafeMap — chưa phải đơn vị tiếp nhận thật',ownerEn:'SafeMap demonstration team — not a real service operator',updatedAt:new Date().toISOString()};
 return [
  {...common,id:'demo-v2-visitor-support',name:'Điểm hỗ trợ du khách An Thượng • Demo',nameEn:'An Thuong visitor support • Demo',category:safe.id,lat:16.0522,lng:108.2441,address:'Đường An Thượng 1, Đà Nẵng (vị trí minh họa)',addressEn:'An Thuong 1 Street, Da Nang (illustrative location)',phone:'000 000 9001',status:'active',description:'Điểm minh họa để thử chia sẻ, lưu địa điểm và lịch 24 giờ. Không phải điểm hỗ trợ thật; không sử dụng để yêu cầu trợ giúp.',descriptionEn:'A demonstration of sharing, saving and 24-hour schedules. This is not a real support service.',schedule:schedule('00:00','23:59',true),image:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',images:[]},
  {...common,id:'demo-v2-green-collection',name:'Điểm nhận pin & chai nhựa • Demo',nameEn:'Battery & plastic collection • Demo',category:green.id,lat:16.0502,lng:108.2454,address:'Đường An Thượng 3, Đà Nẵng (vị trí minh họa)',addressEn:'An Thuong 3 Street, Da Nang (illustrative location)',phone:'000 000 9002',status:'clean',waste:'Pin cũ, chai nhựa, giấy và carton',wasteEn:'Used batteries, plastic bottles, paper and cardboard',wasteTypes:['battery','plastic','paper'],description:'Điểm minh họa để thử bộ lọc loại rác, trạng thái vệ sinh và lịch theo ngày. Không mang rác đến tọa độ này.',descriptionEn:'Demonstrates materials, hygiene status and daily schedules. Do not bring waste to this illustrative location.',schedule:schedule('08:00','20:00'),image:'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',images:[]},
  {...common,id:'demo-v2-green-cafe',name:'Cà phê cộng đồng xanh • Demo',nameEn:'Green community cafe • Demo',category:partner.id,lat:16.0489,lng:108.2462,address:'Đường An Thượng 5, Đà Nẵng (vị trí minh họa)',addressEn:'An Thuong 5 Street, Da Nang (illustrative location)',phone:'000 000 9003',status:'active',description:'Cửa hàng giả định để trải nghiệm lưu điểm, QR, lịch mở cửa và nội dung Việt/Anh. Ảnh minh họa từ Unsplash; chưa có cửa hàng thật tại tọa độ này.',descriptionEn:'An illustrative partner for saved places, QR, opening hours and bilingual details. Unsplash illustration; not a real shop at this coordinate.',schedule:schedule('07:00','22:00'),image:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80',images:['https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80']},
 ];
}
async function main(){
 console.log('Ready for editor credentials on stdin (input is hidden).');
 if(process.stdin.isTTY)process.stdin.setRawMode(true);
 let input='';
 const credentials=await new Promise((resolve,reject)=>{
  process.stdin.on('data',chunk=>{
   input+=chunk.toString();
   if(!input.includes('\n'))return;
   try{resolve(JSON.parse(input.trim()));}catch{reject(Error('Invalid credential input'));}
   if(process.stdin.isTTY)process.stdin.setRawMode(false);
   process.stdin.pause();
  });
 });
 const {config}=readFirebaseConfig(process.env);if(!config)throw Error('Missing Firebase configuration');
 const refs=catalogRefs(config);
 try{
  await signInWithEmailAndPassword(getAuth(refs.app),credentials.email,credentials.password);
  const publicDoc=await getDoc(refs.catalog);let management,legacy=false;
  try{management=await getDoc(refs.management);}catch(error){if(error.code==='permission-denied')legacy=true;else throw error;}
  const snapshot=management?.exists()?management:publicDoc;if(!snapshot.exists())throw Error('Catalog is missing');
  const data={categories:snapshot.data().categories,places:snapshot.data().places};
  const additions=demoPlaces(data.categories).filter(place=>!data.places.some(existing=>existing.id===place.id));
  if(!additions.length){console.log('All 3 demo points already exist. No data was changed.');return;}
  const next={...data,places:[...data.places,...additions]};
  if(legacy)await writeCatalog(refs.catalog,next,snapshot.data().revision);
  else await writeManagedCatalog(refs,next,snapshot.data().revision,getAuth(refs.app).currentUser);
  console.log(`Added ${additions.length} labelled demo points. Existing records preserved. Total ${next.places.length}.`);
 }finally{await deleteApp(refs.app);}
}
if(process.argv[1]?.endsWith('add-demo-places.mjs'))main().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
