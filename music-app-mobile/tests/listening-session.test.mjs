import test from 'node:test';
import assert from 'node:assert/strict';
import { createListeningProgress, measureListening, resetListeningPosition } from '../utils/listening-session.ts';

test('counts actual continuous playback', () => {
  const session = createListeningProgress(0);
  measureListening(session, 0, true, 0);
  measureListening(session, 10, true, 10000);
  assert.equal(session.seconds, 10);
});

test('seeking to the end does not count as listening', () => {
  const session = createListeningProgress(0);
  measureListening(session, 0, true, 0);
  measureListening(session, 175, true, 1000);
  assert.equal(session.seconds, 0);
});

test('known seek resets the baseline', () => {
  const session = createListeningProgress(0);
  measureListening(session, 0, true, 0);
  measureListening(session, 10, true, 10000);
  resetListeningPosition(session, 170, 10000);
  measureListening(session, 171, true, 11000);
  assert.equal(session.seconds, 11);
});

test('paused time and resume jump are not listening', () => {
  const session = createListeningProgress(0);
  measureListening(session, 0, true, 0);
  measureListening(session, 10, true, 10000);
  measureListening(session, 10, false, 11000);
  measureListening(session, 10, true, 100000);
  measureListening(session, 11, true, 101000);
  assert.equal(session.seconds, 11);
});

test('delayed background sample counts only advancing audio', () => {
  const session = createListeningProgress(0);
  measureListening(session, 0, true, 0);
  measureListening(session, 120, true, 120000);
  assert.equal(session.seconds, 120);
});

test('buffering and invalid positions never inflate listening', () => {
  const session = createListeningProgress(0);
  measureListening(session, 0, true, 0);
  measureListening(session, 0, true, 10000);
  measureListening(session, NaN, true, 11000);
  measureListening(session, -1, true, 12000);
  assert.equal(session.seconds, 0);
});

test('a new listening session starts with no previous interest', () => {
  const first = createListeningProgress(0);
  measureListening(first, 0, true, 0);
  measureListening(first, 40, true, 40000);
  assert.equal(createListeningProgress(40000).seconds, 0);
});
