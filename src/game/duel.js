export const modes = [
  { id:'mixed', name:'Trộn cả ba', icon:'shuffle', description:'Luân phiên ba trò. Một trận, đủ vị.' },
  { id:'reaction', name:'Bắt sóng', icon:'bolt', description:'Đợi đèn bật. Ai chạm trước thắng, chạm sớm mất điểm.' },
  { id:'taps', name:'Bão chạm', icon:'finger', description:'Hai người chạm liên tục trong 5 giây. Ai chạm nhiều hơn thắng.' },
  { id:'timing', name:'Đoán nhịp', icon:'clock', description:'Chạm một lần khi bạn nghĩ đã đủ 3 giây. Ai gần mốc hơn thắng.' },
];

export const winningScore = 3;
const roundModes = modes.slice(1).map(mode => mode.id);

function readyRound(state, round = state.round, index = state.index) {
  return { ...state, round, index, phase:'ready', ready:[false,false], counts:[0,0],
    guesses:[null,null], startedAt:null, deadline:null, result:null,
    mode:state.playlist === 'mixed' ? roundModes[index % roundModes.length] : state.playlist };
}

export function newMatch(playlist) {
  return readyRound({ playlist, round:1, index:0, score:[0,0] });
}

function finish(state, winner, reason, values = null) {
  const score = state.score.map((value, player) => value + Number(winner === player));
  const phase = score.includes(winningScore) ? 'complete' : 'result';
  return { ...state, phase, score, deadline:null, result:{ winner, reason, values } };
}

function finishTiming(state, guesses) {
  const errors = guesses.map(value => value === null ? Infinity : Math.abs(value - 3000));
  const winner = errors[0] === errors[1] ? null : errors[0] < errors[1] ? 0 : 1;
  return finish({ ...state, guesses }, winner, 'timing', guesses);
}

function advance(state, now, delay) {
  if (state.deadline === null || now < state.deadline) return state;
  switch (state.phase) {
    case 'countdown':
      if (state.mode === 'reaction') return { ...state, phase:'waiting', deadline:now + delay };
      return { ...state, phase:'play', startedAt:now, deadline:now + (state.mode === 'taps' ? 5000 : 6000) };
    case 'waiting':
      return { ...state, phase:'play', startedAt:now, deadline:now + 8000 };
    case 'play':
      if (state.mode === 'reaction') return finish(state, null, 'timeout');
      if (state.mode === 'timing') return finishTiming(state, state.guesses);
      return finish(state, state.counts[0] === state.counts[1] ? null : state.counts[0] > state.counts[1] ? 0 : 1, 'taps', state.counts);
    default:
      return state;
  }
}

export function duel(state, action) {
  if (action.type === 'start') return newMatch(action.playlist);
  if (action.type === 'lobby') return null;
  if (!state || action.round !== state.round) return state;
  if (action.type === 'next' && state.phase === 'result') {
    const index = state.index + Number(state.result.winner !== null);
    return readyRound(state, state.round + 1, index);
  }
  if (action.type === 'interrupt' && ['countdown','waiting','play'].includes(state.phase)) {
    return readyRound(state, state.round + 1);
  }
  if (action.type === 'clock') {
    if (action.deadline !== state.deadline) return state;
    return advance(state, action.now, action.delay);
  }
  if (action.type !== 'press') return state;
  const { player, now } = action;
  if (state.phase === 'ready') {
    if (state.ready[player]) return state;
    const ready = state.ready.map((value, index) => value || index === player);
    return ready.every(Boolean) ? { ...state, ready, phase:'countdown', deadline:now + 3000 } : { ...state, ready };
  }
  // The reaction signal opens only after the clock event. Other rounds stop at the deadline even if the browser timer is late.
  if (state.phase === 'waiting') return finish(state, 1-player, 'early', [player]);
  if (state.phase !== 'play') return state;
  if (now >= state.deadline) return advance(state, now);
  if (state.mode === 'reaction') return finish(state, player, 'reaction', [Math.round(now - state.startedAt)]);
  if (state.mode === 'taps') return { ...state, counts:state.counts.map((value,index) => value + Number(index === player)) };
  if (state.guesses[player] !== null) return state;
  const guesses = state.guesses.map((value,index) => index === player ? Math.round(now - state.startedAt) : value);
  return guesses.every(value => value !== null) ? finishTiming(state, guesses) : { ...state, guesses };
}
