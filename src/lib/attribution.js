import L from 'leaflet';

/** Present credits on load, then keep an accessible way to reopen the full notice. */
export function addCollapsibleAttribution(map,label,iconMarkup,delay=5000) {
  const attribution=L.control.attribution({position:'bottomright',prefix:false}).addTo(map);
  const notice=attribution.getContainer();
  notice.classList.add('safemap-attribution');
  notice.id=`map-credits-${L.Util.stamp(map)}`;
  const button=document.createElement('button');
  button.type='button';button.className='map-credits-button';
  button.innerHTML=iconMarkup;
  button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-controls',notice.id);button.setAttribute('aria-expanded','true');
  const toggle=L.control({position:'bottomright'});
  toggle.onAdd=()=>{const wrapper=L.DomUtil.create('div','map-credits-toggle');wrapper.append(button);L.DomEvent.disableClickPropagation(wrapper);L.DomEvent.disableScrollPropagation(wrapper);return wrapper;};
  toggle.addTo(map);
  let timer;
  const collapse=()=>{clearTimeout(timer);if(notice.contains(document.activeElement))return;notice.hidden=true;button.setAttribute('aria-expanded','false');};
  const reveal=(autoCollapse=false)=>{clearTimeout(timer);notice.hidden=false;button.setAttribute('aria-expanded','true');if(autoCollapse)timer=setTimeout(collapse,delay);};
  const click=()=>{if(notice.hidden)reveal();else collapse();};
  button.addEventListener('click',click);
  reveal(true);
  return {
    reveal:()=>reveal(true),
    setLabel(next){button.title=next;button.setAttribute('aria-label',next);},
    destroy(){clearTimeout(timer);button.removeEventListener('click',click);toggle.remove();attribution.remove();},
  };
}
