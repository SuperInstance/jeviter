// examples/governor.js — seed 7 demo: a merge queue paced by shape
// surprise. Synthetic fixture, labeled: it pins the mechanism.
//   act 1: eight familiar refactors merge quietly (queue open)
//   act 2: one divergent change (new area, large) merges AND the queue
//           rests — the next three PRs are held, receipted
//   act 3: after the rest, the SAME divergent shape resubmits familiar
//   act 4: an attacker alternates two divergent shapes trying to keep
//           the queue closed — the ratchet refuses: each admitted shape
//           joins the belief window, novelty cannot be rehearsed
import { MergeGovernor, readGovernor } from '../src/governor.js';
import { scanLedger } from '../src/core.js';

const g = new MergeGovernor({ restLen: 3 });
const fam = (id) => ({ id, files: ['src/a.js'], adds: 40, dels: 10 });
const divergent = { id: 'dv', files: ['ci/pipeline.yml'], adds: 400, dels: 20 };

const out = [];
const feed = (pr) => { const r = g.consider(pr); out.push(r); return r; };

for (let i = 1; i <= 8; i++) feed(fam(`f${i}`));     // act 1: quiet stream
feed(divergent);                                      // act 2: admit + rest
for (let i = 1; i <= 3; i++) feed(fam(`h${i}`));      //   rest: 3 held
feed({ ...divergent, id: 'dv2' });                    // act 3: now familiar
const A = { id: `atkA`, files: ['attic/a.js'], adds: 500, dels: 0 };
const B = { id: `atkB`, files: ['basement/b.js'], adds: 0, dels: 500 };
for (let i = 0; i < 4; i++) feed(i % 2 ? A : B);      // act 4: alternation

const reading = readGovernor(g);
const scan = scanLedger(g.ledger.entries.map((e) => ({ body: e.body, hash: e.hash })));
console.log('decisions:', out.map((r) =>
  `${r.id}:${r.merged ? (r.seed ? 'SEED' : r.divergent ? 'MERGE!' : 'merge') : `held(${r.restLeft})`}`
).join(' '));
console.log('reading:', JSON.stringify(reading));
console.log('scan:', scan.reading, '| chain:', scan.verified);
if (!scan.verified) process.exit(1);
