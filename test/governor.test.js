// test/governor.test.js — seed 7: sequential-merge governor.
// Fixture is SYNTHETIC and labeled as such: it pins the mechanism.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../src/core.js';
import { MergeGovernor, shapeOf, readGovernor } from '../src/governor.js';

const fam = (id) => ({ id, files: ['src/a.js'], adds: 40, dels: 10 });
const dv = { id: 'dv', files: ['ci/pipeline.yml'], adds: 400, dels: 20 };

test('shape: top-level areas + magnitude class, deterministic', () => {
  assert.equal(shapeOf(fam('x')), 'src:M');
  assert.equal(shapeOf(dv), 'ci:L');
  assert.equal(shapeOf({ files: ['a/1.js', 'a/2.js'], adds: 5, dels: 0 }), 'a:S');
  assert.equal(shapeOf({}), '?:S');   // unknown files, no churn — never throws
});

test('no belief, no rest: the first merge seeds and is not news', () => {
  const g = new MergeGovernor();
  const r = g.consider(dv);
  assert.equal(r.merged, true); assert.equal(r.seed, true);
  assert.equal(g.resting, 0);                       // queue open immediately
  assert.equal(g.rests, 0);                         // seed buys no rest
});

test('a divergent merge admits AND the queue rests a fixed length', () => {
  const g = new MergeGovernor({ restLen: 3 });
  g.consider(fam('f1')); g.consider(fam('f2')); g.consider(fam('f3'));
  const d = g.consider(dv);
  assert.equal(d.merged, true); assert.equal(d.divergent, true);
  assert.equal(d.rest, 3); assert.equal(g.resting, 3);
  const helds = [g.consider(fam('h1')), g.consider(fam('h2')), g.consider(fam('h3'))];
  for (const h of helds) assert.equal(h.merged, false);
  assert.deepEqual(helds.map((h) => h.restLeft), [2, 1, 0]);
  assert.equal(g.consider(fam('after')).merged, true);  // queue re-opened
});

test('rest length is a count of held PRs, never wall-clock', () => {
  const g = new MergeGovernor({ restLen: 2 });
  g.consider(fam('f1')); g.consider(dv);
  // no time API exists on the governor; rest only advances via consider()
  assert.equal(g.resting, 2);
  const code = Object.getOwnPropertyNames(MergeGovernor.prototype);
  assert.ok(!code.includes('setTimeout') && !code.includes('Date'));
});

test('THE RATCHET: one divergent shape buys exactly one rest', () => {
  const g = new MergeGovernor({ restLen: 2 });
  g.consider(fam('f1')); g.consider(fam('f2')); g.consider(fam('f3'));
  g.consider(dv);                                     // divergent → rest #1
  g.consider(fam('h1')); g.consider(fam('h2'));       // rest consumed
  const again = g.consider({ ...dv, id: 'dv-again' });
  assert.equal(again.merged, true);
  assert.equal(again.divergent, false, 'same shape is now familiar');
  assert.equal(g.resting, 0, 'no second rest from a rehearsed shape');
  assert.equal(g.rests, 1);
});

test('alternating fixed shapes cannot keep the queue closed (anti-jam)', () => {
  const g = new MergeGovernor({ restLen: 2 });
  g.consider(fam('f1')); g.consider(fam('f2')); g.consider(fam('f3'));
  const A = { id: 'A', files: ['attic/a.js'], adds: 500, dels: 0 };
  const B = { id: 'B', files: ['basement/b.js'], adds: 0, dels: 500 };
  const seq = [];
  for (let i = 0; i < 6; i++) seq.push(g.consider(i % 2 ? A : B));
  const totalRests = g.rests;
  const lastThree = seq.slice(-3);
  for (const r of lastThree) {
    assert.equal(r.merged, true, 'attacker cannot stay divergent by rehearsal');
    assert.equal(r.divergent, false);
  }
  assert.ok(totalRests <= 2, `rehearsal bought ${totalRests} rests, ratchet capped it`);
  assert.equal(g.resting, 0, 'queue ends OPEN — jam failed');
});

test('every decision is booked and the chain verifies; held included', () => {
  const g = new MergeGovernor({ restLen: 2 });
  g.consider(fam('f1')); g.consider(dv);
  g.consider(fam('h1')); g.consider(fam('h2'));
  g.consider(fam('ok'));
  const kinds = g.ledger.entries.map((e) => JSON.parse(e.body).kind);
  assert.deepEqual(kinds, ['seed', 'merged-divergent', 'held', 'held', 'merged']);
  assert.equal(g.ledger.verify(), true);
  // held rows carry restLeft so the audit can replay the jam exactly:
  const heldRow = JSON.parse(g.ledger.entries[2].body);
  assert.equal(heldRow.kind, 'held');
  assert.equal(heldRow.extra.restLeft, 1);
});

test('tamper with a held row breaks the chain at its own row', () => {
  const g = new MergeGovernor({ restLen: 1 });
  g.consider(fam('f1')); g.consider(dv); g.consider(fam('h1'));
  g.ledger.entries[2].body = g.ledger.entries[2].body.replace('held', 'merge');
  assert.equal(g.ledger.verify(), false);
});

test('readGovernor reports the queue state without scalar hiding places', () => {
  const g = new MergeGovernor({ restLen: 2 });
  g.consider(fam('f1')); g.consider(dv); g.consider(fam('h1'));
  const r = readGovernor(g);
  assert.equal(r.merged, 2); assert.equal(r.held, 1); assert.equal(r.rests, 1);
  assert.equal(r.queueOpen, false);
  assert.equal(r.chainVerified, true);
  assert.ok(!('avgGain' in r) && !('score' in r));
});
