import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fnv1a64, profile, klGain, Q16 } from '../src/profile.js';
import { JevIterator, Ledger, Throttle } from '../src/core.js';

const CALM = 'INFO request served ok';
const HOT = 'CRITICAL disk burning node-7';

test('café Δ pin — fleet canon cross-language', () => {
  assert.equal(fnv1a64('café Δ 日本語').toString(16).padStart(16, '0'), '24a555471370b18d');
});

test('seed is not news', () => {
  const l = new Ledger();
  const it = new JevIterator([CALM, CALM, CALM], { ledger: l });
  assert.deepEqual([...it].length, 0);
  assert.equal(l.entries[0].body.includes('"seed"'), true);
  assert.equal(l.verify(), true);
});

test('one shift yields exactly once; silence booked', () => {
  const l = new Ledger();
  const it = new JevIterator([...Array(10).fill(CALM), ...Array(10).fill(HOT)], { ledger: l });
  const evs = [...it];
  assert.equal(evs.length, 1);
  assert.equal(evs[0].gain > 0, true);
  const kinds = l.entries.map((e) => JSON.parse(e.body).kind);
  assert.equal(kinds.filter((k) => k === 'silence').length, 18);
  assert.equal(l.verify(), true);
});

test('THE RATCHET: fixed-amplitude oscillation silences after one admission', () => {
  const stream = Array.from({ length: 400 }, (_, t) => (t % 50) < 25 ? CALM : HOT);
  const l = new Ledger();
  const evs = [...new JevIterator(stream, { k: 2, ledger: l })];
  assert.equal(evs.length, 1);
  assert.equal(l.entries.length, 401);
  assert.equal(l.verify(), true);
});

test('throttle: flood self-sheds, ratchet blocks alternating-payload attacker', () => {
  const t = new Throttle((s) => s);
  for (let i = 0; i < 200; i++) t.call('attack payload');
  assert.ok(t.escalated <= 2, `flood escalated ${t.escalated}`);
  for (let i = 0; i < 20; i++) t.call(`attack payload ${i}`);   // alternation
  assert.ok(t.escalated < 20, 'ratchet: sustained novelty becomes normal');
  assert.equal(t.ledger.verify(), true);
});

test('ledger tamper breaks at its own row', () => {
  const l = new Ledger();
  [...new JevIterator([CALM, HOT], { ledger: l })];
  const good = l.entries[1].hash;
  l.entries[1].hash = good ^ 1n;
  assert.equal(l.verify(), false);
});

test('Q16 exactness: reciprocal multiplication, no float identity', () => {
  const q = new Q16(1, 3).mul(new Q16(3, 1));
  assert.equal(q.n, 3n); assert.equal(q.d, 3n);
  assert.ok(Math.abs(profile('abc def').vowels.f() - 2 / 7) < 1e-12);
});
