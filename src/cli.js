// src/cli.js — `jeviter tail <file>` / `jeviter follow <url>` / `jeviter scan <ledger>`:
// a tail that only prints when the stream's SHAPE changes — and a read-back
// that verifies a ledger's chain and names its silence pattern.
// Usage: node src/cli.js tail app.log --ledger ledger.jsonl
//        node src/cli.js follow https://example.com/events --k 1.5
//        node src/cli.js scan ledger.jsonl
import { readFileSync, appendFileSync, openSync, readSync, statSync } from 'node:fs';
import { JevIterator, Ledger, scanLedger } from './core.js';

async function* followFile(path) {          // newline tail, memoryless
  let pos = 0;
  for (;;) {
    const size = statSync(path).size;
    if (size > pos) {
      const fd = openSync(path, 'r');
      const buf = Buffer.alloc(size - pos);
      readSync(fd, buf, 0, buf.length, pos);
      pos = size;
      for (const line of buf.toString('utf8').split('\n')) {
        if (line.trim()) yield line;
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function* followUrl(url) {            // SSE / newline stream
  const res = await fetch(url);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (t && !t.startsWith(':')) yield t.replace(/^data:\s*/, '');
    }
  }
}

const [, , cmd, target, ...rest] = process.argv;
if (cmd === 'digest' || cmd === '-' || target === '-') {
  // stdin digest: `cat report.md | node src/cli.js -` — jeviter reads ANY
  // text stream; this file's own report was the first meal.
  const { readFileSync } = await import('node:fs');
  const ledger = new Ledger('jeviter-stdin');
  const kIdx = rest.indexOf('--k');
  const it = new JevIterator(readFileSync(0, 'utf8').split('\n').filter((l) => l.trim()),
    { k: kIdx >= 0 ? Number(rest[kIdx + 1]) : 2, ledger });
  for (const ev of it) {
    console.log(`[event #${ev.tick} gain=${ev.gain.toFixed(3)} th=${ev.threshold.toFixed(3)}] ${ev.text}`);
  }
  console.error(`digest: ${ledger.entries.length} pulls booked, ${ledger.entries.filter((e) => JSON.parse(e.body).kind === 'silence').length} silences — the rest told us something`);
  process.exit(0);
}
const opt = (name, dflt) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? Number(rest[i + 1]) : dflt;
};
const ledgerPath = (() => {
  const i = rest.indexOf('--ledger');
  return i >= 0 ? rest[i + 1] : null;
})();

if (!cmd || cmd === 'help' || !target) {
  console.log('jeviter — rest, and react.\n\n  tail <file> [--k 2] [--ledger out.jsonl]');
  console.log('  follow <url> [--k 2] [--ledger out.jsonl]');
  console.log('  tui <file|url> [--k 2] [--ledger out.jsonl]');
  console.log('  scan <ledger.jsonl>\n');
  console.log('Prints only when the stream\'s shape changes. Every silence is booked.');
  process.exit(0);
}

if (cmd === 'scan') {                       // read-back: verify + name the pattern
  let entries;
  try {
    entries = readFileSync(target, 'utf8').split('\n').filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch (err) {
    console.error(`scan: cannot read ledger: ${err.message}`);
    process.exit(2);                        // an unreadable ledger is never a PASS
  }
  const r = scanLedger(entries);
  if (rest.includes('--panel')) {           // instrument snapshot, read-only
    const { renderScanSummary } = await import('./tui.js');
    console.log(renderScanSummary(r));
    process.exit(r.verified ? 0 : 1);       // paint never softens the verdict
  }
  console.log(`scan(${target}): ${r.verified ? 'CHAIN VERIFIED' : 'CHAIN BROKEN'} — ${r.entries} receipt(s)`);
  for (const [kind, n] of Object.entries(r.kinds).sort()) console.log(`  ${kind}: ${n}`);
  console.log(`reading: ${r.reading}`);
  process.exit(r.verified ? 0 : 1);
}

const ledger = new Ledger(`jeviter-cli:${target}`);
if (ledgerPath) {                          // replay anchor: load prior chain
  try {
    for (const line of readFileSync(ledgerPath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const e = JSON.parse(line);
      ledger.entries.push(e);
      ledger.tail = BigInt('0x' + e.hash);
    }
  } catch { /* fresh ledger — honest start */ }
}
const persist = ledgerPath
  ? (h, body) => appendFileSync(ledgerPath, JSON.stringify({ body, hash: h.toString(16).padStart(16, '0') }) + '\n')
  : () => {};
const origBook = ledger.book.bind(ledger);
ledger.book = (...a) => { const h = origBook(...a); persist(h, ledger.entries.at(-1).body); return h; };

if (cmd === 'tui') {                        // instrument panel over a tail
  const { createTuiState, updateTuiState, frame, TEARDOWN } = await import('./tui.js');
  if (!process.stdout.isTTY) {
    console.error('tui: needs a TTY (the panel is an instrument, not a pager)');
    process.exit(2);
  }
  let ui = createTuiState({ k: opt('k', 2) });
  const paint = () => process.stdout.write(frame(ui));
  process.stdin.setRawMode(true);
  process.stdin.on('data', (d) => { if (d.toString().includes('q')) {
    process.stdout.write(TEARDOWN); process.exit(0); } });
  process.on('exit', () => process.stdout.write(TEARDOWN));
  const src = target.startsWith('http') ? followUrl(target) : followFile(target);
  const iter = new JevIterator(src, { k: ui.k, ledger });
  // observe receipts AS booked: the panel shows silences too — a tail you
  // can watch must not hide what it swallowed (doctrine 3).
  const cliBook = ledger.book.bind(ledger);
  ledger.book = (state, payload, kind, extra) => {
    const h = cliBook(state, payload, kind, extra);
    if (kind === 'seed') ui = updateTuiState(ui, { type: 'seed', text: payload.text, pulls: state.pulls });
    else if (kind === 'silence') ui = updateTuiState(ui, { type: 'silence', text: payload.text,
      gain: extra.gain, threshold: extra.th, pulls: state.pulls });
    return h;
  };
  paint();                                   // blank panel IS a state: receipted quiet
  for await (const ev of iter) {
    ui = updateTuiState(ui, { type: 'event', text: ev.text, gain: ev.gain,
      threshold: ev.threshold, pulls: ev.pulls });
    paint();
  }
  ui = updateTuiState(ui, { type: 'exhausted', pulls: ui.pulls });
  paint();
  process.exit(0);
}

const stream = cmd === 'tail' ? followFile(target)
  : cmd === 'follow' ? followUrl(target) : null;
if (!stream) { console.error(`unknown command: ${cmd}`); process.exit(1); }

const it = new JevIterator(stream, { k: opt('k', 2), ledger });
for await (const ev of it) {
  console.log(`[event #${ev.tick} gain=${ev.gain.toFixed(3)} th=${ev.threshold.toFixed(3)}] ${typeof ev.text === "string" ? ev.text : JSON.stringify(ev.text)}`);
}
