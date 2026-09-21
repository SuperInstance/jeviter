// examples/jev-ci.js — JEV-CI: the review bottleneck is the collaboration
// paradox (engineers fully delegate 0–20%; review is the wall). Make the
// PR stream homeostatic: routine shapes (dependabot, canon-lint, docs)
// rest — booked, not ignored — and PRs whose SHAPE surprises escalate to
// human review. The human sees ~5% of the queue; the ledger proves the
// other 95% was watched.
//
//   node examples/jev-ci.js SuperInstance/jev-quilt [--ledger jev-ci.jsonl] [--once]
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { JevIterator, Ledger } from '../src/core.js';

const [repo, ...args] = process.argv.slice(2);
const ONCE = args.includes('--once');
const PATH = (() => { const i = args.indexOf('--ledger'); return i >= 0 ? args[i + 1] : 'jev-ci.ledger.jsonl'; })();

function* pollPRs() {
  const raw = execFileSync('gh', ['pr', 'list', '-R', repo, '--json',
    'number,title,author,isDraft,files,labels', '--limit', '50'],
    { encoding: 'utf8', timeout: 30000 });
  for (const pr of JSON.parse(raw)) {
    const author = pr.author?.login ?? '?';
    const kinds = (pr.files ?? []).map((f) => f.path.split('.').pop()).join(',');
    const draft = pr.isDraft ? ' draft' : '';
    yield `pr ${author} ${pr.labels.map((l) => l.name).join('|') || 'unlabeled'}${draft} :: ${kinds} :: ${pr.title.slice(0, 60)}`;
  }
}

const seen = new Set();
const ledger = new Ledger(`jev-ci:${repo}`);
try {
  for (const line of readFileSync(PATH, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    ledger.entries.push(e);
    ledger.tail = BigInt('0x' + e.hash);
    try { seen.add(JSON.parse(e.body).payload.split(' :: ')[1]); } catch { /* drift */ }
  }
} catch { /* first run */ }

const origBook = ledger.book.bind(ledger);
ledger.book = (...a) => {
  const h = origBook(...a);
  appendFileSync(PATH, JSON.stringify({ body: ledger.entries.at(-1).body,
    hash: h.toString(16).padStart(16, '0') }) + '\n');
  return h;
};

for (;;) {
  const it = new JevIterator(pollPRs(), { k: 2, ledger });
  for (const ev of it) {
    console.log(`[JEV-CI REVIEW QUEUE +${ev.gain.toFixed(3)}>${ev.threshold.toFixed(3)}] ${ev.text}`);
  }
  if (ONCE) break;
  await new Promise((r) => setTimeout(r, 300000));
}
