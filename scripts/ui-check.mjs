// Component integration checks in a simulated DOM, not a visual browser test.
import {publicCatalog,catalogChanges} from '../src/lib/editorial.js';
import { makeTestCatalog } from './catalog.fixture.mjs';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost:5173/',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLSelectElement','SVGElement','SVGSVGElement','Element','Node','Event','MouseEvent','getComputedStyle','localStorage','sessionStorage'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const gpsPermission=new dom.window.EventTarget();
gpsPermission.state='prompt';
let gpsRequests=0;
let gpsWatch;
let gpsWatchError;
let gpsDenied=false;
Object.defineProperties(navigator,{
 permissions:{value:{query:async()=>gpsPermission}},
 geolocation:{value:{getCurrentPosition(success,error){
   gpsRequests++;
   if(gpsDenied){error({code:1});return;}
   success({coords:{latitude:16.0512,longitude:108.241}});
 },watchPosition(success,error){
   gpsWatch=success;
   gpsWatchError=error;
   return 1;
 },clearWatch(){
   gpsWatch=null;
 }}},
});

globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
dom.window.SVGSVGElement.prototype.createSVGRect=()=>({});
for(const [key,size] of [['clientWidth',960],['clientHeight',640]]){
 const original=Object.getOwnPropertyDescriptor(dom.window.Element.prototype,key).get;
 Object.defineProperty(dom.window.HTMLElement.prototype,key,{get(){return this.classList.contains('leaflet-map')?size:original.call(this);}});
}
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const output=new URL('../.ui-check-generated.mjs',import.meta.url);
const result=await build({
 entryPoints:['src/App.jsx'],bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',write:false,
 define:{'import.meta.env':JSON.stringify({
   VITE_FIREBASE_API_KEY:'fixture',VITE_FIREBASE_AUTH_DOMAIN:'example.invalid',
   VITE_FIREBASE_PROJECT_ID:'fixture',VITE_FIREBASE_APP_ID:'fixture',
 })},
 plugins:[{name:'firebase-fixture',setup(builder){
   builder.onResolve({filter:/firebaseBackend\.js$/},()=>({path:'fixture',namespace:'firebase-fixture'}));
   builder.onLoad({filter:/.*/,namespace:'firebase-fixture'},()=>({contents:'export const connectFirebase = () => window.firebaseFixture;'}));
 }}],
});
await writeFile(output,result.outputFiles[0].text);
let cloudData=makeTestCatalog(),revision=1,publishCatalog,publishEditor,publishManagement,publishHistory,publishReports;
let cloudHistory=[],cloudReports=[];
let failSave=false;
window.firebaseFixture={
 observeCatalog(receive){publishCatalog=receive;receive({data:publicCatalog(cloudData),revision});return ()=>{};},
 observeManagement(receive){publishManagement=receive;receive({data:cloudData,revision});return ()=>{};},
 observeHistory(receive){publishHistory=receive;receive(cloudHistory);return ()=>{};},
 observeReports(receive){publishReports=receive;receive(cloudReports);return ()=>{};},
 async submitReport(report){cloudReports=[{...report,id:'report-fixture',status:'new',createdAt:new Date().toISOString()},...cloudReports];publishReports?.(cloudReports);},
 async resolveReport(id,status,resolution){cloudReports=cloudReports.map(report=>report.id===id?{...report,status,resolution}:report);publishReports?.(cloudReports);},
 observeEditor(receive){publishEditor=receive;receive({status:'signedOut'});return ()=>{};},
 async login(email,password){
   if(password!=='fixture')throw Error('invalid credentials');
   publishEditor(email==='editor@example.invalid'?{status:'editor',email}:{status:'denied'});
 },
 async logout(){publishEditor({status:'signedOut'});},
 async getIdToken(){return 'fixture-editor-token';},
 async save(next,expectedRevision){
   assert.equal(expectedRevision,revision);
   if(failSave)throw Error('catalogConflict');
   cloudHistory=[{id:String(revision+1),revision:revision+1,actorEmail:'editor@example.invalid',createdAt:new Date().toISOString(),changes:catalogChanges(cloudData,next),snapshot:structuredClone(cloudData)},...cloudHistory];
   cloudData=next;revision++;
   publishCatalog({data:publicCatalog(cloudData),revision});
   publishManagement?.({data:cloudData,revision});publishHistory?.(cloudHistory);
 },
};
let root;let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
 const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client'),{default:App}=await import(output.href);
 root=createRoot(document.getElementById('root'));
 const render=()=>act(async()=>root.render(React.createElement(App)));
 const button=(text,scope=document)=>[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 const click=async el=>{assert.ok(el,'Clickable element exists');await act(async()=>el.click());};
 const input=async(el,value)=>{assert.ok(el,'Input exists');await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});};
 const select=async(el,value)=>{
   await click(el.querySelector('[role=combobox]')??el);
   await click(document.querySelector(`[role=listbox] [data-value="${value}"]`));
 };
 const goAdmin=async()=>act(async()=>{
   window.history.pushState(null,'','/admin');
   window.dispatchEvent(new dom.window.PopStateEvent('popstate'));
 });
 const submit=async form=>act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 await render();
 check(!!document.querySelector('.map-welcome[open]'),'First-time visitors see an introduction');
 const welcome=document.querySelector('.map-welcome');
 check(welcome.querySelectorAll('.welcome-pagination button').length===3,'The introduction has three slides');
 await click(welcome.querySelectorAll('.welcome-pagination button')[1]);
 check(welcome.dataset.slide==='search','The second slide explains search');
 await act(async()=>welcome.querySelector('h2').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
 check(welcome.dataset.slide==='route','The third slide explains directions and is reachable by keyboard');
 await act(async()=>{
   const start=new dom.window.Event('touchstart',{bubbles:true});
   const end=new dom.window.Event('touchend',{bubbles:true});
   Object.defineProperty(start,'touches',{value:[{clientX:150,clientY:250}]});
   Object.defineProperty(end,'changedTouches',{value:[{clientX:150,clientY:170}]});
   welcome.dispatchEvent(start);
   welcome.dispatchEvent(end);
 });
 check(welcome.classList.contains('is-leaving')&&welcome.open,'Swiping starts the transition before dismissing the dialog');
 // JSDOM does not run CSS animations, so dismissal uses its timeout fallback.
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,750));});
 check(!document.querySelector('.map-welcome'),'The introduction opens the already rendered map');
 check(gpsRequests===1&&document.querySelector('.card-distance').textContent==='0m'&&!gpsWatch,'Opening SafeMap automatically requests location once without continuous tracking');
 check(document.querySelectorAll('.place-card').length===11,'Community shows 11 sample places');
 check(document.querySelectorAll('.place-category-icon svg').length===11,'Every list item uses a category icon');
 check(document.querySelectorAll('.marker-pin>svg').length===11,'Every map marker uses an icon instead of a number');
 check(document.querySelectorAll('.archipelago-label').length===2,'Both archipelagos retain ordinary map text');
 check(!document.querySelector('.map-region-button'),'No island-navigation action remains');
 const mapPicker=document.querySelector('.map-style-control');
 check([...mapPicker.querySelectorAll('button')].map(b=>b.textContent).join(',')==='Tiêu chuẩn,Vệ tinh','The map picker contains only Standard and Satellite');
 await click(button('Vệ tinh',mapPicker));
 check(button('Vệ tinh',mapPicker).getAttribute('aria-pressed')==='true','The satellite option becomes active');
 await click(button('Tiêu chuẩn',mapPicker));
 await click(document.querySelector('.map-theme-toggle'));
 check(button('Tiêu chuẩn',mapPicker).getAttribute('aria-pressed')==='true'&&document.querySelector('.map-stage').dataset.mapStyle==='dark','Dark uses the Standard basemap');
 await click(document.querySelector('.map-theme-toggle'));
 check(!!document.querySelector('.map-credits-button svg'),'Source info icon uses an aligned SVG');
 const gestureViewport=document.querySelector('.map-rotation-viewport');
 const gesture=(points)=>act(async()=>{
   for(const [type,touches] of [
     ['touchstart',[[200,240],[300,240]]],
     ...points.map(pair=>['touchmove',pair]),
     ['touchend',[]],
   ]){
     const event=new window.Event(type,{bubbles:true,cancelable:true});
     Object.defineProperty(event,'touches',{value:touches.map(([clientX,clientY])=>({clientX,clientY}))});
     gestureViewport.dispatchEvent(event);
   }
 });
 await gesture([[[185,240],[315,244]],[[174,223],[326,258]]]);
 check(!document.querySelector('.map-north'),'A pinch keeps its zoom mode when the fingers turn slightly');
 await gesture([[[207,215],[293,265]],[[180,208],[320,273]]]);
 check(!!document.querySelector('.map-north'),'A deliberate twist locks to map rotation');
 await click(document.querySelector('.map-north'));

 check(document.querySelector('.custom-marker')?.getAttribute('aria-label')==='Công an Phường Mỹ An / An Thượng','Markers expose the actual place name to assistive technology');
 await input(document.querySelector('.public-toolbar input'),'phuoc thien');
 check(document.querySelectorAll('.place-card').length===1,'Live search works in React');
 await input(document.querySelector('.public-toolbar input'),'');
 // Exercise the mobile dock handlers in this simulated DOM; responsive visibility
 // and touch layout are checked separately in the real browser.
 const discoveryDock=document.querySelector('.mobile-discovery-dock');
 const dockButton=name=>[...discoveryDock.querySelectorAll('button')].find(item=>item.getAttribute('aria-label')===name);
 const mapBeforeDock=document.querySelector('.leaflet-map');
 check(discoveryDock.querySelectorAll('button').length===4,'The mobile discovery dock exposes all three groups and saved places');
 await input(document.querySelector('.public-toolbar input'),'khong-co-ket-qua');
 await click(button('Đang mở cửa',document.querySelector('.quick-place-filters')));
 await click(dockButton('GreenPoint'));
 check(document.querySelector('.map-workspace').dataset.scope==='green'&&document.querySelectorAll('.place-card').length===2&&document.querySelector('.public-toolbar input').value===''&&document.querySelector('.map-workspace').dataset.searchOpen==='false'&&document.querySelector('.map-workspace').classList.contains('sheet-expanded'),'A dock group clears stale query/open filters and opens its result list directly');
 await click(document.querySelector('.status-chips [data-status=alerts]'));
 await input(document.querySelector('.public-toolbar input'),'khong-co-ket-qua');
 await click(dockButton('SafePoint'));
 check(document.querySelectorAll('.place-card').length===6&&document.querySelector('.map-workspace').dataset.scope==='safe','Opening another dock group clears the previous hygiene filter and search');
 await click(dockButton('Đối tác xanh'));
 check(document.querySelectorAll('.place-card').length===3&&document.querySelector('.leaflet-map')===mapBeforeDock,'Group shortcuts keep the existing map renderer while changing results');
 await click(button('Khám phá',document.querySelector('.public-tabs')));
 await click(document.querySelector('.mobile-map-actions button'));
 check(document.querySelectorAll('.mobile-search-preview li').length===4,'Mobile search starts with four nearby suggestions');
 check(document.querySelectorAll('.search-preview-distance').length===4,'Nearby suggestions show distance even before GPS permission');
 await click(button('SafePoint',document.querySelector('.public-tabs')));
 check(document.querySelectorAll('.public-intro h1').length===1&&document.querySelector('.public-intro h1').textContent==='Điểm hỗ trợ cộng đồng','Changing groups replaces the hero heading');
 check(document.querySelectorAll('.place-card').length===6,'SafePoint screen groups all support categories');
 check(document.querySelectorAll('.mobile-search-preview li').length===4&&document.querySelector('.mobile-search-caption').textContent.includes('6'),'Filtered search previews four places and reports the full result count');
 await input(document.querySelector('.public-toolbar input'),'phuoc thien');
 await click(button('GreenPoint',document.querySelector('.public-tabs')));
 check(document.querySelector('.public-toolbar input').value==='phuoc thien'&&document.querySelectorAll('.place-card').length===0,'Switching groups keeps the search text and filters the new group');
 await click(button('SafePoint',document.querySelector('.public-tabs')));
 await click(button('Y tế',document.querySelector('.category-chips')));
 check(document.querySelector('.mobile-search-results').textContent.includes('Xem 1 kết quả'),'Search CTA describes the complete filtered result count');
 const mapBeforeSearchDetail=document.querySelector('.leaflet-map');
 await click(document.querySelector('.mobile-search-preview button'));
 check(!!document.querySelector('.place-details')&&document.querySelector('.map-workspace').dataset.searchOpen==='false','A search suggestion opens details and closes the search panel');
 await click(document.querySelector('.sheet-detail-bar button[aria-label="Quay lại tìm kiếm"]'));
 check(document.querySelector('.map-workspace').dataset.searchOpen==='true'&&!document.querySelector('.place-details')&&document.querySelector('.public-toolbar input').value==='phuoc thien'&&document.querySelector('.map-workspace').dataset.scope==='safe'&&document.querySelector('.leaflet-map')===mapBeforeSearchDetail,'Back from search details restores keyword, group and results without replacing the map');
 await click(document.querySelector('.mobile-search-results'));
 check(document.querySelector('.map-workspace.sheet-expanded')?.dataset.scope==='safe'&&document.querySelectorAll('.place-card').length===1&&document.querySelector('.public-toolbar input').value==='phuoc thien','Show all opens the full list with the active scope, category and search');
 await click(document.querySelector('.mobile-map-actions button'));
 await click(document.querySelector('.mobile-clear-filters'));
 check(document.querySelector('.map-workspace').dataset.scope==='map'&&document.querySelector('.public-toolbar input').value==='phuoc thien'&&document.querySelectorAll('.place-card').length===1&&!document.querySelector('.mobile-clear-filters'),'Clear filters removes group/category constraints while preserving the keyword');
 await click(document.querySelector('.mobile-map-actions button'));
 check(document.querySelector('.map-workspace').classList.contains('sheet-expanded'),'Closing search opened from results returns to the list');
 await click(document.querySelector('.sheet-filter-button'));
 check(document.querySelector('.map-workspace').dataset.searchOpen==='true'&&document.activeElement!==document.querySelector('.public-toolbar input'),'The filter entry opens search refinements without focusing the keyboard');
 await click(document.querySelector('.mobile-map-actions button'));
 await click(button('SafePoint',document.querySelector('.public-tabs')));
 await click(button('Y tế',document.querySelector('.category-chips')));
 await input(document.querySelector('.public-toolbar input'),'');
 check(document.querySelectorAll('.place-card').length===2,'SafePoint category chips filter the public list');
 await click(button('Tất cả',document.querySelector('.category-chips')));
 await click(button('GreenPoint',document.querySelector('.public-tabs')));
 check(document.querySelectorAll('.place-card').length===2,'GreenPoint screen has two points');
 await click(document.querySelector('.status-chips [data-status=alerts]'));
 check(document.querySelectorAll('.place-card').length===1,'Green alert filter works');
 await click(button('Đối tác xanh',document.querySelector('.public-tabs')));
 check(document.querySelectorAll('.place-card').length===3,'Partner screen includes the service category');
 await click(document.querySelector('.place-card'));
 check(!!document.querySelector('.place-details h2'),'Selecting a card opens details');
 check(document.querySelector('.detail-metadata')?.open===false,'Technical metadata is collapsed by default');
 check(document.querySelectorAll('.place-card').length===3&&!!document.querySelector('.place-card img'),'Place details preserve the list and its thumbnails');
 check(document.querySelector('.detail-info').textContent.includes('Số minh họa')&&!document.querySelector('.route-entry a[href^="tel:"]'),'Sample numbers are labeled and do not initiate calls');
 check(!document.querySelector('.leaflet-popup'),'Details are not duplicated in a map popup');
 check(document.querySelector('.detail-buttons a').href.includes('destination='),'Details provide coordinate directions');
 await click(button('Lưu địa điểm',document.querySelector('.place-utility-actions')));
 check(JSON.parse(localStorage.getItem('safemap-saved')).length===1&&button('Bỏ lưu',document.querySelector('.place-utility-actions')),'Saving a place persists locally without requiring login');
 await click(button('Chia sẻ',document.querySelector('.place-utility-actions')));
 check(document.querySelector('.share-place-modal input').value.includes('?place='),'Share exposes a deep link to the selected place');
 await click(document.querySelector('.share-place-modal .modal-header button'));
 check(Boolean(document.querySelector('.place-details > .place-utility-actions + .place-gallery')),'Save and Share are directly before photos so primary utilities are discoverable');
 await click(button('Báo thông tin chưa đúng',document.querySelector('.place-details')));
 await submit(document.querySelector('dialog form'));
 check(cloudReports.length===1&&document.querySelector('dialog [role=status]').textContent.includes('Đã gửi'),'Visitors can submit a report without changing the place');
 await click(document.querySelector('dialog .modal-header button'));

 const savedPlaceName=document.querySelector('.place-details h2').textContent;
 const mapBeforeSaved=document.querySelector('.leaflet-map');
 await input(document.querySelector('.public-toolbar input'),'khong-co-ket-qua');
 await click(dockButton('Đã lưu'));
 check(document.querySelectorAll('.place-card').length===1&&document.querySelector('.place-card h3').textContent===savedPlaceName&&document.querySelector('.map-workspace').dataset.scope==='map'&&document.querySelector('.public-toolbar input').value==='','Saved shortcut clears stale search and opens only the saved result');
 await click(document.querySelector('.place-card'));
 check(document.querySelector('.place-details h2').textContent===savedPlaceName&&document.querySelector('.leaflet-map')===mapBeforeSaved,'Selecting a saved result opens details without replacing the map DOM');

 const thumbnails=document.querySelectorAll('.place-gallery-slide img');
 await click(thumbnails[0].closest('button'));
 const photo=()=>document.querySelector('.photo-viewer img')?.src;
 check(photo()===thumbnails[0].src,'Tapping the gallery opens the selected full-size photo');
 await click(document.querySelector('.photo-viewer button.next'));
 check(photo()===thumbnails[1].src,'The enlarged viewer advances to the next photo');
 await click(document.querySelector('.photo-modal .modal-header button'));
 await act(async()=>thumbnails[0].dispatchEvent(new dom.window.Event('error')));
 check(thumbnails[0].hidden&&thumbnails[0].parentElement.dataset.failed==='true'&&thumbnails[0].parentElement.textContent.includes('Không tải được ảnh'),'A failed gallery photo explains the error instead of leaving an empty tile');
 await act(async()=>thumbnails[0].dispatchEvent(new dom.window.Event('load')));
 check(!thumbnails[0].hidden&&!thumbnails[0].parentElement.dataset.failed,'A recovered gallery photo removes the fallback');

 check(!photo(),'Closing the viewer returns to the same place details');
 const originalFetch=globalThis.fetch;
 const routeRequests=[];
 const destination=[108.243,16.0512];
 let routeUnavailable=false;
 globalThis.fetch=async (url,options)=>{
   const link=new URL(url);
   let origin, mode;
   if(link.hostname==='valhalla1.openstreetmap.de'){
     const {locations,costing}=JSON.parse(link.searchParams.get('json'));
     origin=[locations[0].lon,locations[0].lat];
     mode=costing;
   }else if(link.hostname==='routing.openstreetmap.de'){
     mode=link.pathname.split('/')[1];
     origin=link.pathname.split('/').at(-1).split(';')[0].split(',').map(Number);
   }else return originalFetch(url,options);
   routeRequests.push({origin,mode});
   if(routeUnavailable)return new Response('{}',{status:503});
   return new Response(JSON.stringify({code:'Ok',routes:[{
     distance:220,duration:60,
     geometry:{type:'LineString',coordinates:Array.from({length:241},(_,index)=>
       origin.map((value,axis)=>value+(destination[axis]-value)*index/240))},
     legs:[{steps:[{name:'Đường An Thượng 1',distance:75,maneuver:{type:'depart'}},{distance:145,maneuver:{type:'turn',modifier:'left'}},{distance:0,maneuver:{type:'arrive'}}]}],
   }]}));
 };
 await click(button('Chỉ đường trên bản đồ'));
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,25));});
 check(routeRequests.length===1&&routeRequests[0].mode==='motor_scooter'&&!gpsWatch,'One click finds a motorbike route without starting continuous GPS');
 const beforeLanguageChange=document.querySelector('.leaflet-map');
 const islandLabel=document.querySelector('.archipelago-name');
 await click(document.querySelector('.language-switch button[lang="en"]'));
 check(document.documentElement.lang==='en'&&document.querySelector('.route-step-text').textContent.includes('An Thượng 1 Street'),'English localizes the road in the open route');
 check(![...document.querySelectorAll('.marker-pin .sr-only')].some(label=>label.textContent==='Công an'),'Map marker categories also switch to English');
 check(document.querySelector('.leaflet-map')===beforeLanguageChange&&routeRequests.length===1,'Changing language keeps the map and route in place');
 check(islandLabel.textContent==='Hoang Sa Archipelago'&&document.querySelector('.leaflet-control-zoom-in').title==='Zoom in','Map overlays and controls switch in place');
 await click(document.querySelector('.language-switch button[lang="vi"]'));
 await click(button('Bắt đầu dẫn đường'));
 check(typeof gpsWatch==='function','Starting navigation subscribes to GPS');
 check(!button('Tổng quan',document.querySelector('.route-guide')),'Navigation has no overview action');
 check(!document.querySelector('.route-trip-follow'),'The trip card has no duplicate follow button');
 check(document.querySelector('.route-guide-icon svg').getAttribute('class')===document.querySelector('.detail-category-icon svg').getAttribute('class'),'The destination uses the place category icon');
 await click(document.querySelector('.map-fabs button'));
 const resumeButton=()=>document.querySelector('.map-fabs button[aria-label="Vị trí của tôi"]');
 check(resumeButton()?.getAttribute('aria-pressed')==='false'&&gpsWatch,'Panning away pauses the camera and the existing location button offers follow');
 await click(resumeButton());
 check(resumeButton()?.getAttribute('aria-pressed')==='true','The existing location button resumes camera tracking');
 const mapSurface=document.querySelector('.leaflet-map');
 const touchMap=async(type,touches)=>act(async()=>{
   const event=new dom.window.Event(type,{bubbles:true,cancelable:true});
   Object.defineProperty(event,'touches',{value:touches});
   mapSurface.dispatchEvent(event);
 });
 await touchMap('touchstart',[{clientX:140,clientY:200},{clientX:240,clientY:200}]);
 await touchMap('touchmove',[{clientX:190,clientY:150},{clientX:190,clientY:250}]);
 await touchMap('touchend',[]);
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40));});
 const compass=document.querySelector('.map-north');
 check(compass&&resumeButton()?.getAttribute('aria-pressed')==='false'&&gpsWatch,'A two-finger rotation shows north and pauses camera follow without stopping GPS');
 check(!document.querySelector('.map-rotation-viewport .leaflet-control-zoom'),'Zoom controls stay outside the rotating viewport');
 const rotatedViewport=document.querySelector('.map-rotation-viewport');
 check(Math.abs(parseFloat(rotatedViewport.style.getPropertyValue('--map-bearing'))+
   parseFloat(rotatedViewport.style.getPropertyValue('--map-upright')))<.001 &&
   !!rotatedViewport.querySelector('.marker-upright'),'Markers counter-rotate around their map anchor');
 await click(compass);
 check(!document.querySelector('.map-north'),'The north control restores the original orientation');
 await click(resumeButton());
 const move=(latitude,longitude,accuracy=10)=>act(async()=>gpsWatch({coords:{latitude,longitude,accuracy}}));
 const line=document.querySelector('.navigation-line');
 const fullLine=line.getAttribute('d');
 const remaining=()=>document.querySelector('.route-remaining-distance')?.textContent;
 await move(NaN,108.242);
 check(gpsWatch&&line.getAttribute('d')===fullLine,'An invalid GPS fix keeps the active route and watcher intact');
 await move(16.0512,108.242);
 const firstFrame=line.getAttribute('d');
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,180));});
 const intermediateFrame=line.getAttribute('d');
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,850));});
 check(remaining()==='110m'&&line===document.querySelector('.navigation-line')&&intermediateFrame!==firstFrame&&line.getAttribute('d')!==intermediateFrame&&line.getAttribute('d')!==fullLine,'The existing blue line moves through an intermediate frame before reaching the GPS position');
 await move(16.0512,108.2418);
 check(remaining()==='110m','A slightly backward GPS fix cannot restore traveled distance');
 check(document.querySelector('.route-step-text').textContent.includes('Rẽ trái'),'Movement along the route advances the instruction');
 await act(async()=>gpsWatchError({code:1}));
 check(!gpsWatch&&document.querySelector('.route-live-status').textContent.includes('quyền vị trí'),'Revoking location permission stops the watcher and explains the problem');
 await click(resumeButton());
 check(typeof gpsWatch==='function'&&remaining()==='110m','The existing location button restarts GPS without restoring traveled distance');
 await move(16.0522,108.242,90);
 await move(16.0522,108.242);
 check(routeRequests.length===1&&remaining()==='110m','Poor GPS and a single deviation preserve the remaining route');
 await move(16.0523,108.242);
 check(routeRequests.length===2&&routeRequests[1].origin[1]===16.0523,'A confirmed deviation requests a new route from the current GPS fix');
 await move(destination[1],destination[0]);
 check(!gpsWatch&&remaining()==='0m'&&document.querySelector('.route-trip-bottom').textContent.includes('Bạn đã đến nơi'),'Arrival stops continuous GPS and clears the remaining distance');
 await click(button('Thoát chỉ đường'));
 check(!document.querySelector('.route-guide'),'Exiting navigation removes the route guide');
 await click(button('Chỉ đường trên bản đồ'));
 const waitForRoute=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,1150));});
 await waitForRoute();
 await click(document.querySelector('.route-mode-trigger'));
 await click(button('Đi bộ',document.querySelector('.route-mode-options')));
 await waitForRoute();
 check(routeRequests.at(-1).mode==='routed-foot'&&document.querySelector('.route-mode-trigger').textContent.trim()==='Đi bộ'&&!gpsWatch,'Changing transport recalculates the preview without starting GPS tracking');
 await click(button('Thoát chỉ đường'));
 gpsDenied=true;
 gpsPermission.state='denied';
 await act(async()=>gpsPermission.dispatchEvent(new dom.window.Event('change')));
 await click(button('Chỉ đường trên bản đồ'));
 check(!!document.querySelector('.route-pick-notice'),'If GPS is denied, the map offers a starting point');
 await act(async()=>document.querySelector('.leaflet-map').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,clientX:430,clientY:310})));
 await waitForRoute();
 check(!!document.querySelector('.route-mode-trigger')&&routeRequests.at(-1).mode==='motor_scooter','Picking a starting point immediately previews a motorbike route');
 routeUnavailable=true;
 await click(document.querySelector('.route-mode-trigger'));
 await click(button('Đi bộ',document.querySelector('.route-mode-options')));
 await waitForRoute();
 check(document.querySelector('.route-request-status a')?.href.startsWith('https://www.google.com/maps/dir/'),'Routing errors offer a Google Maps fallback without leaving the guide');
 await click(document.querySelector('.route-request-status button[aria-label="Thoát chỉ đường"]'));
 gpsDenied=false;
 globalThis.fetch=originalFetch;

 check(!button('Quản trị',document.querySelector('.site-header')),'The public header contains no Admin link');
 await goAdmin();
 check(!!document.querySelector('.login-form'),'Admin opens Firebase login');
 await input(document.querySelector('input[type=email]'),'wrong@example.com');
 await input(document.querySelector('input[type=password]'),'wrong');
 await submit(document.querySelector('.login-form'));
 check(!!document.querySelector('.form-error'),'Incorrect credentials show an error');
 await input(document.querySelector('input[type=email]'),'viewer@example.invalid');
 await input(document.querySelector('input[type=password]'),'fixture');
 await submit(document.querySelector('.login-form'));
 check(!!document.querySelector('.login-form [role=alert]')&&!document.querySelector('.admin-layout'),'An account without editor access stays outside Admin');
 await input(document.querySelector('input[type=email]'),'editor@example.invalid');
 await submit(document.querySelector('.login-form'));
 check(document.querySelectorAll('.stat-card').length===4,'Firebase editor login opens dashboard');
 check([...document.querySelectorAll('.admin-sidebar nav [data-section]')].map(button=>button.dataset.section).join(',')==='overview,places,safe,green,partner,categories,operations','The admin sidebar exposes all three groups separately');
 check([...document.querySelectorAll('.stat-card>strong')].map(x=>x.textContent).join(',')==='11,06,02,03','Dashboard uses shared data');
 const overviewShortcut=name=>[...document.querySelectorAll('.admin-tool-shortcuts button')].find(item=>item.querySelector('strong')?.textContent===name);
 check(document.querySelectorAll('.admin-tool-shortcuts button').length===4,'Overview exposes the four data tools as labelled shortcuts');
 for(const name of ['Chất lượng dữ liệu','Thông tin cần kiểm tra','Lịch sử thay đổi','Thùng rác']){
   await click(overviewShortcut(name));
   check(document.querySelector('.admin-sidebar [data-section=operations]').getAttribute('aria-current')==='page'&&document.querySelector('.operations-tabs button[aria-pressed=true]')?.textContent===name,'Overview shortcut opens its exact data-tool tab: '+name);
   await click(document.querySelector('.admin-sidebar [data-section=overview]'));
 }
 await click(overviewShortcut('Thông tin cần kiểm tra'));
 await click(button('Lịch sử thay đổi',document.querySelector('.operations-tabs')));
 await click(document.querySelector('.admin-sidebar [data-section=places]'));
 await click(document.querySelector('.admin-sidebar [data-section=operations]'));
 check(document.querySelector('.operations-tabs button[aria-pressed=true]')?.textContent==='Lịch sử thay đổi','Returning to data tools preserves the last selected subtab');
 await click(document.querySelector('.admin-sidebar [data-section=overview]'));
 await click(document.querySelector('.stat-1'));
 check(document.querySelectorAll('tbody tr').length===6,'The SafePoint metric opens only SafePoint places');
 await click([...document.querySelectorAll('.admin-sidebar nav button')].find(b=>b.textContent==='Địa điểm'));
 check(document.querySelectorAll('tbody tr').length===7,'Admin table paginates');
 await click(document.querySelector('.admin-place-name'));
 check(document.querySelectorAll('.admin-map-canvas .custom-marker').length===11&&!!document.querySelector('.admin-preview-content')&&document.querySelectorAll('tbody tr').length===7,'Admin shows all filtered pins alongside the table and opens the selected place sheet');
 const selectedName=document.querySelector('.admin-preview-content h3').textContent;
 const hoveredRow=document.querySelectorAll('tbody tr')[1];
 const hoveredName=hoveredRow.querySelector('.admin-place-name').textContent;
 await act(async()=>hoveredRow.dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'})));
 const brightPins=document.querySelectorAll('.admin-map-canvas .custom-marker:not(.is-admin-dimmed)');
 check(brightPins.length===1&&brightPins[0].getAttribute('aria-label')===hoveredName&&document.querySelector('.admin-preview-content h3').textContent===selectedName,'Hover highlights the matching pin without switching the open place details');
 await act(async()=>hoveredRow.dispatchEvent(new window.PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'})));
 check(!document.querySelector('.admin-map-canvas .is-admin-dimmed'),'Leaving the row restores all marker opacities');
 const previewCard=document.querySelector('.admin-preview-content');
 const adminMap=document.querySelector('.admin-map-canvas');
 const photoGallery=previewCard.querySelector('.place-gallery');
 check(document.querySelectorAll('.admin-places-list thead th').length===3&&!document.querySelector('.admin-places-list .table-actions'),'The places table leaves actions inside the details card');
 await click(previewCard.querySelector('.admin-preview-actions .primary'));
 const inlineName=previewCard.querySelector('input[name=name]');
 check(!!inlineName&&!document.querySelector('dialog')&&adminMap.isConnected&&photoGallery?.isConnected,'Edit retains the map, details card and photo gallery');
 await input(inlineName,selectedName+' - bản nháp');
 await click(button('Hủy',previewCard));
 check(previewCard.querySelector('h3').textContent===selectedName&&!cloudData.places.some(place=>place.name.endsWith(' - bản nháp')),'Cancel discards the draft without closing the details card');
 const reviewPlaceId=cloudData.places.find(place=>place.name===selectedName).id;
 await act(async()=>{
   cloudData={...cloudData,places:cloudData.places.map(place=>place.id===reviewPlaceId?{...place,review:{status:'verified',reviewedAt:new Date().toISOString()}}:place)};
   publishCatalog({data:publicCatalog(cloudData),revision});publishManagement({data:cloudData,revision});
 });
 const verification=()=>previewCard.querySelector('.verification-editor input[type=checkbox]');
 await click(previewCard.querySelector('.admin-preview-actions .primary'));
 check(verification().checked,'Opening a verified place preserves its verification until a substantive edit');
 await select(previewCard.querySelectorAll('.admin-preview-classification .form-dropdown')[1],'health');
 check(!verification().checked,'Changing category returns a verified place to pending review');
 await click(button('Hủy',previewCard));
 await click(previewCard.querySelector('.admin-preview-actions .primary'));
 await select(previewCard.querySelectorAll('.admin-preview-classification .form-dropdown')[0],'green');
 check(!verification().checked,'Changing group returns a verified place to pending review');
 await click(button('Hủy',previewCard));
 await click(previewCard.querySelector('.admin-preview-actions .primary'));
 const coordinateDetails=previewCard.querySelector('.admin-preview-metadata');
 await act(async()=>{coordinateDetails.open=true;coordinateDetails.dispatchEvent(new window.Event('toggle'));});
 const latitudeBefore=previewCard.querySelector('input[type=number]').value;
 await act(async()=>previewCard.querySelector('.coordinate-map').dispatchEvent(new window.MouseEvent('click',{bubbles:true,clientX:430,clientY:310})));
 check(previewCard.querySelector('input[type=number]').value!==latitudeBefore&&!verification().checked,'Moving a verified place through the map picker invalidates verification');
 await click(button('Hủy',previewCard));
 await click(previewCard.querySelector('.admin-preview-actions .primary'));
 await input(previewCard.querySelector('input[name=name]'),selectedName+' - đã cập nhật');
 await submit(previewCard);
 check(previewCard.isConnected&&previewCard.querySelector('h3').textContent===selectedName+' - đã cập nhật'&&cloudData.places.some(place=>place.name.endsWith(' - đã cập nhật')),'Saving publishes the edit in the same card');
 await click(document.querySelector('.admin-sheet-heading button'));
 check(!document.querySelector('.admin-preview-content')&&!!document.querySelector('.admin-map-canvas'),'Closing place details returns to the map');
 await click(button('Thêm địa điểm'));
 const form=document.querySelector('dialog form');
 check(!!form&&!!document.querySelector('.coordinate-map'),'Add form includes map picker');
 const field=name=>form.elements.namedItem(name);
 await input(field('name'),'Điểm test React');
 await input(field('address'),'An Thượng test');
 await input(field('nameEn'),'React Test Location');
 await input(field('addressEn'),'An Thượng test address');
 await input(field('opensAt'),'20:00');
 await submit(form);
 check(!!form.querySelector('[role=alert]'),'An opening time requires a closing time');
 await input(field('closesAt'),'02:00');
 const photos=['https://example.com/first.jpg','https://example.com/second.jpg'];
 const extraFields=()=>[...form.querySelectorAll('.extra-image-row input')];
 await click(button('Thêm ảnh phụ',form));
 await input(extraFields()[0],photos[0]);
 await click(button('Thêm ảnh phụ',form));
 await input(extraFields()[1],photos[0]);
 await submit(form);
 check(extraFields()[1].getAttribute('aria-invalid')==='true'&&form.isConnected,'Duplicate gallery links are marked on the conflicting row and prevent saving');
 await input(extraFields()[1],photos[1]);
 await click(button('Thêm ảnh phụ',form));
 await input(extraFields()[2],'https://example.com/removed.jpg');
 await click(form.querySelectorAll('.extra-image-remove')[2]);
 await submit(form);
 check(cloudData.places.find(p=>p.name==='Điểm test React')?.images.join(',')===photos.join(','),'Gallery saves the remaining URLs in the order shown');
 check(cloudData.places.some(p=>p.name==='Điểm test React'&&p.opensAt==='20:00'&&p.closesAt==='02:00'),'Creating a place persists separate opening and closing times');
 check(cloudData.places.some(p=>p.nameEn==='React Test Location'&&p.addressEn==='An Thượng test address'),'Optional English place details persist with the original fields');
 check(!document.querySelector('dialog'),'Successful save closes the form');
 await input(document.querySelector('.table-toolbar input'),'Điểm test React');
 check(document.querySelectorAll('tbody tr').length===1,'Admin live search finds created record');
 await click(document.querySelector('.admin-place-name'));
 const editForm=document.querySelector('.admin-preview-content');
 await click(button('Chỉnh sửa',editForm));
 await input(editForm.elements.namedItem('name'),'Điểm test đã sửa');
 await submit(editForm);
 check(cloudData.places.some(p=>p.name==='Điểm test đã sửa'),'Editing persists changes');
 await input(document.querySelector('.table-toolbar input'),'Điểm test đã sửa');
 await click(button('Xóa',editForm));
 check(!!document.querySelector('.delete-content'),'Delete requires confirmation');
 await click(button('Xóa',document.querySelector('dialog')));
 check(!cloudData.places.some(p=>p.name==='Điểm test đã sửa'&&!p.deletedAt),'Confirmed delete persists');
 await click([...document.querySelectorAll('.admin-sidebar nav button')].find(b=>b.textContent==='Danh mục'));
 check(document.querySelectorAll('.category-card').length===7,'Category management renders');
 check(document.querySelectorAll('.category-group-panel').length===3,'Categories are grouped under the three primary groups');
 await click(document.querySelector('.category-card .danger-text'));
 check(document.querySelector('.toast').textContent.includes('đang có địa điểm'),'In-use category deletion is blocked');
 await click(document.querySelector('.language-switch button[lang="en"]'));
 check(document.documentElement.lang==='en'&&document.querySelector('.admin-heading h1').textContent==='Manage categories','English updates the dashboard');
 await click(document.querySelector('.header-logout'));
 check(window.location.pathname==='/admin'&&!!document.querySelector('.login-form'),'Sign-out stays on the admin route');
 await click(document.querySelector('.login-form-area > button'));
 check(window.location.pathname==='/'&&!!document.querySelector('.public-tabs'),'The community link returns to the map');
 check(!document.querySelector('.map-welcome'),'Switching views does not reopen the introduction');
 await act(async()=>root.unmount());
 gpsPermission.state='granted';
 const requestsBeforeReload=gpsRequests;
 root=createRoot(document.getElementById('root'));
 await render();
 check(document.documentElement.lang==='en','Language selection survives a reload');
 check(!!document.querySelector('.map-welcome[open]'),'Reloading reopens the introduction');
 check(gpsRequests===requestsBeforeReload+1&&document.querySelector('.card-distance').textContent==='0m','Reload requests location once when permission is already granted');
 const reloadedWelcome=document.querySelector('.map-welcome');
 await act(async()=>reloadedWelcome.dispatchEvent(new dom.window.WheelEvent('wheel',{bubbles:true,deltaY:80})));
 check(reloadedWelcome.classList.contains('is-leaving'),'Scrolling down starts the transition on desktop');

 await goAdmin();
 await click(document.querySelector('.language-switch button[lang="vi"]'));
 await input(document.querySelector('input[type=email]'),'editor@example.invalid');
 await input(document.querySelector('input[type=password]'),'fixture');
 await submit(document.querySelector('.login-form'));
 const actualFetch=globalThis.fetch;
 let trafficResponse=new Response('<html></html>',{headers:{'Content-Type':'text/html'}});
 globalThis.fetch=(url,options)=>{
   if(url!=='/api/traffic')return actualFetch(url,options);
   assert.equal(options.headers.Authorization,'Bearer fixture-editor-token');
   return Promise.resolve(trafficResponse);
 };
 try {
   await click(button('Lượt truy cập'));
   check(document.querySelector('.traffic-message').textContent.includes('chưa có dịch vụ báo cáo'),'Traffic identifies the local SPA fallback as a missing endpoint');
   trafficResponse=Response.json({error:'setup'},{status:503});
   await click(button('Làm mới'));
   check(document.querySelector('.traffic-message').textContent.includes('ID thuộc tính GA4'),'Traffic identifies missing server reporting configuration');
   trafficResponse=Response.json({views:12,users:8,days:[{date:'20261355',views:12}]});
   await click(button('Làm mới'));
   check(!!document.querySelector('.traffic-message')&&!document.querySelector('.traffic-bars'),'Malformed reporting dates show a recoverable error instead of crashing Admin');
   trafficResponse=Response.json({views:12,users:8,days:[{date:'20261108',views:12}]});
   await click(button('Làm mới'));
   check(document.querySelector('.traffic-bars li time').dateTime==='2026-11-08'&&document.querySelector('.traffic-metrics strong').textContent==='12','Traffic retry renders the reporting response');
 } finally {
   globalThis.fetch=actualFetch;
 }
 await click(button('Thêm địa điểm'));
 const cloudForm=document.querySelector('dialog form');
 await input(cloudForm.querySelector('input[required]'),'Điểm được đồng bộ');
 await input(cloudForm.elements.namedItem('address'),'An Thượng');
 failSave=true;
 await submit(cloudForm);
 check(!!cloudForm.querySelector('[role=alert]')&&cloudForm.isConnected,'A rejected cloud save keeps the form open with an error');
 failSave=false;
 await submit(cloudForm);
 check(!cloudForm.isConnected&&localStorage.getItem('safemap-react-v2')===null,'An accepted Firebase save closes the form without writing a local catalog');
 await click(document.querySelector('.admin-sidebar [data-section=operations]'));
 check(document.querySelectorAll('.operation-record').length>0,'Data tools list actionable quality issues');
 await click(button('Thùng rác',document.querySelector('.operations-tabs')));
 check(document.querySelector('.operation-record').textContent.includes('Điểm test đã sửa'),'Soft-deleted points remain in the private trash');
 await click(button('Khôi phục ở trạng thái ẩn',document.querySelector('.operation-record')));
 check(cloudData.places.some(point=>point.name==='Điểm test đã sửa'&&!point.deletedAt&&point.visibility==='hidden'),'Restoring trash keeps a place hidden for review');
 await click(button('Lịch sử thay đổi',document.querySelector('.operations-tabs')));
 check(document.querySelectorAll('.history-record').length===cloudHistory.length&&cloudHistory.length>0,'Every catalog write is available in change history');
 const oldVersion=document.querySelector('.history-record button');
 await click(oldVersion);
 check(!!document.querySelector('dialog')&&document.querySelector('dialog').textContent.includes('khôi phục'),'History restore requires explicit confirmation');
 await click(document.querySelector('dialog .modal-header button'));
 await click(button('Thông tin cần kiểm tra',document.querySelector('.operations-tabs')));
 check(document.querySelectorAll('.report-record').length===1,'Visitor reports reach the editor inbox');
 await click(button('Đánh dấu đã xử lý',document.querySelector('.report-record')));
 check(cloudReports[0].status==='resolved','Editors can resolve a report independently of catalog edits');
 await act(async()=>{
   cloudReports=cloudReports.map(report=>({...report,resolution:'Đã kiểm tra và cập nhật số điện thoại.'}));
   publishReports(cloudReports);
 });
 await click(button('Mở lại',document.querySelector('.report-record')));
 check(cloudReports[0].status==='new'&&cloudReports[0].resolution==='Đã kiểm tra và cập nhật số điện thoại.','Reopening a report preserves its existing resolution when no replacement note was entered');
 await click(button('Nhập Excel',document.querySelector('.admin-heading-actions')));
 check(!!document.querySelector('.import-modal')&&document.querySelector('.import-modal input[type=file]'),'Excel import starts with an explicit file chooser and preview');
 await click(document.querySelector('.import-modal .modal-header button'));
 await click(document.querySelector('.header-logout'));
 await click(document.querySelector('.login-form-area > button'));
 check([...document.querySelectorAll('.place-card h3')].some(heading=>heading.textContent==='Điểm được đồng bộ'),'The cloud update appears on the public map after sign-out');
 console.log(`PASS: ${checks} React DOM integration checks. No visual/layout assertions were performed.`);
}finally{
 if(root){const {act}=await import('react');await act(async()=>root.unmount());}
 dom.window.close();await unlink(output).catch(()=>{});
}
