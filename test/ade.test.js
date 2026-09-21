// test/ade.test.js — the ADE bridge's doctrine, pinned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adeDoctrine, artifactReader, runAdeTool } from '../src/ade.js';
import { sha256Hex } from '../src/fidelity.js';
import { Ledger } from '../src/core.js';

const WORLD = {
  'CANON.md': 'mission sentence, one only',
  'src/core.js': 'the implementation',
};
const CLAIMS = Object.keys(WORLD).map((path) => ({
  path, sha256: sha256Hex(WORLD[path]),
}));

test('manifest names the bridge, doctrine, and callable gates', () => {
  const m = adeDoctrine();
  assert.equal(m.name, 'jeviter-ade-bridge');
  assert.ok(m.doctrine.includes('book every silence'));
  assert.ok(m.doctrine.includes('an unchecked claim is never a fidelity claim'));
  assert.deepEqual(m.tools, ['fleet_doctrine', 'fleet_spec_fidelity', 'fleet_collab_read']);
});

test('artifactReader reads the provided world and nothing else', () => {
  const read = artifactReader(WORLD);
  assert.equal(read('CANON.md'), WORLD['CANON.md']);
  assert.equal(read('docs/MISSING.md'), null);
});

test('fleet_doctrine books the manifest as a replayable receipt', () => {
  const ledger = new Ledger('ade-test');
  const r = runAdeTool('fleet_doctrine', { ledger });
  assert.equal(r.manifest.name, 'jeviter-ade-bridge');
  assert.equal(r.receipt.cell, 'ade-test');
  assert.equal(r.receipt.verified, true);
  assert.equal(JSON.parse(ledger.entries[0].body).kind, 'ade-doctrine');
});

test('fleet_spec_fidelity crosses as named drift, not a scalar vibe', () => {
  const ledger = new Ledger('ade-test');
  const drifted = { ...WORLD, 'src/core.js': 'the implementation, drifted' };
  const r = runAdeTool('fleet_spec_fidelity', {
    ledger, vessel: 'warp-fixture', claims: CLAIMS, artifacts: drifted,
  });
  assert.equal(r.result.fidelity, 1 / 2);
  assert.deepEqual(r.result.drift, ['src/core.js']);
  assert.equal(r.receipt.verified, true);
  assert.equal(JSON.parse(ledger.entries[0].body).kind, 'fidelity');
});

test('fleet_spec_fidelity refuses incomplete readings as fidelity null', () => {
  const partial = { 'CANON.md': WORLD['CANON.md'] };
  const r = runAdeTool('fleet_spec_fidelity', { claims: CLAIMS, artifacts: partial });
  assert.equal(r.result.fidelity, null);
  assert.equal(r.result.complete, false);
  assert.deepEqual(r.result.missing, ['src/core.js']);
});

test('fleet_collab_read carries named review walls', () => {
  const ledger = new Ledger('ade-test');
  const r = runAdeTool('fleet_collab_read', {
    ledger,
    source: 'intent-fixture',
    items: [
      { id: 'task-a', path: 'delegated', resolved: true },
      { id: 'task-b', path: 'reviewed', resolved: false, reviewPasses: 3 },
      { id: 'task-c', path: 'direct', resolved: true },
    ],
  });
  assert.equal(r.result.delegationShare, 1 / 3);
  assert.deepEqual(r.result.walled, [{ id: 'task-b', reviewPasses: 3 }]);
  assert.equal(r.receipt.verified, true);
  assert.equal(JSON.parse(ledger.entries[0].body).kind, 'collab');
});

test('unknown bridge tool is an error, not a silent receipt', () => {
  assert.throws(() => runAdeTool('fleet_vibes', {}), /unknown ADE tool/);
});
