import { useRef, useState } from 'react';
import Icon from './Icon';
import Modal from './Modal';

export default function PlaceGallery({images, name, t}) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(null);
  const swipe = useRef(null);
  if (!images.length) return null;
  const go = next => {
    const element = track.current;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({left: next * element.clientWidth, behavior: reduced ? 'instant' : 'smooth'});
  };
  const show = next => setZoom(Math.max(0,Math.min(images.length-1,next)));
  const enlarged = zoom===null?null:images[zoom];
  return <><figure className="place-gallery">
    <div className="place-gallery-frame">
      <div className="place-gallery-track" ref={track} tabIndex={images.length>1?0:undefined}
        aria-label={t('placePhotos')}
        onScroll={e=>{
          const {scrollLeft,clientWidth}=e.currentTarget;
          if(clientWidth)setIndex(Math.round(scrollLeft/clientWidth));
        }}
        onKeyDown={e=>{
          if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
          e.preventDefault();
          go(Math.max(0,Math.min(images.length-1,index+(e.key==='ArrowRight'?1:-1))));
        }}>
        {images.map((src,i)=><button type="button" className="place-gallery-slide" key={src}
          aria-label={`${t('photoEnlarge')} ${i+1}`} onClick={()=>show(i)}>
          <Icon name="pin" size={24}/>
          <img src={src} alt={name} loading={i===0?'eager':'lazy'} onError={e=>{e.currentTarget.hidden=true;}}/>
        </button>)}
      </div>
      {images.length>1&&<>
        <button type="button" className="place-gallery-arrow previous" aria-label={t('photoPrevious')} disabled={index===0} onClick={()=>go(index-1)}><Icon name="left" size={18}/></button>
        <button type="button" className="place-gallery-arrow next" aria-label={t('photoNext')} disabled={index===images.length-1} onClick={()=>go(index+1)}><Icon name="right" size={18}/></button>
        <span className="place-gallery-count" aria-live="polite">{index+1} / {images.length}</span>
      </>}
    </div>
  </figure>
  {enlarged&&<Modal title={name} onClose={()=>setZoom(null)} className="photo-modal" t={t}>
    <div className="photo-viewer" onKeyDown={e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(zoom+(e.key==='ArrowRight'?1:-1));}
    }} onTouchStart={e=>{swipe.current=e.touches.length===1?e.touches[0].clientX:null;}} onTouchEnd={e=>{
      if(swipe.current===null)return;
      const delta=e.changedTouches[0].clientX-swipe.current;
      swipe.current=null;
      if(Math.abs(delta)>50)show(zoom+(delta<0?1:-1));
    }} onTouchCancel={()=>{swipe.current=null;}}>
      <img key={enlarged} src={enlarged} alt={name}/>
      {images.length>1&&<>
        <button type="button" autoFocus className="place-gallery-arrow previous" aria-label={t('photoPrevious')} aria-disabled={zoom===0} onClick={()=>show(zoom-1)}><Icon name="left" size={20}/></button>
        <button type="button" className="place-gallery-arrow next" aria-label={t('photoNext')} aria-disabled={zoom===images.length-1} onClick={()=>show(zoom+1)}><Icon name="right" size={20}/></button>
        <span className="place-gallery-count" aria-live="polite">{zoom+1} / {images.length}</span>
      </>}
    </div>
  </Modal>}
  </>;
}
