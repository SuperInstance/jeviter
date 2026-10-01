// src/collab.js — seed 5: the collaboration-paradox instrument
// (docs/AGENTIC-CYCLE.md: Anthropic 8-trends read — full delegation sits
// at 0–20% of real workflows; the rest parks at a review wall).
//
// This cell does NOT score collaboration health. It reads a work ledger
// the way the fleet reads anything: per-item, named, and receipted.
//
// Doctrine (pinned by tests):
//   1. Every item is classified by its RESOLUTION PATH, not its intent:
//      'delegated' (agent shipped, human accepted without rework loop),
//      'reviewed' (human gate before acceptance), 'direct' (human built).
//      Intent labels are costume; the path is the reading.
//   2. The paradox band is a READING, not a verdict: delegation share
//      inside 0–20% corroborates the external finding; outside it names
//      the sample, never refutes the paper (fixtures are not field data).
//   3. A wall is named per-item: an item that passes review K times
//      without resolution is 'walled', named by id — never averaged
//      into a latency number that hides whose time is being spent.
//   4. The reading is booked as a hash-chained receipt like any other
//      silence — a delegation rate you measured once is self-reported.

import { Ledger } from './core.js';

// items: [{ id, path: 'delegated'|'reviewed'|'direct',
//           reviewPasses?: number, resolved: bool }]
export function readCollab(items) {
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) throw new Error(`duplicate item id: ${it.id}`);
    seen.add(it.id);
  }
  const n = items.length;
  const counts = { delegated: 0, reviewed: 0, direct: 0 };
  const walled = [];   // named, per doctrine 3
  for (const it of items) {
    if (!(it.path in counts)) throw new Error(`unknown path: ${it.path}`);
    counts[it.path]++;
    const passes = it.reviewPasses ?? 0;
    if (it.path === 'reviewed' && !it.resolved && passes > 0) {
      walled.push({ id: it.id, reviewPasses: passes });
    }
  }
  const resolved = items.filter((i) => i.resolved).length;
  const delegationShare = n > 0 ? counts.delegated / n : null;
  // The band is corroboration-shaped: a fixture inside 0–20% MATCHES the
  // external finding; outside it, the row names the sample as divergent.
  const band = delegationShare == null ? null
    : (delegationShare <= 0.20 ? 'in-band' : 'divergent');
  return {
    n, counts,
    resolved, unresolved: n - resolved,
    delegationShare,
    paradoxBand: band,          // 'in-band' | 'divergent' | null
    walled,                     // [{id, reviewPasses}] — named, not averaged
  };
}

// Book the reading on a ledger. kind 'collab' — replayable, tamper-named.
export function bookCollab(ledger, source, result) {
  return ledger.book(source, {
    n: result.n,
    delegated: result.counts.delegated,
    reviewed: result.counts.reviewed,
    direct: result.counts.direct,
    delegationShare: result.delegationShare,
    paradoxBand: result.paradoxBand,
    walledCount: result.walled.length,
  }, 'collab');
}
