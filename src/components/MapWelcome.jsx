import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

const slides = [
  {id:'intro', icon:'pin', kicker:'welcomeArea', title:['SafeMap','An Thượng'], description:'welcomeDescription', features:[['shield','welcomeSafe'],['recycle','welcomeGreen'],['leaf','partner']]},
  {id:'search', icon:'search', kicker:'welcomeSearchKicker', title:['welcomeSearchTitle','welcomeSearchAccent'], description:'welcomeSearchDescription', features:[['search','welcomeFindName'],['filter','welcomeFindGroup'],['locate','welcomeFindNearby']]},
  {id:'route', icon:'navigation', kicker:'welcomeRouteKicker', title:['welcomeRouteTitle','welcomeRouteAccent'], description:'welcomeRouteDescription', features:[['motorbike','route_motor_scooter'],['walk','route_foot'],['navigation','welcomeFollowRoute']]},
];

const mapScenes = [
  {
    id: 'intro',
    park: 'm35 214 76-21 17 64-76 20zM236 74l68-19 16 55-69 19zM179 308l72-20 16 58-73 20z',
    streets: 'M-18 91 405-24M-18 153 424 34M-17 220 427 100M-17 286 400 173M-18 350 368 246M-18 415 350 315M-18 480 328 385M19-15l120 450M96-15l120 450M173-15l120 450M250-15l108 405M327-15l64 239',
    water: 'M396 0H520V420H320c40-53 19-111 35-169C373 188 440 117 396 0Z',
    coast: 'M379 0c42 118-20 175-38 243-16 62 2 114-41 177',
    route: 'm123 215 145-39 31 119 47-13',
    pins: [
      { x: 123, y: 215, icon: 'shield', tone: 'safe', delay: 260 },
      { x: 268, y: 176, icon: 'recycle', tone: 'green', delay: 510, ping: true },
      { x: 346, y: 282, icon: 'leaf', tone: 'partner', delay: 780 },
    ],
  },
  {
    id: 'search',
    park: 'M55 79 168 53l16 71-114 27ZM313 239l106 30-21 77-108-28ZM143 300l64-15 23 87-65 15Z',
    streets: 'M-30 114 266 45 550 130M-30 184 271 113 550 194M-30 251 275 181 550 261M-30 320 278 248 550 329M-30 391 282 317 550 399M42-18l105 466M126-23l107 468M218-20l98 466M387-17l-86 458M473-14l-94 461',
    pins: [
      { x: 151, y: 144, icon: 'shield', tone: 'safe', delay: 410, ping: true },
      { x: 366, y: 224, icon: 'recycle', tone: 'green', delay: 580, ping: true },
      { x: 187, y: 306, icon: 'leaf', tone: 'partner', delay: 760, ping: true },
      { x: 260, y: 215, icon: 'locate', tone: 'origin', delay: 120 },
    ],
  },
  {
    id: 'route',
    park: 'M40 204h65v68H40ZM214 82h88v75h-88ZM325 248h100l-32 67h-68Z',
    streets: 'M-10 76H555M-10 168H546M-10 232H466M-10 301H426M-10 365H384M64-10V430M139-10V430M207-10V430M313-10V430M390-10V330M471-10V211',
    water: 'M520 181v239H366c25-43 47-81 59-129 14-52 47-82 95-110Z',
    coast: 'M520 164c-61 29-95 64-109 121-12 49-34 88-63 135',
    route: 'M139 301h68v-69h106v-64h77',
    pins: [
      { x: 139, y: 301, icon: 'locate', tone: 'origin', delay: 150 },
      { x: 390, y: 168, icon: 'pin', tone: 'green', delay: 1010, ping: true },
    ],
  },
];

function WelcomeArtwork({ slide, t }) {
  const maskId = useId();
  return (
    <div className="welcome-art" aria-hidden="true">
      <div className="welcome-canvas">
        {mapScenes.map(scene => {
          const routeMask = `${maskId}-${scene.id}`;
          return <svg key={scene.id} className={`welcome-map-scene scene-${scene.id}`}
            data-active={scene.id===slide.id} viewBox="0 0 520 420" preserveAspectRatio="xMidYMid slice">
            <path className="welcome-park" d={scene.park}/>
            <path className="welcome-streets" d={scene.streets}/>
            {scene.water&&<path className="welcome-water" d={scene.water}/>}
            {scene.coast&&<path className="welcome-coast" d={scene.coast}/>}
            {scene.id==='search'&&<g className="welcome-search-radius" transform="translate(260 215)">
              <circle r="128"/><circle r="75"/>
            </g>}
            {scene.route&&<>
              <mask id={routeMask} maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="420">
                <path className="welcome-route-reveal" d={scene.route} pathLength="100"/>
              </mask>
              <g mask={`url(#${routeMask})`}>
                <path className="welcome-route-outline" d={scene.route}/>
                <path className="welcome-route" d={scene.route}/>
              </g>
            </>}
            {scene.pins.map(({ x, y, icon, tone, delay, ping }) =>
              <g key={icon} className={`welcome-pin-${tone}`} transform={`translate(${x} ${y})`}
                style={{'--pin-delay':`${delay}ms`}}>
                {ping&&<circle className="welcome-pin-pulse" r="25"/>}
                <g className="welcome-map-pin">
                  <circle className="welcome-pin-disc" r="21"/>
                  <Icon name={icon} size={22} x={-11} y={-11}/>
                </g>
              </g>
            )}
          </svg>;
        })}
      </div>
      {slide.id!=='intro'&&<div key={slide.id} className="welcome-art-note">
        <Icon name={slide.icon} size={19}/>
        <span><strong>{t(slide.kicker)}</strong><small>{t(slide.id==='search'?'welcomeFindNearby':'welcomeFollowRoute')}</small></span>
      </div>}
      <span className="welcome-compass">N<Icon name="navigation" size={14}/></span>
      <span className="welcome-coordinate">16°03′ N · 108°15′ E</span>
    </div>
  );
}

export default function MapWelcome({t, onReveal, onEnter}) {
  const [leaving, setLeaving] = useState(false);
  const [{index,direction}, setSlide] = useState({index:0,direction:1});
  const slide=slides[index];
  const dialog = useRef(null);
  const touch = useRef(null);
  const wheel = useRef(0);
  const title = useId();

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
  function changeSlide(next) {
    if(leaving||next<0||next>=slides.length||next===index)return;
    wheel.current=0;
    setSlide({index:next,direction:next>index?1:-1});
  }

  return (
    <dialog ref={dialog} className={`map-welcome${leaving?' is-leaving':''}`} data-slide={slide.id}
      style={{'--welcome-direction':direction}} aria-labelledby={title}
      onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName === 'welcome-reveal') onEnter();
      }}
      onCancel={event => { event.preventDefault(); enterMap(); }}
      onKeyDown={event => {
        if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
          event.preventDefault();
          changeSlide(index+(event.key==='ArrowRight'?1:-1));
          return;
        }
        if (!['ArrowDown', 'PageDown', ' '].includes(event.key)||event.target.closest('button')&&event.key===' ') return;
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
        if (event.ctrlKey || Math.abs(event.deltaX)>Math.abs(event.deltaY) || scrollHeight > clientHeight + 2) return;
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
        if (!start) return;
        const {clientX, clientY} = event.changedTouches[0];
        const x=start[0]-clientX;
        const y=start[1]-clientY;
        if(Math.abs(x)>48&&Math.abs(x)>Math.abs(y)*1.25)changeSlide(index+Math.sign(x));
        else if(y>55&&y>Math.abs(x)&&scrollHeight<=clientHeight+2)enterMap();
      }}
    >
      <WelcomeArtwork slide={slide} t={t}/>
      <div className="welcome-copy">
        <div className="welcome-slide-content">
          <p key={slide.kicker} className="welcome-kicker"><Icon name={slide.icon} size={15}/> {t(slide.kicker)}</p>
          <h2 id={title} tabIndex={-1} aria-live="polite"><span key={slide.title[0]} className="welcome-title-brand">{t(slide.title[0])}</span>{' '}<span key={slide.title[1]} className="welcome-title-place">{t(slide.title[1])}</span></h2>
          <p key={slide.description} className="welcome-description">{t(slide.description)}</p>
          <ul key={slide.id} className="welcome-features">
            {slide.features.map(([icon,label])=><li key={label}><Icon name={icon} size={16}/>{t(label)}</li>)}
          </ul>
        </div>
        <nav className="welcome-pagination" aria-label={t('welcomeSlides')}>
          {slides.map((item,i)=><button type="button" key={item.id} aria-label={t(item.kicker)} aria-current={i===index?'step':undefined}
            onClick={()=>changeSlide(i)}><span/></button>)}
          <span aria-hidden="true">{index+1} / {slides.length}</span>
        </nav>
        <p className="welcome-gesture"><Icon name="down" size={14}/><span className="welcome-scroll">{t('welcomeScroll')}</span><span className="welcome-swipe">{t('welcomeSwipe')}</span></p>
      </div>
    </dialog>
  );
}
