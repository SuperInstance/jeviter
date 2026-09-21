// test/fidelity.test.js — the fidelity cell's doctrine, pinned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureFidelity, bookFidelity, sha256Hex } from '../src/fidelity.js';
import { Ledger } from '../src/core.js';

const CLAIMS = [
  { path: 'CANON.md', sha256: sha256Hex('the canon') },
  { path: 'docs/SPEC.md', sha256: sha256Hex('the spec') },
  { path: 'src/core.js', sha256: sha256Hex('the core') },
];
const WORLD = { 'CANON.md': 'the canon', 'docs/SPEC.md': 'the spec', 'src/core.js': 'the core' };

test('all claims hash-match → fidelity 1.0, complete', () => {
  const r = measureFidelity(CLAIMS, p => WORLD[p] ?? null);
  assert.equal(r.fidelity, 1);
  assert.equal(r.complete, true);
  assert.deepEqual(r.drift, []);
  assert.deepEqual(r.missing, []);
});

test('hash mismatch is named drift per path — never a scalar', () => {
  const world = { ...WORLD, 'src/core.js': 'the core, drifted' };
  const r = measureFidelity(CLAIMS, p => world[p] ?? null);
  assert.equal(r.fidelity, 2 / 3);
  assert.deepEqual(r.drift, ['src/core.js']);
});

test('absent artifact → MISSING, reading INCOMPLETE (fidelity null)', () => {
  const world = { ...WORLD }; delete world['docs/SPEC.md'];
  const r = measureFidelity(CLAIMS, p => world[p] ?? null);
  assert.equal(r.fidelity, null);
  assert.equal(r.complete, false);
  assert.deepEqual(r.missing, ['docs/SPEC.md']);
  // an unchecked claim is never a fidelity claim — 2/2 matches
  // still cannot report a number.
});

test('zero claims → fidelity null (undefined, not high)', () => {
  const r = measureFidelity([], () => null);
  assert.equal(r.fidelity, null);
  assert.equal(r.complete, true);
});

test('reading books as a replayable, chain-verified receipt', () => {
  const l = new Ledger('fidelity-cell');
  const r = measureFidelity(CLAIMS, p => WORLD[p] ?? null);
  bookFidelity(l, 'demo-vessel', r);
  assert.equal(l.verify(), true);
  const row = JSON.parse(l.entries[0].body);
  assert.equal(row.kind, 'fidelity');
  assert.equal(JSON.parse(row.payload).fidelity, 1);
  assert.equal(row.cell, 'fidelity-cell');
});

test('tampered booked row breaks the chain at its own index', () => {
  const l = new Ledger('fidelity-cell');
  bookFidelity(l, 'demo-vessel', measureFidelity(CLAIMS, p => WORLD[p] ?? null));
  l.entries[0].body = l.entries[0].body.replace('demo-vessel', 'other-vessel');
  assert.equal(l.verify(), false);
});
