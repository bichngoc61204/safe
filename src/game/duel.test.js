import test from 'node:test';
import assert from 'node:assert/strict';
import { duel, newMatch } from './duel.js';

const press = (state, player, now = 0) => duel(state, {type:'press', round:state.round, player, now});
const clock = (state, now = state.deadline) => duel(state, {type:'clock', round:state.round, deadline:state.deadline, now, delay:1400});
const ready = state => press(press(state, 0), 1);
const next = state => duel(state, {type:'next', round:state.round});

test('both players must be ready and a reaction false start awards the other player', () => {
  const oneReady = press(newMatch('mixed'), 0);
  assert.equal(press(oneReady, 0), oneReady);
  const countdown = press(oneReady, 1);
  assert.equal(press(countdown, 0, 1000), countdown);
  const waiting = clock(countdown);
  const result = press(waiting, 0, waiting.deadline - 1);
  assert.deepEqual(result.score, [0,1]);
  assert.equal(result.result.reason, 'early');
  assert.equal(next(result).mode, 'taps');
});

test('a reaction timeout replays the same mixed mode without a point', () => {
  const playing = clock(clock(ready(newMatch('mixed'))));
  assert.equal(playing.phase, 'play');
  const timeout = clock(playing);
  assert.deepEqual(timeout.score, [0,0]);
  assert.equal(next(timeout).mode, 'reaction');
  assert.equal(next(timeout).index, 0);
});

test('tap rounds count both players and exclude late taps even when the timer has not fired', () => {
  const playing = clock(ready(newMatch('taps')));
  let state = press(playing, 0, playing.startedAt + 30);
  state = press(state, 1, playing.startedAt + 30);
  state = press(state, 1, playing.deadline - 1);
  state = press(state, 0, playing.deadline);
  assert.deepEqual(state.result.values, [1,2]);
  assert.deepEqual(state.score, [0,1]);
});

test('timing keeps each first guess and awards the closest player to 3 seconds', () => {
  const playing = clock(ready(newMatch('timing')));
  const guessed = press(playing, 1, playing.startedAt + 2750);
  assert.equal(press(guessed, 1, playing.startedAt + 3000), guessed);
  const result = press(guessed, 0, playing.startedAt + 3160);
  assert.deepEqual(result.result.values, [3160,2750]);
  assert.deepEqual(result.score, [1,0]);
});

test('interrupts preserve the score and obsolete timers cannot start another round', () => {
  const countdown = ready(newMatch('reaction'));
  const interrupted = duel(countdown, {type:'interrupt', round:countdown.round});
  assert.equal(interrupted.phase, 'ready');
  assert.deepEqual(interrupted.ready, [false,false]);
  const oldClock = {type:'clock', round:countdown.round, deadline:countdown.deadline, now:countdown.deadline, delay:1400};
  assert.equal(duel(interrupted, oldClock), interrupted);
});

test('the first player to reach three wins the match and replay starts from zero', () => {
  let state = newMatch('reaction');
  for (let index = 0; index < 3; index++) {
    const playing = clock(clock(ready(state)));
    state = press(playing, 1, playing.startedAt + 125);
    if (index < 2) state = next(state);
  }
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.score, [0,3]);
  assert.equal(next(state), state);
  assert.deepEqual(duel(state, {type:'start', playlist:'reaction'}).score, [0,0]);
});
