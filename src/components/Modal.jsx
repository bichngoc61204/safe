import { useEffect, useId, useRef } from 'react';
import Icon from './Icon';

let openDialogs=0;
let previousOverflow='';

export default function Modal({title,children,onClose,wide=false,t,className='',dismissible=true}) {
  const ref=useRef(null);
  const closeCallback=useRef(onClose);
  const exitTimer=useRef(null);
  const backdropPressed=useRef(false);
  const heading=useId();
  closeCallback.current=onClose;

  useEffect(()=>{
    const dialog=ref.current;
    dialog.showModal();
    if(openDialogs++===0){
      previousOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
    }
    return ()=>{
      clearTimeout(exitTimer.current);
      dialog.close();
      if(--openDialogs===0)document.body.style.overflow=previousOverflow;
    };
  },[]);

  function finishClose(){
    clearTimeout(exitTimer.current);
    exitTimer.current=null;
    closeCallback.current();
  }

  function requestClose(){
    const dialog=ref.current;
    if(!dismissible||dialog.dataset.state==='closing')return;
    if(!dialog.animate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      finishClose();
      return;
    }
    dialog.dataset.state='closing';
    exitTimer.current=setTimeout(finishClose,240);
  }

  function isBackdrop(event){
    if(event.target!==event.currentTarget)return false;
    const bounds=event.currentTarget.getBoundingClientRect();
    return event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom;
  }

  return <dialog ref={ref} aria-labelledby={heading} className={`modal ${wide?'wide':''} ${className}`}
    onCancel={event=>{event.preventDefault();event.stopPropagation();requestClose();}}
    onPointerDown={event=>{backdropPressed.current=isBackdrop(event);}}
    onClick={event=>{
      const target=event.target.closest('dialog');
      if(target!==event.currentTarget)return;
      if(event.target.closest('[data-dialog-dismiss]')||(backdropPressed.current&&isBackdrop(event)))requestClose();
      backdropPressed.current=false;
    }}
    onAnimationEnd={event=>{
      if(event.target===event.currentTarget&&event.animationName==='ui-dialog-exit'&&exitTimer.current!==null)finishClose();
    }}
    onSubmitCapture={event=>{
      if(event.currentTarget.dataset.state==='closing'){event.preventDefault();event.stopPropagation();}
    }}>
    <div className="modal-header">
      <h2 id={heading}>{title}</h2>
      <button type="button" className="icon-button" aria-label={t('close')} disabled={!dismissible} data-dialog-dismiss><Icon name="x"/></button>
    </div>
    {children}
  </dialog>;
}
