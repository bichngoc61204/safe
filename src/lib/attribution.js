import L from 'leaflet';

/** Keep the credits accessible through the map information button. */
export function addCollapsibleAttribution(map,label,iconMarkup) {
  const attribution=L.control.attribution({position:'bottomright',prefix:false}).addTo(map);
  const notice=attribution.getContainer();
  notice.classList.add('safemap-attribution','is-collapsed');
  notice.hidden=true;
  notice.id=`map-credits-${L.Util.stamp(map)}`;
  const button=document.createElement('button');
  button.type='button';button.className='map-credits-button';
  button.innerHTML=iconMarkup;
  button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-controls',notice.id);button.setAttribute('aria-expanded','false');
  const toggle=L.control({position:'bottomright'});
  toggle.onAdd=()=>{const wrapper=L.DomUtil.create('div','map-credits-toggle');wrapper.append(button);L.DomEvent.disableClickPropagation(wrapper);L.DomEvent.disableScrollPropagation(wrapper);return wrapper;};
  toggle.addTo(map);
  const setExpanded=expanded=>{
    notice.hidden=!expanded;
    notice.classList.toggle('is-collapsed',!expanded);
    button.setAttribute('aria-expanded',String(expanded));
  };
  const collapse=()=>{if(!notice.contains(document.activeElement))setExpanded(false);};
  const click=()=>setExpanded(notice.hidden);
  button.addEventListener('click',click);
  map.on('click dragstart',collapse);
  return {
    add(text){
      attribution.addAttribution(text);
      return ()=>attribution.removeAttribution(text);
    },
    setLabel(next){button.title=next;button.setAttribute('aria-label',next);},
    destroy(){map.off('click dragstart',collapse);button.removeEventListener('click',click);toggle.remove();attribution.remove();},
  };
}
