// test/dream.test.js — dreaming, receipted: consolidation relocates,
// refusal refuses, and both book chain-verifiable receipts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../src/core.js';
import { consolidateMemory } from '../src/dream.js';

const ROWS = [
  { id: 'm0', at: 't0', text: 'gateway flapped; direct work doctrine held' },
  { id: 'm1', at: 't1', text: 'seed 3 shipped with receipted checks' },
  { id: 'm2', at: 't2', text: 'FLUCTLIGHT is WAL replay prior art' },
  { id: 'm3', at: 't3', text: 'dreaming consolidates with receipts' },
  { id: 'm4', at: 't4', text: 'waking row stays live' },
];

const SUMMARIZE = (batch) => batch.map((m) => m.text).join(' · ');

test('old tail consolidates; recent row stays live; originals achieved not deleted', () => {
  const ledger = new Ledger('agent-dream');
  const r = consolidateMemory({ entries: ROWS, ledger, windowSize: 2, keepRecent: 1, summarize: SUMMARIZE });

  assert.equal(r.dreamed, 2);
  assert.equal(r.refused, 0);
  assert.deepEqual(r.kept.map((m) => m.id), ['m4']);
  assert.equal(r.consolidated.length, 2);
  assert.deepEqual(r.consolidated[0].sources, ['m0', 'm1']);
  assert.deepEqual(r.consolidated[1].sources, ['m2', 'm3']);
  assert.equal(r.achieved.length, 4);
  assert.ok(r.achieved.every((m) => m.state === 'achieved'));
  assert.ok(r.achieved.every((m) => m.supersededBy.startsWith('dream:')));
  assert.equal(r.verified, true);
});

test('no summarizer → refusal receipts, originals stay live, nothing invented', () => {
  const ledger = new Ledger('agent-dream');
  const r = consolidateMemory({ entries: ROWS.slice(0, 3), ledger, windowSize: 2, keepRecent: 0 });

  assert.equal(r.dreamed, 0);
  assert.equal(r.refused, 2);
  assert.equal(r.consolidated.length, 0);
  assert.deepEqual(r.kept.map((m) => m.id), ['m0', 'm1', 'm2']);
  assert.equal(r.verified, true);
  assert.deepEqual(ledger.entries.map((e) => JSON.parse(e.body).kind), ['dream-refusal', 'dream-refusal']);
});

test('empty summary is a refusal, not a memory', () => {
  const ledger = new Ledger('agent-dream');
  const r = consolidateMemory({
    entries: ROWS.slice(0, 2), ledger, windowSize: 2, keepRecent: 0,
    summarize: () => '   ',
  });

  assert.equal(r.dreamed, 0);
  assert.equal(r.refused, 1);
  assert.equal(JSON.parse(ledger.entries[0].body).extra.reason, 'empty summary');
});

test('booked dream row is replayable and tamper-named at its own index', () => {
  const ledger = new Ledger('agent-dream');
  const r = consolidateMemory({ entries: ROWS.slice(0, 2), ledger, windowSize: 2, keepRecent: 0, summarize: SUMMARIZE });
  assert.equal(r.verified, true);

  const row = JSON.parse(ledger.entries[0].body);
  assert.equal(row.kind, 'dream');
  assert.equal(JSON.parse(row.payload).sources.length, 2);

  ledger.entries[0].body = ledger.entries[0].body.replace('gateway flapped', 'gateway calm');
  assert.equal(ledger.verify(), false);
});

test('same inputs and summarizer produce the same consolidated id', () => {
  const a = consolidateMemory({ entries: ROWS.slice(0, 2), summarize: SUMMARIZE });
  const b = consolidateMemory({ entries: ROWS.slice(0, 2), summarize: SUMMARIZE });
  assert.equal(a.consolidated[0].id, b.consolidated[0].id);
});
