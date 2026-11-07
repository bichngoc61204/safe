import { useEffect, useId, useRef } from 'react';
import Icon from './Icon';
export default function Modal({title,children,onClose,wide=false,t,className=''}) {
  const ref=useRef(null);
  const heading=useId();
  useEffect(()=>{const d=ref.current;d.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;d.close();};},[]);
  return <dialog ref={ref} aria-labelledby={heading} className={`modal ${wide?'wide':''} ${className}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><div className="modal-header"><h2 id={heading}>{title}</h2><button type="button" className="icon-button" aria-label={t('close')} onClick={onClose}><Icon name="x"/></button></div>{children}</dialog>;
}
