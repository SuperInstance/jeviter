// test/distill.test.js — the distiller's doctrine, pinned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { distill, verifyStub, parseStubLessons, lessonHash, normalizeLessonText, sha256Hex, HASH_DOMAIN } from '../src/distill.js';
import { fnv1a64 } from '../src/profile.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, '..', 'examples', 'fixtures', 'playest-jeviter-tui.md');

const T = (body, lessons) => `# Playtest — x\n\n## Run\n\n${body}\n\n## Lessons\n\n${lessons}\n`;

test('citation resolves → lesson pinned with hash', () => {
  const d = distill(T('one\ntwo\nthree', '- real lesson here (T1, T3)'), { now: 't0' });
  assert.equal(d.refused.length, 0);
  assert.equal(d.pinned.length, 1);
  assert.equal(d.pinned[0].cites.join(','), 'T1,T3');
  assert.match(d.pinned[0].hash.toString(16), /^[0-9a-f]{16}$/);
});

test('unresolved ref → REFUSED naming the bad ref, never silently dropped', () => {
  const d = distill(T('one\ntwo', '- lesson with a ghost ref (T2, T99)'), { now: 't0' });
  assert.equal(d.pinned.length, 0);
  assert.equal(d.refused.length, 1);
  assert.equal(d.refused[0].check, 'CITATION');
  assert.match(d.refused[0].reason, /T99/);
});

test('no citation group at all → REFUSED (CITATION)', () => {
  const d = distill(T('one', '- a lesson that cites nothing'), { now: 't0' });
  assert.equal(d.pinned.length, 0);
  assert.equal(d.refused[0].check, 'CITATION');
});

test('dup vs priorLessons → silence booked, admission counted, not re-pinned', () => {
  const text = '- the same lesson returns (T1)';
  const h = lessonHash('the same lesson returns', ['T1']);
  const d = distill(T('one', text), { now: 't0', priorLessons: [h] });
  assert.equal(d.pinned.length, 0);
  assert.equal(d.silences, 1);
  assert.match(d.stub, /0 pinned/);
});

test('stub frontmatter carries provenance + real transcript sha', () => {
  const body = 'one\ntwo';
  const tr = T(body, '- lesson one (T1)');
  const d = distill(tr, { personaSet: 'sre-oncall', now: '2026-09-22T04:00:00Z' });
  assert.match(d.stub, /transcript_sha256: [0-9a-f]{64}/);
  assert.ok(d.stub.includes(`transcript_sha256: ${sha256Hex(tr)}`));
  assert.ok(d.stub.includes('persona_set: sre-oncall'));
  assert.ok(d.stub.includes('distilled_at: 2026-09-22T04:00:00Z'));
});

test('fnv1a-64 is UTF-8 bytes — the fleet café vector holds', () => {
  assert.equal(fnv1a64('café Δ 日本語'), 0x024a555471370b18dn);
  const d = distill(T('x', '- café Δ 日本語 lesson (T1)'), { now: 't0' });
  assert.equal(d.pinned[0].hash,
    lessonHash('café Δ 日本語 lesson', ['T1']));
});

test('never-throw: empty transcript → refused INPUT + honest stub, no exception', () => {
  for (const bad of ['', '   ', null, undefined, 42]) {
    const d = distill(bad, { now: 't0' });
    assert.equal(d.pinned.length, 0);
    assert.ok(d.refused.some((r) => r.check === 'INPUT'));
    assert.match(d.stub, /CANON stub/);
  }
});

test('never-throw: no lessons section → refused SECTION', () => {
  const d = distill('# Only narrative\n\nnothing to distill here', { now: 't0' });
  assert.ok(d.refused.some((r) => r.check === 'SECTION'));
});

test('JEV gate: first new lesson seeds belief (escalated); identical profile sheds at gain 0 ≤ threshold', () => {
  const lessons = '- the stream settles into its usual prose shape (T1)\n'
    + '- the stream settles into its usual prose shape (T1)';
  const d = distill(T('one', lessons), { now: 't0' });
  assert.equal(d.admission.escalated, 1);   // seed-not-event
  assert.equal(d.admission.shed, 1);        // gain 0 ≤ dynamic threshold
  assert.equal(d.pinned.length, 1);
  assert.equal(d.silences, 1);
});

test('determinism: same transcript → identical stub bytes and stub hash', () => {
  const tr = T('one\ntwo\nthree', '- lesson a (T1)\n- lesson b with digits 250 500 (T2)');
  const a = distill(tr, { now: 'fixed', personaSet: 'p' });
  const b = distill(tr, { now: 'fixed', personaSet: 'p' });
  assert.equal(a.stub, b.stub);
  assert.equal(a.stubHash, b.stubHash);
  assert.equal(a.pinned.length, b.pinned.length);
});

test('receipt chain verifies TRUE; tamper named at its own row', () => {
  const d = distill(T('one\ntwo', '- lesson a (T1)\n- lesson b (T2)'), { now: 't0' });
  assert.equal(d.ledger.verify(), true);
  const row = JSON.parse(d.ledger.entries[0].body);
  row.kind = 'forgery';
  d.ledger.entries[0].body = JSON.stringify(row);
  assert.equal(d.ledger.verify(), false);
});

test('cross-refs are bidirectional: see L1 appears as referenced_by on L1', () => {
  const d = distill(T('one\ntwo', '- base lesson (T1)\n- second lesson see L1 (T2)'), { now: 't0' });
  assert.equal(d.pinned.length, 2);
  const l1 = d.pinned.find((l) => l.id === 'L1');
  assert.deepEqual(l1.referencedBy, ['L2']);
  const v = verifyStub(d.stub);
  assert.equal(v.ok, true);
  assert.deepEqual(v.problems, []);
});

test('forward/missing see-ref → REFUSED (XREF), target lesson not pinned', () => {
  const d = distill(T('one\ntwo', '- lesson see L9 ghost (T1)'), { now: 't0' });
  assert.equal(d.pinned.length, 0);
  assert.ok(d.refused.some((r) => r.check === 'XREF' && /L9/.test(r.reason)));
});

test('whitespace jitter cannot rewrite a pinned lesson hash', () => {
  const a = lessonHash('the   clamp holds\nat 40 columns', ['T1']);
  const b = lessonHash('the clamp holds at 40 columns', ['T1']);
  assert.equal(a, b);
  assert.equal(normalizeLessonText('  Many   spaces\tand\nnewlines  '), 'many spaces and newlines');
});

test('no float identity: numbers hash as their literal text, not a value', () => {
  const hText = lessonHash('0.1 + 0.2 stays literal', ['T1']);
  assert.equal(hText, fnv1a64([HASH_DOMAIN, '0.1 + 0.2 stays literal', 'T1'].join('\n')));
  assert.notEqual(hText, lessonHash('0.3 stays literal', ['T1']));
});

test('rendered stub re-verifies: wellFormed true, booked as a receipt', () => {
  const d = distill(T('one\ntwo', '- alpha (T1)\n- beta see L1 (T2)'), { now: 't0' });
  assert.equal(d.wellFormed, true);
  const kinds = d.ledger.entries.map((e) => JSON.parse(e.body).kind);
  assert.ok(kinds.includes('well-formed'));
});

test('verifyStub catches a hand-edited lie: forged hash fails once hashes are recomputed', () => {
  const tr = T('one', '- real lesson (T1)');
  const d = distill(tr, { now: 't0' });
  const forged = d.stub.replace(/hash: [0-9a-f]{16}/, 'hash: ffffffffffffffff');
  const shapeOnly = verifyStub(forged);
  assert.equal(shapeOnly.ok, true);   // shape is fine — the lie is in the bytes
  const withRecompute = verifyStub(forged, tr);
  assert.equal(withRecompute.ok, false);
  assert.ok(withRecompute.problems.some((p) => /hash mismatch/.test(p)));
});

test('the shipped fixture: golden end-to-end run pins the story', () => {
  const tr = readFileSync(FIXTURE, 'utf8');
  const d = distill(tr, { personaSet: 'sre-oncall', now: '2026-09-22T04:30:00Z' });
  assert.equal(d.refused.length, 0);            // all six fixture lessons cite real lines
  assert.equal(d.ledger.verify(), true);
  assert.equal(d.wellFormed, true);
  // homeostatic honesty: the persona's six lessons — the gate admits the
  // surprising half and receipts the familiar half as silence.
  assert.equal(d.pinned.length + d.silences, 6);
  assert.ok(d.pinned.length >= 1);
  assert.ok(d.silences >= 1);
  assert.equal(d.admission.escalated, d.pinned.length);
  assert.equal(d.admission.shed, d.silences);
  // every lesson that reached the stub carries a recomputed-correct hash
  const parsed = parseStubLessons(d.stub);
  assert.equal(parsed.length, d.pinned.length);
  for (const l of parsed) {
    assert.equal(l.hash, lessonHash(l.text, l.cites).toString(16).padStart(16, '0'),
      `${l.id} hash recomputes from stub text`);
  }
  const cafe = d.lessons.find((l) => /café Δ 日本語/.test(l.text));
  assert.ok(cafe, 'non-ASCII lesson present');
  assert.equal(cafe.hash, lessonHash(cafe.text, cafe.cites));
});
