// src/distill.js — the Vibe→Spec distiller (SDAD seed 3). A persona
// playtest run emits a CANON.md stub: operational fiction as the distill
// step, machine-checked. docs/VIBE-DISTILL.md states the doctrine;
// the tests pin it.
//
// Checks, each booked as a hash-chained receipt (never a scalar vibe):
//   1. CITATION — every lesson cites ≥1 transcript line (T<n>); every
//      cite resolves. Unresolved or absent → REFUSED, reason named.
//   2. DUP — a lesson whose normalized-text hash is already pinned is
//      booked as SILENCE (admission accounting), never re-pinned.
//      Dormancy is not costume: repeats do not re-enter by mere presence.
//   3. JEV GATE — new lessons pass through the Throttle; surprising
//      lessons escalate as receipts, familiar ones book silence. The
//      first new lesson seeds belief (seed-not-event doctrine).
//   4. WELL-FORMEDNESS — the RENDERED STUB is re-parsed and verified:
//      provenance fields present; every lesson carries hash/see/
//      referenced_by; cross-refs are bidirectional by construction and
//      the check would catch a hand-edited lie.
//
// NEVER-THROW: malformed input → refused receipt + honest stub, no throw.
// Exactness: fnv1a-64 over UTF-8 bytes; hashes bind normalized text, so
// markdown whitespace jitter cannot rewrite a pinned lesson. Floats
// never touch identity — numbers live inside the text, not the hash.

import { createHash } from 'node:crypto';
import { Ledger, Throttle } from './core.js';
import { fnv1a64 } from './profile.js';

export function sha256Hex(s) {
  return createHash('sha256').update(s).digest('hex');
}

const SECTION_RE = /^##\s+(lessons?|observations?)\s*$/i;
const BULLET_RE = /^[-*]\s+(.*)$/;
const HEADING_RE = /^##\s/;
const CITE_GROUP_RE = /\((T\d+(?:\s*,\s*T\d+)*)\)\s*$/;
const SEE_RE = /\bsee\s+L(\d+)\b/g;
export const HASH_DOMAIN = 'jeviter-lesson/v1';

// The normalization rule, pinned by tests: lowercase, all internal
// whitespace runs collapse to one space, trim. Markdown formatting
// jitter (extra spaces, line breaks) cannot change a lesson's hash.
export function normalizeLessonText(t) {
  return String(t).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function lessonHash(text, cites) {
  const canon = [HASH_DOMAIN, normalizeLessonText(text),
    [...cites].sort().join(',')].join('\n');
  return fnv1a64(canon);
}

function hex(h) { return h.toString(16).padStart(16, '0'); }

// ---------- stub rendering ----------

export function renderStub({ title, personaSet, now, transcriptSha,
                             lessons, note }) {
  const L = lessons;
  const pinned = L.filter((l) => l.pinned);
  const silenced = L.filter((l) => !l.pinned);
  const lines = [
    '---',
    'provenance:',
    `  transcript_sha256: ${transcriptSha}`,
    `  persona_set: ${personaSet}`,
    `  distilled_at: ${now}`,
    '---',
    '',
    `# CANON stub — ${title}`,
    '',
    `_distilled from a persona playtest: ${pinned.length} pinned, `
      + `${silenced.length} silenced${note ? `; note: ${note}` : ''}._`,
    '',
  ];
  for (const l of pinned) {
    lines.push(`- **[${l.id}]** ${l.text} — cites: ${l.cites.join(', ')}`);
    lines.push(`  - hash: ${hex(l.hash)}`);
    lines.push(`  - see: ${l.see.length ? l.see.join(', ') : '—'}`);
    lines.push(`  - referenced_by: ${l.referencedBy.length ? l.referencedBy.join(', ') : '—'}`);
  }
  if (!pinned.length) lines.push('_(no lessons pinned — see the ledger)_');
  return lines.join('\n') + '\n';
}

// ---------- stub verification (the check that catches a lie) ----------

// Re-parse a RENDERED stub and verify well-formedness. This runs on our
// own output (close the loop) and would run on any hand-edited stub.
// When `transcript` is supplied, lesson hashes are RECOMPUTED from the
// parsed text+cites — shape checks catch a malformed stub; only
// recomputation catches a forged one. Lesson text must be single-line
// prose without the literal ' — cites:' separator (the renderer's
// format constraint, pinned by the golden fixture test).
export function verifyStub(stub, transcript) {
  const problems = [];
  const m = stub.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { ok: false, problems: ['no frontmatter block'] };
  const fm = m[1];
  for (const key of ['transcript_sha256:', 'persona_set:', 'distilled_at:']) {
    if (!fm.includes(`  ${key}`)) problems.push(`frontmatter missing ${key}`);
  }
  const lessons = parseStubLessons(stub);
  const ids = new Set(lessons.map((l) => l.id));
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const l of lessons) {
    if (!/^[0-9a-f]{16}$/.test(l.hash)) problems.push(`${l.id}: hash not 16-hex`);
    if (!l.cites.length) problems.push(`${l.id}: no cites`);
    if (transcript !== undefined && typeof transcript === 'string') {
      const recompute = lessonHash(l.text, l.cites).toString(16).padStart(16, '0');
      if (recompute !== l.hash) problems.push(`${l.id}: hash mismatch (forged or drifted)`);
      for (const r of l.cites) {
        const n = parseInt(r.slice(1), 10);
        if (Number.isNaN(n) || n < 1 || n > transcript.split('\n').length)
          problems.push(`${l.id}: cite ${r} does not resolve against transcript`);
      }
    }
    for (const s of l.see) {
      if (!ids.has(s)) problems.push(`${l.id}: see ${s} — target absent`);
      else if (!byId.get(s).referencedBy.includes(l.id))
        problems.push(`${l.id}: see ${s} — edge not bidirectional`);
    }
    for (const r of l.referencedBy) {
      if (!ids.has(r)) problems.push(`${l.id}: referenced_by ${r} — absent`);
      else if (!byId.get(r).see.includes(l.id))
        problems.push(`${l.id}: referenced_by ${r} — edge not bidirectional`);
    }
  }
  return { ok: problems.length === 0, problems, lessons };
}

export function parseStubLessons(stub) {
  const lessons = [];
  const re = /^- \*\*\[(L\d+)\]\*\* (.*?) — cites: ([^\n]+)\n  - hash: ([0-9a-f]+)\n  - see: ([^\n]+)\n  - referenced_by: ([^\n]+)$/gm;
  let m;
  while ((m = re.exec(stub)) !== null) {
    lessons.push({
      id: m[1], text: m[2],
      cites: m[3].split(',').map((s) => s.trim()).filter(Boolean),
      hash: m[4],
      see: m[5] === '—' ? [] : m[5].split(',').map((s) => s.trim()).filter(Boolean),
      referencedBy: m[6] === '—' ? [] : m[6].split(',').map((s) => s.trim()).filter(Boolean),
    });
  }
  return lessons;
}

// ---------- the distiller ----------

// transcript: markdown persona playtest. opts:
//   personaSet   — who ran the playtest (provenance)
//   now          — ISO timestamp or 'undated' (provenance; inject for tests)
//   priorLessons — iterable of fnv1a64 hashes (bigint or hex string) of
//                  already-pinned lessons; hits book silence, not re-pin
//   title        — stub title (default: transcript H1 or 'untitled run')
//   ledger       — inject a Ledger (tests); default genesis ledger
export function distill(transcript, opts = {}) {
  const {
    personaSet = 'unnamed', now = 'undated',
    priorLessons = [], title = null, ledger = new Ledger('jeviter-distill'),
  } = opts;
  const out = {
    stub: '', stubHash: 0n, lessons: [], pinned: [], silences: 0,
    refused: [], admission: { escalated: 0, shed: 0 },
    gate: null, ledger, wellFormed: false,
  };
  const refuse = (check, reason, extra = {}) => {
    out.refused.push({ check, reason });
    ledger.book({}, { check, reason }, 'refused', extra);
  };
  const finish = (title_, note) => {
    out.stub = renderStub({
      title: title_, personaSet, now,
      transcriptSha: sha256Hex(typeof transcript === 'string' ? transcript : ''),
      lessons: out.lessons, note,
    });
    out.stubHash = fnv1a64(out.stub);
    // Close the loop on the artifact itself, transcript in hand:
    // shape checks alone would let a forged hash pass.
    const v = verifyStub(out.stub,
      typeof transcript === 'string' ? transcript : undefined);
    out.wellFormed = v.ok;
    ledger.book({ wellFormed: v.ok },
      { problems: v.problems }, v.ok ? 'well-formed' : 'malformed');
    return out;
  };

  if (typeof transcript !== 'string' || transcript.trim() === '') {
    refuse('INPUT', 'empty transcript');
    return finish(title ?? 'untitled run', 'input refused');
  }
  const lines = transcript.split('\n');
  const h1 = transcript.match(/^#\s+(.+)$/m);
  const stubTitle = title ?? (h1 ? h1[1].trim() : 'untitled run');

  let secStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (SECTION_RE.test(lines[i].trim())) { secStart = i; break; }
  }
  if (secStart === -1) {
    refuse('SECTION', 'no lessons/observations section');
    return finish(stubTitle, 'nothing to distill');
  }
  const candidates = [];
  for (let i = secStart + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (HEADING_RE.test(t)) break;
    const b = t.match(BULLET_RE);
    if (b) candidates.push({ bullet: b[1], line: i + 1 });
  }
  if (!candidates.length) {
    refuse('SECTION', 'lessons section has no bullets');
    return finish(stubTitle, 'nothing to distill');
  }

  const prior = new Set([...priorLessons].map((h) =>
    typeof h === 'bigint' ? h : BigInt('0x' + String(h))));
  const gate = new Throttle((x) => x, { ledger: new Ledger('jeviter-distill-gate') });
  const pinnedById = new Map();

  candidates.forEach((c, i) => {
    const id = `L${i + 1}`;
    const lesson = { id, text: '', cites: [], hash: 0n, see: [],
      referencedBy: [], pinned: false, line: c.line };

    const cm = c.bullet.match(CITE_GROUP_RE);
    if (!cm) {
      refuse('CITATION', `lesson ${id} has no line-citation`, { line: c.line });
      return;
    }
    const cites = cm[1].split(',').map((s) => s.trim());
    const bad = cites.filter((r) => {
      const n = parseInt(r.slice(1), 10);
      return !/^T\d+$/.test(r) || Number.isNaN(n) || n < 1 || n > lines.length;
    });
    if (bad.length) {
      refuse('CITATION', `lesson ${id} unresolved refs: ${bad.join(', ')}`,
        { line: c.line });
      return;
    }
    const text = c.bullet.replace(CITE_GROUP_RE, '').trim();
    if (!text) {
      refuse('CITATION', `lesson ${id} empty text`, { line: c.line });
      return;
    }
    lesson.text = text;
    lesson.cites = cites;
    lesson.hash = lessonHash(text, cites);

    if (prior.has(lesson.hash)) {
      out.silences++;
      ledger.book({ lesson: id }, { hash: hex(lesson.hash) }, 'silence',
        { reason: 'dup: already pinned' });
      out.lessons.push(lesson);
      return;
    }

    const see = [...text.matchAll(SEE_RE)].map((mm) => `L${mm[1]}`);
    const unknownRef = see.find((s) => !pinnedById.has(s));
    if (unknownRef) {
      refuse('XREF', `lesson ${id} sees ${unknownRef} — not pinned (forward/missing refs refused)`, { line: c.line });
      return;
    }

    const admitted = gate.call(text);          // undefined ⇒ shed
    if (admitted === undefined) {
      out.silences++;
      out.admission.shed++;
      ledger.book({ lesson: id }, { hash: hex(lesson.hash) }, 'silence',
        { reason: 'jev-gate: familiar' });
      out.lessons.push(lesson);
      return;
    }
    out.admission.escalated++;
    lesson.pinned = true;
    lesson.see = see;
    for (const s of see) pinnedById.get(s).referencedBy.push(id);
    pinnedById.set(id, lesson);
    out.pinned.push(lesson);
    out.lessons.push(lesson);
    ledger.book({ lesson: id },
      { hash: hex(lesson.hash), cites: cites.join(',') }, 'lesson',
      { line: c.line });
  });

  out.gate = gate;
  return finish(stubTitle, null);
}
