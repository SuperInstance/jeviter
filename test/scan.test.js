// test/scan.test.js — scanLedger read-back: chain verify, kind census,
// honest readings (quiet/alive/tamper/empty). A quiet stream is a RECEIPTED
// quiet stream, not a hang — scan is how you tell.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JevIterator, Ledger, Throttle, scanLedger } from '../src/core.js';

function* periodic(lines) { yield* lines; }

test('scan: fresh ledger verifies and reads EMPTY', () => {
  const r = scanLedger([]);
  assert.equal(r.verified, true);
  assert.equal(r.reading.startsWith('EMPTY'), true);
});

test('scan: all-silence ledger verifies and reads QUIET (not a hang)', () => {
  const ledger = new Ledger('t');
  const it = new JevIterator(periodic(Array(30).fill('same same same')), { ledger });
  for (const _ of it) assert.fail('periodic constant stream must emit nothing');
  const r = scanLedger(ledger.entries);
  assert.equal(r.verified, true);
  assert.equal(r.events, 0);
  assert.equal(r.kinds.seed, 1);
  assert.equal(r.kinds.silence, 29);
  assert.equal(r.reading.startsWith('QUIET'), true);
});

test('scan: mixed stream reads ALIVE with admission rate', () => {
  const ledger = new Ledger('t');
  // letter-class organ: shape must differ in CLASS counts, not letters
  // ('aa bb cc' vs 'zz qq vv' are the SAME profile — pinned behavior);
  // and KL over disjoint support is 0, so the shift must keep overlap.
  const lines = ['aa bb cc', 'aa bb ccc', 'aa bb ccc', 'aeiou x', 'aeiou x'];
  const it = new JevIterator(periodic(lines), { ledger });
  const ticks = [...it].map((e) => e.value?.tick ?? e.tick);
  assert.deepEqual(ticks, [1, 2]);
  const r = scanLedger(ledger.entries);
  assert.equal(r.verified, true);
  assert.equal(r.events, 2);
  assert.equal(r.kinds.silence, 2);
  assert.equal(r.reading.startsWith('ALIVE'), true);
  assert.match(r.reading, /admission 50\.0%/);
});

test('scan: tamper breaks at its own row', () => {
  const ledger = new Ledger('t');
  const it = new JevIterator(periodic(['aa bb cc', 'aeiou x', '123 456']), { ledger });
  [...it];
  const entries = ledger.entries.map((e) => ({ ...e }));
  entries[1] = { body: entries[1].body.replace('event', 'ev ants'), hash: entries[1].hash };
  const r = scanLedger(entries);
  assert.equal(r.verified, false);
  assert.equal(r.brokenAt, 1);
  assert.match(r.reading, /TAMPER — chain breaks at row 1/);
});

test('scan: accepts persisted-hex hashes (jsonl round-trip form)', () => {
  const ledger = new Ledger('t');
  const it = new JevIterator(periodic(['aa bb cc', 'aeiou x']), { ledger });
  [...it];
  const persisted = ledger.entries.map((e) => ({
    body: e.body, hash: e.hash.toString(16).padStart(16, '0'),
  }));
  const r = scanLedger(persisted);
  assert.equal(r.verified, true);
  assert.equal(r.events, 1);
});

test('scan: throttle ledger kinds counted (shed receipts are first-class)', () => {
  const ledger = new Ledger('t-throttle');
  const th = new Throttle((s) => s.length, { ledger, window: 8 });
  for (let i = 0; i < 20; i++) th.call('identical payload');
  const r = scanLedger(ledger.entries);
  assert.equal(r.verified, true);
  assert.equal(r.kinds.escalated, 1);       // seed only — the ratchet holds
  assert.equal(r.kinds.shed, 19);
  assert.equal(r.reading.startsWith('QUIET'), true);
});
