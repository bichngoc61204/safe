export const moveLimit = 400;
export const teams = [
  { name:'Mèo Mơ', badge:'MÈO', color:'mint' },
  { name:'Gà Bông', badge:'GÀ', color:'peach' },
];
const isQuan = pit => pit === 0 || pit === 6;
export const side = player => player === 0 ? [1,2,3,4,5] : [7,8,9,10,11];
const step = (pit, direction) => (pit + direction + 12) % 12;
export const encodeMove = (pit, direction) => pit * 2 + Number(direction === 1);

export function newBoard() {
  return { stones:[0,5,5,5,5,5,0,5,5,5,5,5], royals:[true,true], scores:[0,0],
    turn:0, number:0, over:false, winner:null, last:null };
}

export function canPlay(board, pit) {
  return !board.over && side(board.turn).includes(pit) && board.stones[pit] > 0;
}

export function playQuan(board, pit, direction, animate = false) {
  if (!canPlay(board, pit) || (direction !== 1 && direction !== -1)) return null;
  const { turn } = board;
  const stones = [...board.stones], royals = [...board.royals], scores = [...board.scores];
  const filled = index => stones[index] > 0 || (isQuan(index) && royals[index / 6]);
  const frames = [];
  const captureFrame = (active, dropped = false) => {
    if (animate) frames.push({ stones:[...stones], royals:[...royals], scores:[...scores], active, dropped });
  };
  const positions = new Set();
  let cursor = pit, points = 0;
  for (;;) {
    const position = `${cursor}:${stones.join(',')}`;
    if (positions.has(position)) break;
    positions.add(position);
    const handful = stones[cursor];
    stones[cursor] = 0;
    captureFrame(cursor);
    for (let i = 0; i < handful; i++) {
      cursor = step(cursor, direction);
      stones[cursor]++;
      captureFrame(cursor, true);
    }
    cursor = step(cursor, direction);
    if (!filled(cursor)) {
      while (!filled(cursor)) {
        const target = step(cursor, direction);
        if (!filled(target)) break;
        let eaten = stones[target];
        if (isQuan(target) && royals[target / 6]) { eaten += 10; royals[target / 6] = false; }
        stones[target] = 0;
        points += eaten;
        scores[turn] += eaten;
        captureFrame(target);
        cursor = step(target, direction);
      }
      break;
    }
    if (isQuan(cursor)) break;
  }
  const next = 1 - turn;
  const ended = royals.every(value => !value);
  const limited = !ended && board.number + 1 >= moveLimit;
  let refill = false;
  if (ended) {
    for (const player of [0,1]) {
      for (const index of side(player)) { scores[player] += stones[index]; stones[index] = 0; }
    }
    // Dân còn nằm ở hai ô quan đã mất thuộc về người vừa kết thúc ván.
    scores[turn] += stones[0] + stones[6];
    stones[0] = stones[6] = 0;
  } else if (!limited && side(next).every(index => stones[index] === 0)) {
    // Điểm âm thể hiện phần dân đi vay để rải lại, được trừ khi tính điểm cuối ván.
    refill = true;
    scores[next] -= 5;
    for (const index of side(next)) stones[index] = 1;
  }
  const winner = ended && scores[0] !== scores[1] ? Number(scores[1] > scores[0]) : null;
  return { board:{ stones, royals, scores, turn:next, number:board.number + 1, over:ended || limited,
    winner, last:{ pit, direction, player:turn, points, refill } }, frames };
}

export function replayQuan(moves, animateLast = false) {
  let board = newBoard();
  let frames = [];
  for (const [index, move] of moves.entries()) {
    if (!Number.isInteger(move)) return null;
    const next = playQuan(board, Math.floor(move / 2), move % 2 === 1 ? 1 : -1, animateLast && index === moves.length - 1);
    if (!next) return null;
    ({ board, frames } = next);
  }
  return { board, frames };
}
