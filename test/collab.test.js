// test/collab.test.js — seed 5: collaboration-paradox instrument.
// Fixture is SYNTHETIC and labeled as such: it pins the mechanism, it is
// not field data (per docs/AGENTIC-CYCLE.md, fixtures never refute papers).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../src/core.js';
import { readCollab, bookCollab } from '../src/collab.js';

const FIXTURE = [
  { id: 'a1', path: 'delegated', resolved: true },                    // 1/6
  { id: 'b2', path: 'reviewed', reviewPasses: 2, resolved: true },    // shipped after gate
  { id: 'c3', path: 'reviewed', reviewPasses: 4, resolved: false },   // WALL
  { id: 'd4', path: 'reviewed', reviewPasses: 3, resolved: false },   // WALL
  { id: 'e5', path: 'direct', resolved: true },
  { id: 'f6', path: 'direct', resolved: true },
];

test('classifies by resolution path and reads the band', () => {
  const r = readCollab(FIXTURE);
  assert.equal(r.n, 6);
  assert.deepEqual(r.counts, { delegated: 1, reviewed: 3, direct: 2 });
  assert.equal(r.delegationShare, 1 / 6);
  assert.equal(r.paradoxBand, 'in-band');   // 16.7% ≤ 20% — corroborates
  assert.equal(r.resolved, 4);
  assert.equal(r.unresolved, 2);
});

test('walls are named per-item, never averaged away', () => {
  const r = readCollab(FIXTURE);
  assert.deepEqual(r.walled, [
    { id: 'c3', reviewPasses: 4 },
    { id: 'd4', reviewPasses: 3 },
  ]);
  // no scalar wall-latency field exists to hide behind:
  assert.ok(!('avgReviewPasses' in r));
});

test('a 21%+ sample reads divergent and names the sample, not the paper', () => {
  const items = Array.from({ length: 10 }, (_, i) =>
    ({ id: `x${i}`, path: 'delegated', resolved: true }));
  const r = readCollab(items);
  assert.equal(r.delegationShare, 1);
  assert.equal(r.paradoxBand, 'divergent');
});

test('empty ledger of items is a null reading, not a zero', () => {
  const r = readCollab([]);
  assert.equal(r.delegationShare, null);
  assert.equal(r.paradoxBand, null);
});

test('duplicate ids and unknown paths are errors, not merges', () => {
  assert.throws(() => readCollab([
    { id: 'a', path: 'direct' }, { id: 'a', path: 'direct' },
  ]), /duplicate item id/);
  assert.throws(() => readCollab([{ id: 'a', path: 'wishful' }]), /unknown path/);
});

test('reviewPasses defaults to 0; resolved reviewed items are not walls', () => {
  const r = readCollab([{ id: 'r', path: 'reviewed', resolved: true }]);
  assert.deepEqual(r.walled, []);
});

test('the reading is booked and the chain verifies', () => {
  const ledger = new Ledger('collab-test');
  const r = readCollab(FIXTURE);
  bookCollab(ledger, 'fixture-synthetic-01', r);
  bookCollab(ledger, 'fixture-synthetic-01', r);   // second sweep, new receipt
  assert.equal(ledger.verify(), true);
  const row = JSON.parse(ledger.entries[0].body);
  assert.equal(row.kind, 'collab');
  assert.equal(row.state, 'fixture-synthetic-01');
  const payload = JSON.parse(row.payload);
  assert.equal(payload.delegationShare, 1 / 6);
  assert.equal(payload.paradoxBand, 'in-band');
  assert.equal(payload.walledCount, 2);
});

test('a tampered booked row breaks the chain at its own row', () => {
  const ledger = new Ledger('collab-test');
  bookCollab(ledger, 'src', readCollab(FIXTURE));
  ledger.entries[0].body = ledger.entries[0].body.replace('in-band', 'divergent');
  assert.equal(ledger.verify(), false);
});
