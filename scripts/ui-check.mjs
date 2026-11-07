// Component integration checks in a simulated DOM, not a visual browser test.
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
let gpsDenied=false;
Object.defineProperties(navigator,{
 permissions:{value:{query:async()=>gpsPermission}},
 geolocation:{value:{getCurrentPosition(success,error){
   gpsRequests++;
   if(gpsDenied){error({code:1});return;}
   success({coords:{latitude:16.0512,longitude:108.241}});
 },watchPosition(success){
   gpsWatch=success;
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
const result=await build({entryPoints:['src/App.jsx'],bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',write:false});
await writeFile(output,result.outputFiles[0].text);
let root;let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
 const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client'),{default:App}=await import(output.href);
 root=createRoot(document.getElementById('root'));
 const render=()=>act(async()=>root.render(React.createElement(App)));
 const button=(text,scope=document)=>[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 const click=async el=>{assert.ok(el,'Clickable element exists');await act(async()=>el.click());};
 const input=async(el,value)=>{assert.ok(el,'Input exists');await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});};
 const select=async(el,value)=>{await act(async()=>{el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});};
 const submit=async form=>act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 await render();
 check(!!document.querySelector('.map-welcome[open]'),'First-time visitors see an introduction');
 const welcome=document.querySelector('.map-welcome');
 check(!welcome.querySelector('button'),'The introduction uses gesture instructions without buttons');
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
 check(gpsRequests===0,'Opening SafeMap does not prompt for location automatically');
 check(document.querySelectorAll('.place-card').length===11,'Community shows 11 sample places');
 check(document.querySelectorAll('.place-category-icon svg').length===11,'Every list item uses a category icon');
 check(document.querySelectorAll('.marker-pin>svg').length===11,'Every map marker uses an icon instead of a number');
 check(document.querySelectorAll('.archipelago-label').length===2,'Both archipelagos retain ordinary map text');
 check(!document.querySelector('.map-region-button'),'No island-navigation action remains');
 check([...document.querySelectorAll('.map-style-control button')].map(b=>b.textContent).join(',')==='Bản đồ,Tối giản,Vệ tinh','All three map modes are available');
 check(!!document.querySelector('.map-credits-button svg'),'Source info icon uses an aligned SVG');
 check(document.querySelector('.custom-marker')?.getAttribute('aria-label')==='Công an Phường Mỹ An / An Thượng','Markers expose the actual place name to assistive technology');
 await input(document.querySelector('.public-toolbar input'),'phuoc thien');
 check(document.querySelectorAll('.place-card').length===1,'Live search works in React');
 await input(document.querySelector('.public-toolbar input'),'');
 await click(button('SafePoint',document.querySelector('.public-tabs')));
 check(document.querySelectorAll('.public-intro h1').length===1&&document.querySelector('.public-intro h1').textContent==='Điểm hỗ trợ cộng đồng','Changing groups replaces the hero heading');
 check(document.querySelectorAll('.place-card').length===6,'SafePoint screen groups all support categories');
 await click(button('GreenPoint',document.querySelector('.public-tabs')));
 check(document.querySelectorAll('.place-card').length===2,'GreenPoint screen has two points');
 await select(document.querySelector('.public-status'),'alerts');
 check(document.querySelectorAll('.place-card').length===1,'Green alert filter works');
 await click(button('Đối tác xanh',document.querySelector('.public-tabs')));
 check(document.querySelectorAll('.place-card').length===2,'Partner screen has two records');
 await click(document.querySelector('.place-card'));
 check(!!document.querySelector('.place-details h2'),'Selecting a card opens details');
 check(document.querySelector('.detail-metadata')?.open===false,'Technical metadata is collapsed by default');
 check(document.querySelectorAll('.place-card').length===2&&!!document.querySelector('.place-card img'),'Place details preserve the list and its thumbnails');
 check(document.querySelector('.detail-info').textContent.includes('Số minh họa')&&!document.querySelector('.route-entry a[href^="tel:"]'),'Sample numbers are labeled and do not initiate calls');
 check(!document.querySelector('.leaflet-popup'),'Details are not duplicated in a map popup');
 check(document.querySelector('.detail-buttons a').href.includes('destination='),'Details provide coordinate directions');
 const thumbnails=document.querySelectorAll('.place-gallery-slide img');
 await click(thumbnails[0].closest('button'));
 const photo=()=>document.querySelector('.photo-viewer img')?.src;
 check(photo()===thumbnails[0].src,'Tapping the gallery opens the selected full-size photo');
 await click(document.querySelector('.photo-viewer button.next'));
 check(photo()===thumbnails[1].src,'The enlarged viewer advances to the next photo');
 await click(document.querySelector('.photo-modal .modal-header button'));
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
     geometry:{type:'LineString',coordinates:[origin,destination]},
     legs:[{steps:[{distance:75,maneuver:{type:'depart'}},{distance:145,maneuver:{type:'turn',modifier:'left'}},{distance:0,maneuver:{type:'arrive'}}]}],
   }]}));
 };
 await click(button('Chỉ đường trên bản đồ'));
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,25));});
 check(routeRequests.length===1&&routeRequests[0].mode==='motor_scooter'&&!gpsWatch,'One click finds a motorbike route without starting continuous GPS');
 await click(button('Bắt đầu dẫn đường'));
 check(typeof gpsWatch==='function','Starting navigation subscribes to GPS');
 await click(document.querySelector('.map-fabs button'));
 const resumeButton=()=>document.querySelector('.route-guide-step button[aria-label="Bám lại vị trí"]');
 check(resumeButton()&&gpsWatch,'Panning away through the map controls pauses the camera while GPS stays active');
 await click(resumeButton());
 check(!resumeButton(),'The follow control resumes camera tracking');
 const move=(latitude,longitude,accuracy=10)=>act(async()=>gpsWatch({coords:{latitude,longitude,accuracy}}));
 const line=document.querySelector('.navigation-line');
 const fullLine=line.getAttribute('d');
 const remaining=()=>document.querySelector('.route-remaining-distance')?.textContent;
 await move(16.0512,108.242);
 check(remaining()==='110m'&&line===document.querySelector('.navigation-line')&&line.getAttribute('d')!==fullLine,'The existing blue line redraws from the projected GPS position');
 await move(16.0512,108.2418);
 check(remaining()==='110m','A slightly backward GPS fix cannot restore traveled distance');
 check(document.querySelector('.route-step-text').textContent.includes('Rẽ trái'),'Movement along the route advances the instruction');
 await move(16.0522,108.242,90);
 await move(16.0522,108.242);
 check(routeRequests.length===1&&remaining()==='110m','Poor GPS and a single deviation preserve the remaining route');
 await move(16.0523,108.242);
 check(routeRequests.length===2&&routeRequests[1].origin[1]===16.0523,'A confirmed deviation requests a new route from the current GPS fix');
 await move(destination[1],destination[0]);
 check(!gpsWatch&&remaining()==='0m'&&document.querySelector('.route-navigation-actions').textContent.includes('Bạn đã đến nơi'),'Arrival stops continuous GPS and clears the remaining distance');
 await click(button('Thoát chỉ đường'));
 check(!document.querySelector('.route-guide'),'Exiting navigation removes the route guide');
 await click(button('Chỉ đường trên bản đồ'));
 const waitForRoute=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,1150));});
 await waitForRoute();
 await select(document.querySelector('.route-mode-select'),'foot');
 await waitForRoute();
 check(routeRequests.at(-1).mode==='routed-foot'&&document.querySelector('.route-mode-select').value==='foot'&&!gpsWatch,'Changing transport recalculates the preview without starting GPS tracking');
 await click(button('Thoát chỉ đường'));
 gpsDenied=true;
 gpsPermission.state='denied';
 await act(async()=>gpsPermission.dispatchEvent(new dom.window.Event('change')));
 await click(button('Chỉ đường trên bản đồ'));
 check(!!document.querySelector('.route-pick-notice'),'If GPS is denied, the map offers a starting point');
 await act(async()=>document.querySelector('.leaflet-map').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,clientX:430,clientY:310})));
 await waitForRoute();
 check(!!document.querySelector('.route-mode-select')&&routeRequests.at(-1).mode==='motor_scooter','Picking a starting point immediately previews a motorbike route');
 routeUnavailable=true;
 await select(document.querySelector('.route-mode-select'),'foot');
 await waitForRoute();
 check(document.querySelector('.route-request-status a')?.href.startsWith('https://www.google.com/maps/dir/'),'Routing errors offer a Google Maps fallback without leaving the guide');
 await click(document.querySelector('.route-request-status button[aria-label="Thoát chỉ đường"]'));
 gpsDenied=false;
 globalThis.fetch=originalFetch;

 await click(button('Quản trị',document.querySelector('.view-switch')));
 check(!!document.querySelector('.login-form'),'Admin opens demo login');
 await input(document.querySelector('input[type=email]'),'wrong@example.com');
 await input(document.querySelector('input[type=password]'),'wrong');
 await submit(document.querySelector('.login-form'));
 check(!!document.querySelector('.form-error'),'Incorrect credentials show an error');
 await click(button('Điền tài khoản demo'));
 await submit(document.querySelector('.login-form'));
 check(document.querySelectorAll('.stat-card').length===4,'Demo login opens dashboard');
 check([...document.querySelectorAll('.stat-card>strong')].map(x=>x.textContent).join(',')==='11,06,02,01','Dashboard uses shared data');
 await click(document.querySelector('.stat-1'));
 check(document.querySelectorAll('tbody tr').length===6&&!!document.querySelector('.admin-applied-filters button'),'The support metric opens only support places');
 await click(document.querySelector('.admin-applied-filters button'));
 check(document.querySelectorAll('tbody tr').length===7,'Clearing the support filter restores all places');
 await click([...document.querySelectorAll('.admin-sidebar nav button')].find(b=>b.textContent==='Địa điểm'));
 check(document.querySelectorAll('tbody tr').length===7,'Admin table paginates');
 await click(button('Thêm địa điểm'));
 const form=document.querySelector('dialog form');
 check(!!form&&!!document.querySelector('.coordinate-map'),'Add form includes map picker');
 const labels=[...form.querySelectorAll('label')];
 const field=name=>labels.find(l=>l.querySelector('span')?.textContent.startsWith(name))?.querySelector('input');
 await input(field('Tên địa điểm'),'Điểm test React');
 await input(field('Địa chỉ'),'An Thượng test');
 await submit(form);
 check(JSON.parse(localStorage.getItem('safemap-react-v2')).places.some(p=>p.name==='Điểm test React'),'Creating a place persists data');
 check(!document.querySelector('dialog'),'Successful save closes the form');
 await input(document.querySelector('.table-toolbar input'),'Điểm test React');
 check(document.querySelectorAll('tbody tr').length===1,'Admin live search finds created record');
 await click(document.querySelector('button[title="Chỉnh sửa"]'));
 const editForm=document.querySelector('dialog form');
 const nameLabel=[...editForm.querySelectorAll('label')].find(l=>l.querySelector('span')?.textContent.startsWith('Tên địa điểm'));
 await input(nameLabel.querySelector('input'),'Điểm test đã sửa');
 await submit(editForm);
 check(JSON.parse(localStorage.getItem('safemap-react-v2')).places.some(p=>p.name==='Điểm test đã sửa'),'Editing persists changes');
 await input(document.querySelector('.table-toolbar input'),'Điểm test đã sửa');
 await click(document.querySelector('button[title="Xóa"]'));
 check(!!document.querySelector('.delete-content'),'Delete requires confirmation');
 await click(button('Xóa',document.querySelector('dialog')));
 check(!JSON.parse(localStorage.getItem('safemap-react-v2')).places.some(p=>p.name==='Điểm test đã sửa'),'Confirmed delete persists');
 await click([...document.querySelectorAll('.admin-sidebar nav button')].find(b=>b.textContent==='Danh mục'));
 check(document.querySelectorAll('.category-card').length===7,'Category management renders');
 await click(document.querySelector('.category-card .danger-text'));
 check(document.querySelector('.toast').textContent.includes('đang có địa điểm'),'In-use category deletion is blocked');
 await select(document.querySelector('.language-control select'),'en');
 check(document.documentElement.lang==='en'&&document.querySelector('.admin-heading h1').textContent==='Manage categories','English updates the dashboard');
 await click(document.querySelector('.header-logout'));
 check(!sessionStorage.getItem('safemap-demo-session'),'Header sign-out clears demo session');
 check(!!document.querySelector('.public-tabs'),'Sign-out returns to public view');
 check(!document.querySelector('.map-welcome'),'Switching views does not reopen the introduction');
 await act(async()=>root.unmount());
 gpsPermission.state='granted';
 root=createRoot(document.getElementById('root'));
 await render();
 check(!!document.querySelector('.map-welcome[open]'),'Reloading reopens the introduction');
 check(gpsRequests===3&&document.querySelector('.card-distance').textContent==='0m','Reload restores location when permission is already granted');
 const reloadedWelcome=document.querySelector('.map-welcome');
 await act(async()=>reloadedWelcome.dispatchEvent(new dom.window.WheelEvent('wheel',{bubbles:true,deltaY:80})));
 check(reloadedWelcome.classList.contains('is-leaving'),'Scrolling down starts the transition on desktop');
 console.log(`PASS: ${checks} React DOM integration checks. No visual/layout assertions were performed.`);
}finally{
 if(root){const {act}=await import('react');await act(async()=>root.unmount());}
 dom.window.close();await unlink(output).catch(()=>{});
}
