import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

export default function MapWelcome({t, onReveal, onEnter}) {
  const [leaving, setLeaving] = useState(false);
  const dialog = useRef(null);
  const touch = useRef(null);
  const wheel = useRef(0);
  const title = useId();
  const routeMask = useId();

  useLayoutEffect(() => {
    const element = dialog.current;
    element.showModal();
    element.querySelector('h2').focus({preventScroll: true});
    return () => element.close();
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timeout = window.setTimeout(onEnter, 700);
    return () => window.clearTimeout(timeout);
  }, [leaving, onEnter]);

  function enterMap() {
    if (leaving) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) onEnter();
    else {
      setLeaving(true);
      onReveal();
    }
  }

  return (
    <dialog ref={dialog} className={`map-welcome${leaving?' is-leaving':''}`} aria-labelledby={title}
      onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName === 'welcome-reveal') onEnter();
      }}
      onCancel={event => { event.preventDefault(); enterMap(); }}
      onKeyDown={event => {
        if (!['ArrowDown', 'PageDown', ' '].includes(event.key)) return;
        const {scrollHeight, clientHeight} = event.currentTarget;
        if (scrollHeight > clientHeight + 2) return;
        event.preventDefault();
        enterMap();
      }}
      onScroll={event => {
        const {scrollTop, scrollHeight, clientHeight} = event.currentTarget;
        if (scrollTop > 0 && scrollTop + clientHeight >= scrollHeight - 2) enterMap();
      }}
      onWheel={event => {
        const {scrollHeight, clientHeight} = event.currentTarget;
        if (event.ctrlKey || scrollHeight > clientHeight + 2) return;
        wheel.current = Math.max(0, wheel.current + event.deltaY);
        if (wheel.current > 44 || (event.deltaMode !== 0 && event.deltaY > 0)) enterMap();
      }}
      onTouchStart={event => {
        const point = event.touches[0];
        touch.current = event.touches.length === 1 ? [point.clientX, point.clientY] : null;
      }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const start = touch.current;
        touch.current = null;
        const {scrollHeight, clientHeight} = event.currentTarget;
        if (!start || scrollHeight > clientHeight + 2) return;
        const {clientX, clientY} = event.changedTouches[0];
        const up = start[1] - clientY;
        if (up > 55 && up > Math.abs(start[0] - clientX)) enterMap();
      }}
    >
      <div className="welcome-art" aria-hidden="true">
        <svg viewBox="0 0 520 420" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id={routeMask} maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="420">
              <path className="welcome-route-reveal" d="m123 215 145-39 31 119 47-13" pathLength="100"/>
            </mask>
          </defs>
          <path className="welcome-water" d="M396 0H520V420H320c40-53 19-111 35-169C373 188 440 117 396 0Z"/>
          <path className="welcome-park" d="m35 214 76-21 17 64-76 20zM236 74l68-19 16 55-69 19zM179 308l72-20 16 58-73 20z"/>
          <path className="welcome-streets" d="M-18 91 405-24M-18 153 424 34M-17 220 427 100M-17 286 400 173M-18 350 368 246M-18 415 350 315M-18 480 328 385M19-15l120 450M96-15l120 450M173-15l120 450M250-15l108 405M327-15l64 239"/>
          <path className="welcome-coast" d="M379 0c42 118-20 175-38 243-16 62 2 114-41 177"/>
          <g mask={`url(#${routeMask})`}>
            <path className="welcome-route-outline" d="m123 215 145-39 31 119 47-13"/>
            <path className="welcome-route" d="m123 215 145-39 31 119 47-13"/>
          </g>
          <g className="welcome-pin-safe" transform="translate(123 215)">
            <g className="welcome-map-pin"><circle r="21"/><Icon name="shield" size={22} x={-11} y={-11}/></g>
          </g>
          <g className="welcome-pin-green" transform="translate(268 176)">
            <g className="welcome-map-pin"><circle className="welcome-pin-halo" r="33"/><circle r="23"/><Icon name="recycle" size={24} x={-12} y={-12}/></g>
          </g>
          <g className="welcome-pin-partner" transform="translate(346 282)">
            <g className="welcome-map-pin"><circle r="21"/><Icon name="leaf" size={22} x={-11} y={-11}/></g>
          </g>
        </svg>
        <span className="welcome-compass">N<Icon name="navigation" size={14}/></span>
        <span className="welcome-coordinate">16°03′ N · 108°15′ E</span>
      </div>
      <div className="welcome-copy">
        <p className="welcome-kicker"><Icon name="pin" size={15}/> {t('welcomeArea')}</p>
        <h2 id={title} tabIndex={-1}><span className="welcome-title-brand">SafeMap</span>{' '}<span className="welcome-title-place">An Thượng</span></h2>
        <p className="welcome-description">{t('welcomeDescription')}</p>
        <ul className="welcome-features">
          <li><Icon name="shield" size={16}/>{t('welcomeSafe')}</li>
          <li><Icon name="recycle" size={16}/>{t('welcomeGreen')}</li>
          <li><Icon name="leaf" size={16}/>{t('partner')}</li>
        </ul>
        <p className="welcome-gesture"><Icon name="down" size={14}/><span className="welcome-scroll">{t('welcomeScroll')}</span><span className="welcome-swipe">{t('welcomeSwipe')}</span></p>
      </div>
    </dialog>
  );
}
