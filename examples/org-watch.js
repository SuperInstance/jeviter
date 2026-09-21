// examples/org-watch.js — jeviter in service, stream one: the org firehose.
// Polls SuperInstance repos for push movement; the iterator silences repos
// whose push rhythm is routine and escalates the genuinely new: a repo
// never seen, a long-dormant repo waking, an unusual commit-message shape.
// Ledger + state persist, so each run replays from the last receipt.
//
//   node examples/org-watch.js [--ledger org-watch.ledger.jsonl] [--once]
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { JevIterator, Ledger } from '../src/core.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const ONCE = args.includes('--once');
const PATH = opt('ledger', 'org-watch.ledger.jsonl');
const STATE = 'org-watch.state.json';

function* onePoll(state) {
  const raw = execFileSync('gh', ['api', 'users/SuperInstance/repos?per_page=100&sort=pushed'],
    { encoding: 'utf8', timeout: 30000 });
  for (const repo of JSON.parse(raw)) {
    const name = repo.name;
    const at = repo.pushed_at ?? '';
    const was = state[name];
    state[name] = at;
    if (was === undefined) { yield `seen ${name}`; continue; }   // census: not news
    if (was === at) continue;                                     // quiet: silence
    let msg = '';
    try {
      const cs = JSON.parse(execFileSync('gh',
        ['api', `repos/SuperInstance/${name}/commits?per_page=1`],
        { encoding: 'utf8', timeout: 30000 }));
      msg = (cs[0]?.commit?.message ?? '').split('\n')[0].slice(0, 72);
    } catch { msg = '(commit fetch refused)'; }
    yield `push ${name} ${msg}`;
  }
}

const state = {};
try { Object.assign(state, JSON.parse(readFileSync(STATE, 'utf8'))); } catch { /* first watch */ }
const ledger = new Ledger('org-watch');
try {                                       // replay anchor across runs
  for (const line of readFileSync(PATH, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    ledger.entries.push(e);
    ledger.tail = BigInt('0x' + e.hash);
  }
} catch { /* first watch — honest start */ }

const origBook = ledger.book.bind(ledger);
ledger.book = (...a) => {
  const h = origBook(...a);
  appendFileSync(PATH, JSON.stringify({ body: ledger.entries.at(-1).body,
    hash: h.toString(16).padStart(16, '0') }) + '\n');
  writeFileSync(STATE, JSON.stringify(state));
  return h;
};

let tick = 0;
for (;;) {
  const it = new JevIterator(onePoll(state), { k: 2, ledger });
  for (const ev of it) {
    console.log(`[org-watch +${ev.gain.toFixed(3)}>${ev.threshold.toFixed(3)}] ${ev.text}`);
  }
  tick++;
  if (ONCE) break;
  console.error(`-- poll ${tick}: ${ledger.entries.filter((e) => JSON.parse(e.body).kind === 'silence').length} silences booked; resting 120s --`);
  await new Promise((r) => setTimeout(r, 120000));
}
