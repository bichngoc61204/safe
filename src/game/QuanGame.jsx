import { useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconDeviceMobile, IconFriends, IconLink, IconSparkles, IconWifi, IconX } from '@tabler/icons-react';
import { canPlay, encodeMove, replayQuan, side, teams } from './quan';
import './quan.css';

const roomKey = 'dau-doi-quan-room';
const cleanCode = value => value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,8);
const inviteCode = () => cleanCode(new URLSearchParams(location.search).get('room') || '');
const roomUrl = code => `/game?play=quan${code ? `&room=${code}` : ''}`;

function rememberRoom(code) {
  try { if (code) sessionStorage.setItem(roomKey, code); else sessionStorage.removeItem(roomKey); } catch { /* Storage may be unavailable. */ }
  history.replaceState(null, '', roomUrl(code));
}

function readableError(error) {
  switch (error.code || error.message) {
    case 'auth/operation-not-allowed': case 'auth/admin-restricted-operation': return 'Phòng online cần bật đăng nhập Ẩn danh trong Firebase.';
    case 'game-config': return 'Phòng online chưa có cấu hình Firebase.';
    case 'game-missing': case 'game-full': return 'Phòng không tồn tại hoặc đã đủ người. Kiểm tra lại mã mời.';
    case 'permission-denied': return 'Không vào được phòng. Phòng có thể đã đầy, hết hạn hoặc chưa được bật trên Firebase.';
    case 'game-turn': return 'Bàn vừa đổi lượt. Hãy chọn lại ô khi đến lượt bạn.';
    default: return 'Kết nối phòng bị gián đoạn. Bạn thử lại nhé.';
  }
}

function Character({player, className=''}) {
  return <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
    <ellipse cx="50" cy="89" rx="34" ry="6" fill={player===0?'#275c4455':'#ad582f44'}/>
    {player===0 ? <>
      <path d="M19 46 16 21q0-7 7-4l17 10h22l17-10q7-3 7 4l-4 25q7 9 7 20c0 16-15 23-39 23S11 82 11 66q0-12 8-20Z" fill="#a6d7b5" stroke="#2f6252" strokeWidth="3"/>
      <path d="m23 26 11 7-10 6Zm55 0-11 7 9 6Z" fill="#f0acac"/>
      <path d="M24 73q6-12 16-11h20q10-1 16 11c-4 9-14 14-26 14s-22-5-26-14" fill="#dbedc9"/>
      <path d="M30 54h3m34 0h3" stroke="#224a3a" strokeWidth="6" strokeLinecap="round"/>
      <path d="M45 63q5 6 10 0m-5 1v4q-3 5-8 2m8-2q3 5 8 2" fill="none" stroke="#224a3a" strokeWidth="2.4" strokeLinecap="round"/>
      <path d="M20 61h8m44 0h8" stroke="#ec969a" strokeWidth="4" strokeLinecap="round"/>
      <path d="M43 29q0-11 11-16l-1 10 10-3q-2 10-15 13" fill="#42856d" stroke="#2f6252" strokeWidth="2"/>
    </> : <>
      <path d="M38 35q-12-15-4-22 7-5 14 7 0-14 8-13 8 1 5 15 9-8 15-3 6 6-7 18" fill="#e47858" stroke="#7f4932" strokeWidth="3"/>
      <path d="M14 69q0-34 35-37 33 0 38 30 8 8 1 16-9 12-37 12-36 0-37-21Z" fill="#ffc67c" stroke="#7f4932" strokeWidth="3"/>
      <path d="M23 67q13-6 20 6-7 9-17 3" fill="#f5a653"/>
      <path d="M42 53h2m23 0h2" stroke="#5e382b" strokeWidth="6" strokeLinecap="round"/>
      <path d="m50 62 7-4 7 4-7 6Z" fill="#ec8656" stroke="#7f4932" strokeWidth="2"/>
      <path d="M33 62h6m36 0h6" stroke="#ee927c" strokeWidth="4" strokeLinecap="round"/>
      <path d="m43 91-3 4m23-4 3 4" stroke="#8e502e" strokeWidth="3" strokeLinecap="round"/>
    </>}
  </svg>;
}

function Rules({onClose}) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className="quan-rules" onCancel={event=>{event.preventDefault();onClose();}} aria-labelledby="quan-rules-title">
    <button type="button" className="quan-icon" onClick={onClose} aria-label="Đóng luật chơi"><IconX size={20}/></button>
    <h2 id="quan-rules-title">Cách chơi</h2>
    <ol>
      <li>Đến lượt mình, chọn một ô dân bên mình rồi chọn hướng rải. Mỗi ô tiếp theo nhận một quân.</li>
      <li>Rải xong, nếu ô kế tiếp có dân thì bốc ô đó và rải tiếp. Nếu ô kế trống và ô sau có quân thì ăn ô sau. Có thể ăn liên tiếp qua các ô trống.</li>
      <li>Một quan tính 10 điểm, một dân tính 1 điểm. Nếu cả hàng hết dân, game rải lại mỗi ô một dân và trừ 5 điểm.</li>
      <li>Hết cả hai quan thì thu dân còn lại và tính điểm. Ván hòa nếu hai bên bằng điểm hoặc đạt giới hạn 400 lượt.</li>
    </ol>
  </dialog>;
}

function QuanBoard({moves, seat, blocked, onMove}) {
  const [selected,setSelected] = useState(null);
  const [frame,setFrame] = useState(null);
  const previous = useRef(moves.length);
  const view = useMemo(()=>replayQuan(moves,true),[moves]);
  const board = view?.board;
  const online = seat !== null;
  const bottom = seat ?? 0;
  const top = 1 - bottom;
  const animationOn = Boolean(frame && frame.revision === moves.length);
  const display = animationOn ? frame : board;
  const turn = board?.turn;
  const allowed = !blocked && !animationOn && (!online || turn === seat);
  const selectedPit = selected?.revision === moves.length ? selected.pit : null;

  useEffect(()=>{
    const frames = view?.frames;
    const animate = moves.length === previous.current + 1 && frames?.length && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    previous.current = moves.length;
    if (!animate) return;
    const interval = Math.max(55, Math.min(175, Math.floor(4200 / frames.length)));
    let index = 0;
    const tick = () => {
      if (index >= frames.length) { setFrame(null); clearInterval(timer); return; }
      setFrame({ ...frames[index], revision:moves.length });
      index++;
    };
    const timer = setInterval(tick, interval);
    tick();
    return ()=>clearInterval(timer);
  },[moves.length, view]);

  if (!board) return <p className="quan-error" role="alert">Dữ liệu ván này không hợp lệ. Hãy tạo phòng mới.</p>;
  function pit(index, position) {
    const royal = index === 0 || index === 6;
    const count = display.stones[index];
    const hasRoyal = royal && display.royals[index / 6];
    const shownStones = Math.min(count, 8);
    const droppingStone = animationOn && frame.active === index && frame.dropped;
    const playable = allowed && canPlay(board,index);
    return <button type="button" key={index} className="quan-pit" style={{gridArea:position}}
      data-royal={royal} data-current={selectedPit===index} data-rain={animationOn&&frame.active===index} disabled={!playable}
      aria-pressed={selectedPit===index} aria-label={royal?`Ô quan, ${hasRoyal?'còn quan, ':''}${count} dân`:`Ô ${index>6?index-6:index}, ${count} dân`}
      onClick={()=>setSelected({pit:index,revision:moves.length})}>
      <span className="pit-stones" aria-hidden="true">
        {hasRoyal&&<i className="king-stone"/>}
        {Array.from({length:shownStones},(_,i)=><i className="pebble" key={i} data-drop={droppingStone && i === shownStones - 1}/>)}
      </span>
      <strong>{royal&&hasRoyal?'QUAN':count}</strong>
    </button>;
  }
  function playerRow(player) {
    return <div className={`quan-player ${teams[player].color}`} data-turn={!board.over&&turn===player}>
      <Character player={player}/><div><strong>{teams[player].name}</strong><small>{online ? seat===player?'BẠN':'BẠN CHƠI' : `NGƯỜI ${player+1}`}</small></div>
      <span className="quan-score"><b>{display.scores[player]}</b><small>ĐIỂM</small></span>
    </div>;
  }
  const over = board.over && !animationOn;
  const hint = over ? board.winner===null?'Hai bạn hòa!':`${teams[board.winner].name} thắng!`
    : animationOn?'Đang rải quân…'
    : online&&turn!==seat?`Đợi ${teams[turn].name} đi`
    : selectedPit!==null?'Chọn hướng rải'
    : online?'Tới lượt bạn. Chọn một ô dân.':`Lượt ${teams[turn].name}. Chọn một ô dân.`;
  return <section className="quan-match">
    {playerRow(top)}
    <div className="quan-board" aria-label="Bàn Ô Ăn Quan">
      {pit(bottom===0?0:6,'left')}{pit(bottom===0?6:0,'right')}
      {[...side(top)].reverse().map((index,i)=>pit(index,`t${i}`))}
      {side(bottom).map((index,i)=>pit(index,`b${i}`))}
    </div>
    {playerRow(bottom)}
    <div className="quan-turn" data-over={over}>
      <div role="status"><strong>{hint}</strong>
        {over?<small>Ván kết thúc sau {board.number} lượt</small>:!animationOn&&board.last&&
          <small>{teams[board.last.player].name} {board.last.points?`ăn ${board.last.points} điểm`:'vừa rải quân'}{board.last.refill?' · Bên kia rải lại 5 dân':''}</small>}
      </div>
      {allowed&&!over&&<div className="quan-directions">
        <button type="button" disabled={selectedPit===null} onClick={()=>onMove(selectedPit,turn===bottom?-1:1)}><IconArrowLeft size={20}/> Rải trái</button>
        <button type="button" disabled={selectedPit===null} onClick={()=>onMove(selectedPit,turn===bottom?1:-1)}>Rải phải <IconArrowRight size={20}/></button>
      </div>}
    </div>
  </section>;
}

export default function QuanGame() {
  const [code,setCode] = useState(inviteCode);
  const [room,setRoom] = useState(null);
  const [snapshot,setSnapshot] = useState(null);
  const [live,setLive] = useState(false);
  const [localMoves,setLocalMoves] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [copied,setCopied] = useState(false);
  const [rules,setRules] = useState(false);
  const [listenAttempt,setListenAttempt] = useState(0);
  const pending = useRef(false);
  const rooms = useRef(null);

  async function join(nextCode) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError(''); setSnapshot(null); setLive(false);
    try {
      rooms.current ??= await import('./quanRooms');
      const next = await rooms.current.enterRoom(nextCode);
      setRoom(next); setCode(next.id); rememberRoom(next.id);
    } catch (reason) { setError(readableError(reason)); }
    finally { pending.current = false; setBusy(false); }
  }

  useEffect(()=>{
    let saved;
    try { saved = sessionStorage.getItem(roomKey); } catch { /* Manual join is still available. */ }
    if (saved && saved === inviteCode() && /^[A-HJ-NP-Z2-9]{8}$/.test(saved)) join(saved);
  },[]);

  useEffect(()=>{
    if (!room) return;
    return rooms.current.observeRoom(room,(next,connected)=>{
      setLive(connected);
      if (next) setSnapshot(next);
    },reason=>{setLive(false);setError(readableError(reason));});
  },[room,listenAttempt]);

  function leave() {
    setLocalMoves(null); setRoom(null); setSnapshot(null); setCode(''); setCopied(false); setError('');
    rememberRoom('');
  }

  async function move(pit,direction) {
    if (pending.current) return;
    if (!room) {
      setLocalMoves(previous => {
        const current = replayQuan(previous)?.board;
        return current && canPlay(current,pit) ? [...previous,encodeMove(pit,direction)] : previous;
      });
      return;
    }
    pending.current = true;
    setBusy(true); setError('');
    try { await rooms.current.sendMove(room,pit,direction,snapshot.moves.length); }
    catch (reason) { setError(readableError(reason)); }
    finally { pending.current = false; setBusy(false); }
  }

  async function share() {
    const url = new URL(roomUrl(room.id),location.origin).href;
    try {
      if (navigator.share) await navigator.share({title:'Ô Ăn Quan',text:`Vào phòng ${room.id} chơi Ô Ăn Quan với mình!`,url});
      else { await navigator.clipboard.writeText(url); setCopied(true); }
    } catch (reason) { if (reason.name !== 'AbortError') setError(`Gửi mã ${room.id} để bạn chơi nhập thủ công.`); }
  }

  const waiting = room && !snapshot?.paired;
  const gameMoves = room ? snapshot?.moves : localMoves;
  const over = gameMoves && replayQuan(gameMoves)?.board.over;
  return <main className="quan-shell">
    <header className="quan-header"><a className="quan-icon" href="/game" aria-label="Về Đấu Đôi"><IconArrowLeft size={21}/></a>
      <div><small>ĐẤU ĐÔI · TRÒ DÂN GIAN</small><strong>Ô Ăn Quan</strong></div>
      <button type="button" className="quan-icon" aria-label="Luật Ô Ăn Quan" onClick={()=>setRules(true)}>?</button>
    </header>
    {!room&&!localMoves&&<>
      <section className="quan-hero"><span><IconSparkles size={15}/> CHUYỆN HÒN SỎI</span>
        <h1>Rải sỏi,<br/>bắt quan!</h1><p>Mèo Mơ gặp Gà Bông. Mỗi người một bên bàn sỏi.</p>
        <div className="quan-hero-art"><Character player={0}/><i>✦</i><Character player={1}/></div>
      </section>
      <section className="quan-entry" aria-label="Chọn cách chơi">
        <button type="button" className="quan-primary" disabled={busy} onClick={()=>join()}><IconFriends size={23}/> Tạo phòng online <IconArrowRight size={20}/></button>
        <form className="quan-join" onSubmit={event=>{event.preventDefault();if(code.length===8)join(code);}}>
          <label htmlFor="quan-code">Bạn có mã phòng?</label>
          <div><input id="quan-code" value={code} onChange={event=>setCode(cleanCode(event.target.value))}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="Mã 8 ký tự" maxLength={12}/>
          <button type="submit" disabled={code.length!==8||busy}>Vào phòng</button></div>
        </form>
        <button type="button" className="quan-local" disabled={busy} onClick={()=>{setError('');setLocalMoves([]);}}><IconDeviceMobile size={19}/> Chơi chung một máy</button>
        {busy&&<p role="status" className="quan-notice">Đang kết nối phòng…</p>}
      </section>
    </>}
    {room&&<div className="quan-room-bar"><span><IconWifi size={16}/> Phòng <b>{room.id}</b></span><button type="button" onClick={leave} disabled={busy}>Rời phòng</button></div>}
    {waiting&&<section className="quan-wait">
      <Character player={0}/><h1>{snapshot?'Đợi Gà Bông tới…':'Đang mở phòng…'}</h1>
      <p>Gửi link hoặc đọc mã bên dưới cho người chơi còn lại.</p>
      <strong>{room.id}</strong>
      <button type="button" className="quan-primary" onClick={share}>{copied?<IconCheck size={19}/>:<IconLink size={19}/>} {copied?'Đã chép link':'Mời bạn bằng link'}</button>
    </section>}
    {room&&!live&&<p className="quan-notice" role="status">Đang đồng bộ phòng… <button type="button" onClick={()=>{setError('');setListenAttempt(n=>n+1);}}>Kết nối lại</button></p>}
    {gameMoves&&!waiting&&<QuanBoard moves={gameMoves} seat={room?snapshot.seat:null} blocked={busy||Boolean(room&&!live)} onMove={move}/>}
    {localMoves&&<div className="quan-bottom-actions"><button type="button" className="quan-local" onClick={leave}>Chọn lại cách chơi</button>
      {over&&<button type="button" className="quan-primary" onClick={()=>setLocalMoves([])}>Tái đấu</button>}</div>}
    {room&&over&&<button type="button" className="quan-local" onClick={leave}>Về sảnh để tạo ván mới</button>}
    {error&&<p className="quan-error" role="alert">{error}</p>}
    {rules&&<Rules onClose={()=>setRules(false)}/>}
  </main>;
}
