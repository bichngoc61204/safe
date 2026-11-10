import { useEffect, useReducer, useRef, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconArrowsShuffle, IconBolt, IconCheck, IconHelpCircle,
  IconClock, IconHandFinger, IconPlayerPlayFilled, IconRotateClockwise, IconVolume, IconVolumeOff, IconX } from '@tabler/icons-react';
import { duel, modes, winningScore } from './duel';

const icons = { shuffle:IconArrowsShuffle, bolt:IconBolt, finger:IconHandFinger, clock:IconClock };
const names = ['Tím', 'Cam'];
const soundKey = 'dau-doi-sound';
const getSound = () => {
  try { return localStorage.getItem(soundKey) !== 'off'; }
  catch { return true; }
};

function Mascot({ player, className = '' }) {
  return <svg className={className} viewBox="0 0 160 144" aria-hidden="true">
    {player === 0 ? <>
      <path d="M14 118 31 91h103l15 27-25 15H36Z" fill="#372563"/>
      <path d="m23 53 4-30c1-9 8-12 15-6l17 15h42l18-15c7-6 14-3 15 6l4 30 6 20-2 30c-1 13-12 25-27 25H46c-16 0-28-11-29-25l-2-30Z" fill="#754bd6" stroke="#291e48" strokeWidth="4"/>
      <path d="m23 48 4-29c1-9 8-12 15-6l17 15h42l18-15c7-6 14-3 15 6l4 29 6 20-2 23c-1 13-12 24-27 24H46c-16 0-28-11-29-24l-2-23Z" fill="#bc9cff" stroke="#2b1d4c" strokeWidth="4"/>
      <path d="m36 23 15 15-18 6Zm88 0-15 15 18 6Z" fill="#9268ef"/>
      <path d="M46 68h8m51 0h8" stroke="#2c1b4a" strokeWidth="9" strokeLinecap="round"/>
      <path d="M71 83q9 10 18 0" fill="none" stroke="#2c1b4a" strokeWidth="4" strokeLinecap="round"/>
      <path d="M35 85h10m70 0h10" stroke="#ebbcff" strokeWidth="5" strokeLinecap="round"/>
      <path d="M37 48q13-10 26-10" fill="none" stroke="#e3d1ff" strokeWidth="4" strokeLinecap="round"/>
    </> : <>
      <path d="M22 115 48 99h77l17 21-21 12H43Z" fill="#563126"/>
      <path d="M37 48Q47 23 75 18l12-11 8 15 18-7-1 15q29 13 33 46l2 19c-2 21-22 32-46 34H58C32 128 15 115 15 96l3-24q3-15 19-24Z" fill="#db7354" stroke="#542d31" strokeWidth="4"/>
      <path d="M37 43Q47 18 75 13L87 3l8 15 18-7-1 15q29 13 33 46l2 16c-2 19-22 31-46 33H58C32 120 15 107 15 88l3-21q3-15 19-24Z" fill="#ffad87" stroke="#542d31" strokeWidth="4"/>
      <path d="M37 50q8-13 20-17" fill="none" stroke="#ffdcc1" strokeWidth="4" strokeLinecap="round"/>
      <path d="M53 70h8m38 0h8" stroke="#442332" strokeWidth="9" strokeLinecap="round"/>
      <path d="M73 84q7 10 15 0" fill="none" stroke="#442332" strokeWidth="4" strokeLinecap="round"/>
      <path d="M38 86h10m64 0h10" stroke="#ffd5b8" strokeWidth="5" strokeLinecap="round"/>
    </>}
  </svg>;
}

function ArcadeArt() {
  return <div className="arcade-art" aria-hidden="true">
    <svg className="art-track" viewBox="0 0 380 185" preserveAspectRatio="none">
      <ellipse cx="190" cy="94" rx="156" ry="56" transform="rotate(-12 190 94)"/>
      <ellipse cx="190" cy="94" rx="169" ry="69" transform="rotate(10 190 94)"/>
      <path d="M42 56h14m-7-7v14m282 55h18m-9-9v18M91 147h12m-6-6v12m179-128h10m-5-5v10"/>
      <circle cx="302" cy="55" r="3"/><circle cx="125" cy="27" r="2"/><circle cx="234" cy="152" r="3"/>
    </svg>
    <span className="art-tag art-tag-one">P1</span><span className="art-tag art-tag-two">P2</span>
    <Mascot player={0} className="art-mascot art-mascot-one"/>
    <span className="art-vs"><IconBolt size={30} stroke={2.5}/></span>
    <Mascot player={1} className="art-mascot art-mascot-two"/>
  </div>;
}

function Modal({ kind, onClose, onLeave }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog className="duo-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="duo-dialog-title">
    <div className="dialog-inner">
      <button className="square-button dialog-close" type="button" aria-label="Đóng" onClick={onClose} autoFocus><IconX size={20}/></button>
      {kind === 'help' ? <>
        <span className="eyebrow">SỔ TAY ARCADE</span>
        <h2 id="duo-dialog-title">Cách chơi</h2>
        <p>Đặt điện thoại giữa hai người. Một người dùng đầu tím, người kia dùng đầu cam. Cả hai chạm “Sẵn sàng” để vào vòng. Ai có 3 điểm trước thắng trận.</p>
        <ul className="rules-list">{modes.slice(1).map(mode => {
          const Icon = icons[mode.icon];
          return <li key={mode.id}><Icon size={22}/><div><strong>{mode.name}</strong><span>{mode.description}</span></div></li>;
        })}</ul>
        <p className="keyboard-help">Chơi bằng bàn phím với <kbd>A</kbd> cho Tím và <kbd>L</kbd> cho Cam.</p>
      </> : <>
        <h2 id="duo-dialog-title">Rời trận này?</h2>
        <p>Bảng điểm của trận sẽ được xóa.</p>
        <div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Chơi tiếp</button><button className="primary-button" onClick={onLeave}>Rời trận <IconArrowRight size={18}/></button></div>
      </>}
    </div>
  </dialog>;
}

function Header({ sound, toggleSound, onHelp, onBack, active }) {
  const SoundIcon = sound ? IconVolume : IconVolumeOff;
  return <header className="duo-header">
    {active ? <button className="square-button" type="button" aria-label="Về màn chọn trò" onClick={onBack}><IconArrowLeft size={20}/></button> :
      <div className="duo-wordmark"><span className="wordmark-icon"><IconBolt size={19} stroke={2.7}/></span><span>ĐẤU ĐÔI<small>ARCADE BỎ TÚI</small></span></div>}
    {active && <span className="header-match">ĐẤU ĐÔI</span>}
    <div className="header-actions">
      <button className="square-button" type="button" onClick={toggleSound} aria-label="Âm thanh" aria-pressed={sound} title={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}><SoundIcon size={20}/></button>
      {!active && <button className="square-button" type="button" onClick={onHelp} aria-label="Cách chơi"><IconHelpCircle size={20}/></button>}
    </div>
  </header>;
}

function Lobby({ playlist, setPlaylist, onStart }) {
  const current = modes.find(mode => mode.id === playlist);
  return <main className="duo-lobby">
    <section className="duo-hero">
      <span className="eyebrow"><i/> ARCADE 2 NGƯỜI</span>
      <h1>Hai người.<br/><em>Một màn hình.</em></h1>
      <ArcadeArt/>
    </section>
    <a className="folk-entry" href="/game?play=quan">
      <span className="folk-icon" aria-hidden="true">✦</span><span><small>TRÒ DÂN GIAN · CHƠI ONLINE</small><strong>Ô Ăn Quan</strong></span><IconArrowRight size={20}/>
    </a>
    <section className="mode-picker" aria-labelledby="mode-title">
      <div className="mode-heading"><h2 id="mode-title">Chọn trò</h2><span>AI ĐỦ 3 ĐIỂM TRƯỚC THẮNG</span></div>
      <div className="mode-grid" role="group" aria-labelledby="mode-title">
        {modes.map((mode, index) => {
          const ModeIcon = icons[mode.icon];
          return <button key={mode.id} className="mode-button" type="button" aria-pressed={playlist === mode.id} onClick={() => setPlaylist(mode.id)}>
            <ModeIcon size={19}/><strong>{mode.name}</strong><small aria-hidden="true">0{index + 1}</small>
          </button>;
        })}
      </div>
      <p className="mode-description" aria-live="polite">{current.description}</p>
    </section>
    <footer className="lobby-footer">
      <button type="button" className="primary-button start-button" onClick={onStart}><IconPlayerPlayFilled size={17}/> Vào trận <IconArrowRight className="start-arrow" size={19}/></button>
      <p>Đặt điện thoại giữa hai người, mỗi người một đầu.</p>
    </footer>
  </main>;
}

function PlayerPad({ state, player, onPress }) {
  const { phase, mode, ready, counts, guesses, result } = state;
  const locked = phase === 'ready' && ready[player] || phase === 'play' && mode === 'timing' && guesses[player] !== null;
  const actionable = ['ready','waiting','play'].includes(phase) && !locked;
  let label = 'Chờ hiệu lệnh';
  if (phase === 'ready') label = locked ? 'Đã sẵn sàng' : 'Sẵn sàng';
  if (phase === 'waiting') label = 'Chờ đèn xanh';
  if (phase === 'play') {
    if (mode === 'taps') label = 'Chạm liên tục';
    else if (mode === 'timing') label = locked ? 'Đã chốt' : 'Chạm để chốt';
    else label = 'Chạm ngay!';
  }
  if (result) label = result.winner === null ? 'Hòa' : result.winner === player ? 'Thắng vòng' : 'Hết vòng';
  const value = mode === 'taps' && (phase === 'play' || result) ? counts[player] : null;
  return <button className="player-pad" type="button" data-player={player} data-locked={locked} data-won={result?.winner === player}
    aria-label={`${names[player]} · ${label}`} aria-disabled={!actionable}
    onPointerDown={event => { if (actionable && event.button === 0) onPress(player); }}
    onClick={event => { if (actionable && event.detail === 0) onPress(player); }}>
    <span className="pad-content">
      <span className="pad-player"><i/> P{player + 1} / {names[player]}</span>
      {value !== null ? <strong className="pad-number">{value}</strong> : <Mascot player={player} className="pad-mascot"/>}
      <span className="pad-action">{locked && <IconCheck size={16}/>} {label}</span>
    </span>
  </button>;
}

const seconds = ms => `${(ms / 1000).toFixed(2).replace('.', ',')} giây`;

function roundSummary({ winner, reason, values }) {
  if (reason === 'early') return `${names[values[0]]} chạm trước khi đèn bật.`;
  if (reason === 'reaction') return `Phản xạ ${values[0]} ms`;
  if (reason === 'taps') return `${values[0]} – ${values[1]} lượt chạm`;
  if (reason === 'timing') return values.map((value,index) => `${names[index]} ${value === null ? 'chưa chốt' : seconds(value)}`).join(' · ');
  return winner === null ? 'Hết giờ. Thử lại vòng này.' : '';
}

function Arena({ state, now, onPress, onNext, onReplay, onLobby }) {
  const { mode, score, phase, result, deadline, startedAt } = state;
  const config = modes.find(item => item.id === mode);
  const ModeIcon = icons[config.icon];
  const matchWinner = phase === 'complete' ? names[result.winner] : null;
  const timeLeft = deadline === null ? 0 : Math.max(0, deadline - now);
  const showTimer = phase === 'play' && mode === 'taps';
  let signal = config.name;
  if (phase === 'countdown') signal = String(Math.max(1, Math.min(3, Math.ceil(timeLeft / 1000))));
  if (phase === 'waiting') signal = 'Đợi đèn xanh…';
  if (phase === 'play' && mode === 'reaction') signal = 'CHẠM!';
  if (showTimer) signal = `${(timeLeft / 1000).toFixed(1).replace('.', ',')} giây`;
  if (phase === 'play' && mode === 'timing') signal = now - startedAt < 650 ? 'Bắt đầu đếm!' : 'Chạm ở mốc 3 giây';
  return <main className="duo-arena" data-mode={mode} data-phase={phase}>
    <PlayerPad state={state} player={0} onPress={onPress}/>
    <section className="match-console" aria-label="Bảng điểm">
      <div className="console-top">
        <div className="score-team score-purple" aria-label={`Tím ${score[0]} điểm`}>{Array.from({length:winningScore},(_,index)=><i key={index} data-earned={index < score[0]}/>)}</div>
        <span className="round-number">VÒNG {state.index + 1}</span>
        <div className="score-team score-orange" aria-label={`Cam ${score[1]} điểm`}>{Array.from({length:winningScore},(_,index)=><i key={index} data-earned={index < score[1]}/>)}</div>
      </div>
      {result ? <div className="round-result" key={state.round} role="status">
        <strong>{matchWinner ? `${matchWinner} thắng trận!` : result.winner === null ? 'Hòa vòng này' : `${names[result.winner]} +1 điểm`}</strong>
        <span>{roundSummary(result)}</span>
        <div className="round-actions">
          {matchWinner ? <><button className="secondary-button" onClick={onLobby}>Chọn trò</button><button className="primary-button" onClick={onReplay}><IconRotateClockwise size={17}/> Tái đấu</button></> :
            <button className="primary-button" onClick={onNext}>{result.winner === null ? 'Chơi lại vòng' : 'Vòng tiếp'}<IconArrowRight size={17}/></button>}
        </div>
      </div> : <div className="console-signal" aria-live={showTimer ? 'off' : 'polite'}>
        {phase !== 'countdown' && <ModeIcon size={21}/>}<strong>{signal}</strong>
        {phase === 'ready' && <small>{mode === 'reaction' ? 'Chờ đèn bật rồi chạm' : mode === 'taps' ? 'Ai chạm nhiều hơn trong 5 giây?' : 'Ai chạm gần mốc 3 giây hơn?'}</small>}
      </div>}
      {showTimer && <span className="round-timer" aria-hidden="true" style={{ '--time-left':timeLeft / 5000 }}/>}
    </section>
    <PlayerPad state={state} player={1} onPress={onPress}/>
  </main>;
}

export default function DuoGame() {
  const [state, dispatch] = useReducer(duel, null);
  const [playlist, setPlaylist] = useState('mixed');
  const [sound, setSound] = useState(getSound);
  const [modal, setModal] = useState(null);
  const [now, setNow] = useState(0);
  const audio = useRef(null);
  const previousCue = useRef('');
  const round = state?.round;
  const deadline = state?.deadline;
  const phase = state?.phase;
  const playing = state !== null;

  function unlockSound() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio.current ??= new Audio();
      if (audio.current.state === 'suspended') audio.current.resume().catch(() => {});
    } catch { /* Some browsers disable audio. */ }
  }
  function toggleSound() {
    const next = !sound;
    if (next) unlockSound();
    setSound(next);
    try { localStorage.setItem(soundKey, next ? 'on' : 'off'); } catch { /* Optional preference. */ }
  }
  function start() {
    if (sound) unlockSound();
    previousCue.current = '';
    dispatch({ type:'start', playlist });
  }
  function press(player) {
    if (modal) return;
    dispatch({ type:'press', round, player, now:performance.now() });
  }
  function leave() {
    setModal(null);
    dispatch({ type:'lobby' });
  }
  function askToLeave() {
    if (phase === 'complete') { leave(); return; }
    dispatch({ type:'interrupt', round });
    setModal('leave');
  }

  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    const tick = () => setNow(performance.now());
    tick();
    const interval = phase === 'waiting' ? null : setInterval(tick, phase === 'countdown' ? 80 : 65);
    const clock = () => {
      const remaining = deadline - performance.now();
      if (remaining > 0) { timer = setTimeout(clock, remaining); return; }
      dispatch({ type:'clock', round, deadline, now:performance.now(), delay:1000 + Math.random() * 2300 });
    };
    let timer = setTimeout(clock, Math.max(0, deadline - performance.now()));
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [deadline, phase, round]);

  useEffect(() => {
    if (!playing) return;
    const key = event => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || modal) return;
      const player = event.code === 'KeyA' ? 0 : event.code === 'KeyL' ? 1 : null;
      if (player === null) return;
      event.preventDefault();
      dispatch({ type:'press', round, player, now:performance.now() });
    };
    const visibility = () => { if (document.hidden) dispatch({ type:'interrupt', round }); };
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [playing, round, modal]);

  const countdown = phase === 'countdown' ? Math.max(1, Math.min(3, Math.ceil((deadline - now) / 1000))) : null;
  useEffect(() => {
    const cue = phase === 'countdown' ? `count${countdown}` : phase;
    const key = `${round}:${cue}`;
    if (previousCue.current === key) return;
    previousCue.current = key;
    const context = audio.current;
    const tones = phase === 'complete' ? [523,659,784] : phase === 'result' ? [420,560] : phase === 'play' ? [800] : phase === 'countdown' ? [300] : [];
    if (!sound || context?.state !== 'running') return;
    for (const [index, frequency] of tones.entries()) {
      const time = context.currentTime + index * .095;
      const note = context.createOscillator();
      const gain = context.createGain();
      note.type = 'sine';
      note.frequency.value = frequency;
      gain.gain.setValueAtTime(.11, time);
      gain.gain.exponentialRampToValueAtTime(.001, time + .13);
      note.connect(gain).connect(context.destination);
      note.start(time);
      note.stop(time + .14);
    }
  }, [round, phase, countdown, sound]);

  return <div className="duo-shell" data-playing={playing}>
    <Header active={playing} sound={sound} toggleSound={toggleSound} onHelp={() => setModal('help')} onBack={askToLeave}/>
    {playing ? <Arena state={state} now={now} onPress={press} onNext={() => dispatch({ type:'next', round })}
      onReplay={start} onLobby={leave}/> : <Lobby playlist={playlist} setPlaylist={setPlaylist} onStart={start}/>}
    {modal && <Modal kind={modal} onClose={() => setModal(null)} onLeave={leave}/>}
  </div>;
}
