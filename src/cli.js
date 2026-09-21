// src/cli.js — `jeviter tail <file>` / `jeviter follow <url>`:
// a tail that only prints when the stream's SHAPE changes.
// Usage: node src/cli.js tail app.log --ledger ledger.jsonl
//        node src/cli.js follow https://example.com/events --k 1.5
import { readFileSync, appendFileSync, openSync, readSync, statSync } from 'node:fs';
import { JevIterator, Ledger } from './core.js';

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
const opt = (name, dflt) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? Number(rest[i + 1]) : dflt;
};
const ledgerPath = (() => {
  const i = rest.indexOf('--ledger');
  return i >= 0 ? rest[i + 1] : null;
})();

if (!cmd || !target) {
  console.log('jeviter — rest, and react.\n\n  tail <file> [--k 2] [--ledger out.jsonl]');
  console.log('  follow <url> [--k 2] [--ledger out.jsonl]\n');
  console.log('Prints only when the stream\'s shape changes. Every silence is booked.');
  process.exit(0);
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

const stream = cmd === 'tail' ? followFile(target)
  : cmd === 'follow' ? followUrl(target) : null;
if (!stream) { console.error(`unknown command: ${cmd}`); process.exit(1); }

const it = new JevIterator(stream, { k: opt('k', 2), ledger });
for await (const ev of it) {
  console.log(`[event #${ev.value.tick} gain=${ev.value.gain.toFixed(3)} th=${ev.value.threshold.toFixed(3)}] ${typeof ev.value.text === 'string' ? ev.value.text : JSON.stringify(ev.value.text)}`);
}
