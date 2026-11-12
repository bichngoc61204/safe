import { Children, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export default function Dropdown({ children, value, onChange, label, className='', disabled=false, triggerClass='', menuClass='', compact=false }) {
  const options = Children.toArray(children).flatMap(child => child.type === 'optgroup'
    ? Children.toArray(child.props.children).map(option => ({ ...option.props, group: child.props.label }))
    : [child.props]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();
  const selected = options.findIndex(option => option.value === value);
  const firstEnabled = options.findIndex(option => !option.disabled);

  useLayoutEffect(() => {
    if (!open || !menu.current?.showPopover) return;
    const panel = menu.current;
    panel.showPopover();
    let frame;
    function place() {
      frame = undefined;
      const rect = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < Math.min(panel.scrollHeight + 10, 245) && above > below;
      const minimum = compact && window.innerWidth <= 700 ? 112 : 168;
      const width = Math.min(window.innerWidth - 20, Math.max(rect.width, minimum));
      Object.assign(panel.style, {
        width: `${width}px`,
        left: `${Math.max(10, Math.min(rect.left, window.innerWidth - width - 10))}px`,
        maxHeight: `${Math.max(56, Math.min(288, (upward ? above : below) - 7))}px`,
        top: upward ? 'auto' : `${rect.bottom + 6}px`,
        bottom: upward ? `${window.innerHeight - rect.top + 6}px` : 'auto',
      });
      panel.dataset.upward = upward;
    }
    function schedulePlace(event) {
      if(event.target!==panel&&frame===undefined)frame=requestAnimationFrame(place);
    }
    place();
    window.addEventListener('resize', schedulePlace);
    window.addEventListener('scroll', schedulePlace, true);
    return () => {
      if(frame!==undefined)cancelAnimationFrame(frame);
      panel.hidePopover();
      window.removeEventListener('resize', schedulePlace);
      window.removeEventListener('scroll', schedulePlace, true);
    };
  }, [open,compact]);

  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    const panel=menu.current;
    const option=panel?.querySelector('[data-active=true]');
    if(!open||!option)return;
    const panelBounds=panel.getBoundingClientRect();
    const optionBounds=option.getBoundingClientRect();
    if(optionBounds.top<panelBounds.top)panel.scrollTop-=panelBounds.top-optionBounds.top;
    else if(optionBounds.bottom>panelBounds.bottom)panel.scrollTop+=optionBounds.bottom-panelBounds.bottom;
  }, [active, open]);

  function openMenu(fallback=firstEnabled) {
    setActive(selected>=0&&!options[selected].disabled?selected:fallback);
    setOpen(true);
  }

  function choose(index) {
    const option = options[index];
    if (!option || option.disabled) return;
    setOpen(false);
    if (option.value !== value) onChange(option.value);
  }

  function keyDown(event) {
    const { key } = event;
    if (key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) choose(active);
      else openMenu();
      return;
    }
    if (!['ArrowDown','ArrowUp','Home','End'].includes(key)) return;
    event.preventDefault();
    if (!open) {
      openMenu(key==='ArrowUp'||key==='End'?options.findLastIndex(option=>!option.disabled):firstEnabled);
      return;
    }
    const step = key === 'ArrowUp' || key === 'End' ? -1 : 1;
    let next = key === 'Home' ? 0 : key === 'End' ? options.length - 1 : active + step;
    while (options[next]?.disabled) next += step;
    if (options[next]) setActive(next);
  }

  return <div ref={root} className={`dropdown ${className}`}>
    <button type="button" ref={trigger} className={`dropdown-trigger ${triggerClass}`} role="combobox"
      aria-label={label} aria-expanded={open} aria-controls={open?id:undefined}
      aria-activedescendant={open&&active>=0?`${id}-${active}`:undefined}
      disabled={disabled||firstEnabled<0} onKeyDown={keyDown} onBlur={()=>setOpen(false)}
      onClick={()=>open?setOpen(false):openMenu()}>
      <span>{options[selected]?.children??label}</span>
    </button>
    {open&&<div id={id} className={`dropdown-menu ${menuClass}`} popover={typeof HTMLElement.prototype.showPopover==='function'?'manual':undefined}
      role="listbox" aria-label={label} ref={menu}>
      {options.map((option,index)=><div className="dropdown-entry" role="presentation" key={option.value}>
        {option.group&&option.group!==options[index-1]?.group&&<div className="dropdown-group" aria-hidden="true">{option.group}</div>}
        <button type="button" role="option" tabIndex={-1} id={`${id}-${index}`} data-value={option.value}
          aria-selected={index===selected} data-active={index===active} disabled={option.disabled}
          onPointerDown={event=>event.preventDefault()} onClick={()=>choose(index)}>{option.children}</button>
      </div>)}
    </div>}
  </div>;
}
