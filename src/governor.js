// src/governor.js — seed 7: sequential-merge governor.
// The AGENTIC-CYCLE research's last pattern made homeostatic: merge PRs
// only when their shape stops surprising; the queue RESTS between
// divergent changes. Doctrine (pinned by tests, not comments):
//   1. No belief, no rest — the first merge SEEDS the shape boundary and
//      is not news. 2. Every held PR is booked: a hold you cannot audit
//      is indistinguishable from a stuck queue. 3. Rest length is fixed
//      (restLen held PRs), not time — wall-clock smuggling is not a
//      release mechanism. 4. THE RATCHET: one divergent shape buys
//      exactly one rest. Alternating fixed shapes cannot keep the queue
//      closed — each admitted shape joins the belief window, so its
//      re-submission is familiar by construction. Adversarial queue
//      jamming is impossible without genuine novelty.
import { Ledger } from './core.js';
import { profile, klGain, dynamicThreshold } from './profile.js';

export function shapeOf(pr) {
  const areas = [...new Set((pr.files || ['?']).map((f) => String(f).split('/')[0]))]
    .sort().join('+') || '?';
  const churn = (pr.adds || 0) + (pr.dels || 0);
  const mag = churn < 50 ? 'S' : churn < 300 ? 'M' : 'L';
  return `${areas}:${mag}`;
}

export class MergeGovernor {
  constructor({ k = 2.0, window = 16, restLen = 3,
                ledger = new Ledger('jeviter-governor') } = {}) {
    this.k = k; this.window = window; this.restLen = restLen;
    this.ledger = ledger;
    this.boundary = [];        // admitted shape strings (the belief window)
    this.accepted = [];        // admitted surprise gains (moving threshold)
    this.resting = 0; this.rests = 0;
    this.merged = 0; this.held = 0;
  }
  belief() {
    if (!this.boundary.length) return null;
    return profile(this.boundary.join(' '));
  }
  consider(pr) {
    const sig = shapeOf(pr);
    const base = this.belief();
    const merged = this.resting === 0;
    if (base === null) {                       // doctrine 1: seed, not news
      this.boundary.push(sig);
      this.merged++;
      this.ledger.book({ merged: this.merged }, { sig, id: pr.id }, 'seed',
        { note: 'belief established; queue open' });
      return { id: pr.id, sig, merged: true, seed: true, rest: 0 };
    }
    const gain = klGain(base, profile(sig));
    const th = dynamicThreshold(this.accepted, this.k);
    const divergent = gain > th;
    if (!merged) {                             // doctrine 3: fixed restLen
      this.resting--; this.held++;
      this.ledger.book({ held: this.held }, { sig, id: pr.id }, 'held',
        { restLeft: this.resting, gain: +gain.toFixed(6), th: +th.toFixed(6) });
      return { id: pr.id, sig, merged: false, held: true,
        divergent, restLeft: this.resting };
    }
    if (divergent) {                           // admit, then the queue rests
      this.accepted.push(gain);
      this.boundary.push(sig);
      this.boundary = this.boundary.slice(-this.window);
      this.resting = this.restLen; this.rests++;
      this.merged++;
      this.ledger.book({ merged: this.merged }, { sig, id: pr.id }, 'merged-divergent',
        { gain: +gain.toFixed(6), th: +th.toFixed(6), rest: this.restLen });
      return { id: pr.id, sig, merged: true, divergent: true, rest: this.restLen };
    }
    this.merged++;                             // familiar shape, quiet merge
    this.ledger.book({ merged: this.merged }, { sig, id: pr.id }, 'merged',
      { gain: +gain.toFixed(6), th: +th.toFixed(6) });
    return { id: pr.id, sig, merged: true, divergent: false, rest: 0 };
  }
}

export function readGovernor(g) {
  return {
    merged: g.merged, held: g.held, rests: g.rests,
    queueOpen: g.resting === 0,
    belief: [...g.boundary],
    chainVerified: g.ledger.verify(),
    admission: g.merged + g.held === 0 ? null
      : +(g.merged / (g.merged + g.held)).toFixed(4),
  };
}
