import test from 'node:test';
import assert from 'node:assert/strict';
import { canPlay, encodeMove, newBoard, playQuan, replayQuan, side } from './quan.js';

test('a move can capture through successive empty pits including a quan', () => {
  const board = { ...newBoard(), stones:[0,1,0,0,3,0,0,1,0,0,0,0] };
  const move = playQuan(board,1,1,true);
  assert.deepEqual(move.board.royals,[true,false]);
  assert.deepEqual(move.board.scores,[13,0]);
  assert.equal(move.board.turn,1);
  assert.ok(move.frames.some(frame => frame.active === 6 && !frame.royals[1]));
  assert.equal(playQuan(board,7,1),null);
});

test('an empty row refills and records its five-point debt', () => {
  const board = { ...newBoard(), stones:[0,0,0,0,0,1,0,0,0,0,0,0] };
  const next = playQuan(board,5,1).board;
  assert.equal(next.last.refill,true);
  assert.equal(next.scores[1],-5);
  assert.deepEqual(side(1).map(pit => next.stones[pit]),[1,1,1,1,1]);
});

test('capturing the last quan collects the remaining dân and ends the game', () => {
  const board = { ...newBoard(), royals:[true,false], stones:[0,0,0,1,2,0,0,0,0,0,0,4] };
  const next = playQuan(board,3,-1).board;
  assert.equal(next.over,true);
  assert.equal(next.winner,0);
  assert.deepEqual(next.scores,[13,4]);
  assert.ok(next.stones.every(count => count === 0));
  assert.equal(canPlay(next,11),false);
});

test('a room log replays identically on both devices and rejects illegal turns', () => {
  const move = encodeMove(1,1);
  const expected = playQuan(newBoard(),1,1).board;
  assert.deepEqual(replayQuan([move]).board,expected);
  assert.equal(replayQuan([move,encodeMove(2,-1)]),null);
});
