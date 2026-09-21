// test/tui.test.js — the panel's doctrine, pinned without a TTY.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTuiState, updateTuiState, renderTui, frame, TEARDOWN } from '../src/tui.js';

test('renderer is pure: same state, same string', () => {
  let s = createTuiState({ k: 1.5 });
  s = updateTuiState(s, { type: 'seed', text: 'first pull', pulls: 1 });
  s = updateTuiState(s, { type: 'event', text: 'shock', gain: 0.9, threshold: 0.2, pulls: 3 });
  assert.equal(renderTui(s), renderTui(structuredClone(s)));
});

test('does not mutate its input state', () => {
  let s = createTuiState();
  s = updateTuiState(s, { type: 'event', text: 'a', gain: 1, threshold: 0, pulls: 1 });
  const snapshot = structuredClone(s);
  renderTui(s);
  updateTuiState(s, { type: 'silence', text: 'b', gain: 0, threshold: 1, pulls: 2 });
  assert.deepEqual(s, snapshot);
});

test('seed is booked, not counted as an event', () => {
  const s = updateTuiState(createTuiState(), { type: 'seed', text: 'belief', pulls: 1 });
  assert.equal(s.seed, true);
  assert.equal(s.events, 0);
  assert.equal(s.silences, 0);
});

test('silence counts as data, admission reflects the ratio', () => {
  let s = createTuiState();
  s = updateTuiState(s, { type: 'seed', pulls: 1 });
  s = updateTuiState(s, { type: 'event', text: 'x', gain: 1, threshold: 0.1, pulls: 2 });
  s = updateTuiState(s, { type: 'silence', text: 'y', gain: 0, threshold: 0.1, pulls: 3 });
  s = updateTuiState(s, { type: 'silence', text: 'z', gain: 0, threshold: 0.1, pulls: 4 });
  assert.equal(s.silences, 2);
  assert.match(renderTui(s), /33\.3%/);   // 1 admitted of 3 receipts
});

test('recent receipts are capped at maxRecent, newest last', () => {
  let s = createTuiState({ maxRecent: 3 });
  for (let i = 0; i < 6; i++) {
    s = updateTuiState(s, { type: i % 2 ? 'silence' : 'event',
      text: `r${i}`, gain: 0.5, threshold: 0.1, pulls: i + 1 });
  }
  assert.equal(s.recent.length, 3);
  assert.equal(s.recent.at(-1).text, 'r5');
});

test('escape sequences never appear inside truncated text', () => {
  let s = createTuiState();
  s = updateTuiState(s, { type: 'event',
    text: '\x1b[31mred\x1b[0m ' + 'x'.repeat(200), gain: 1, threshold: 0, pulls: 1 });
  const out = renderTui(s);
  const lines = out.split('\n');
  for (const line of lines) {
    // every ESC must begin a well-formed CSI we emitted; payload text is stripped
    for (const m of line.matchAll(/\x1b/g)) {
      assert.ok(line[m.index + 1] === '[' || line[m.index + 1] === '?',
        `stray ESC at line: ${JSON.stringify(line.slice(0, 60))}`);
    }
  }
});

test('frame homes and clears; teardown restores cursor', () => {
  let s = createTuiState();
  s = updateTuiState(s, { type: 'exhausted' });
  const f = frame(s);
  assert.ok(f.startsWith('\x1b[?25l\x1b[H\x1b[2J'));
  assert.match(f, /EXHAUSTED/);
  assert.ok(TEARDOWN.includes('\x1b[?25h'));
});

// ── TUI v0.5: the read-back panel ──────────────────────────────────────────
import { renderScanSummary } from '../src/tui.js';
import { scanLedger, Ledger } from '../src/core.js';

test('scan panel: verified chain renders VERIFIED and the reading', () => {
  const ledger = new Ledger('t');
  ledger.book({ pulls: 1 }, { text: 'seed' }, 'seed', { gain: 0, th: 0 });
  ledger.book({ pulls: 2 }, { text: 'shock' }, 'event', { gain: 0.9, th: 0.1 });
  ledger.book({ pulls: 3 }, { text: 'hum' }, 'silence', { gain: 0.05, th: 0.2 });
  const out = renderScanSummary(scanLedger(ledger.entries));
  assert.match(out, /CHAIN VERIFIED — 3 receipt/);
  assert.match(out, /reading: ALIVE — 1 event\(s\), 1 silence\(s\) booked/);
});

test('scan panel: kinds histogram is sorted and counted', () => {
  const ledger = new Ledger('t');
  for (let i = 0; i < 3; i++) ledger.book({ pulls: i + 1 }, { text: `e${i}` }, 'event', { gain: 1, th: 0 });
  ledger.book({ pulls: 4 }, { text: 's' }, 'silence', { gain: 0, th: 1 });
  const out = renderScanSummary(scanLedger(ledger.entries));
  const ei = out.indexOf('event '), si = out.indexOf('silence ');
  assert.ok(ei >= 0 && si >= 0 && ei < si, 'histogram sorted by count desc');
  assert.match(out, /event\s+.*3/);
  assert.match(out, /silence\s+.*1/);
});

test('scan panel: tamper renders BROKEN, names the row, never softens', () => {
  const ledger = new Ledger('t');
  ledger.book({ pulls: 1 }, { text: 'ok' }, 'event', { gain: 1, th: 0 });
  const entries = ledger.entries.map((e) => ({ ...e }));
  entries[0] = { body: JSON.stringify({ kind: 'event', text: 'FORGED', gain: 9, th: 0 }), hash: entries[0].hash };
  const out = renderScanSummary(scanLedger(entries));
  assert.match(out, /CHAIN BROKEN — tamper at row 0/);
  assert.match(out, /reading: .*TAMPER/);
  assert.ok(!/CHAIN VERIFIED/.test(out), 'a broken chain must never render VERIFIED');
});

test('scan panel: empty ledger renders honest quiet, not a failure costume', () => {
  const out = renderScanSummary(scanLedger([]));
  assert.match(out, /EMPTY — no receipts; nothing to audit yet/);
  assert.ok(!/BROKEN/.test(out));
});

test('scan panel: pure — same scan, same string', () => {
  const ledger = new Ledger('t');
  ledger.book({ pulls: 1 }, { text: 'a' }, 'event', { gain: 1, th: 0 });
  const scan = scanLedger(ledger.entries);
  assert.equal(renderScanSummary(scan), renderScanSummary(structuredClone(scan)));
});
