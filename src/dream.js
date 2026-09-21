// src/dream.js — Dreaming, receipted: a WAL consolidation pass with the
// fleet's sleep doctrine. Agents consolidate memory the way sleep
// consolidates the day: old rows are compressed into a summary, the
// originals are RELOCATED to achieved/dormant state (never deleted —
// Casey's no-delete doctrine), and every consolidation books a
// hash-chained receipt so "I slept on it" is auditable, not asserted.
//
// FLUCTLIGHT (arXiv 2608.12365) is prior art for WAL checkpoint +
// replay-on-boot. This cell is the audit layer on top of that idea:
// replay tells you what the agent woke with; the dream ledger tells you
// what it chose to forget and what the choice cost.

import { Ledger } from './core.js';
import { fnv1a64 } from './profile.js';

function sourceId(entry, index) {
  return entry?.id ?? `mem-${index}`;
}

function dreamId(summary, sourceIds) {
  const h = fnv1a64(JSON.stringify({ summary, sourceIds }));
  return `dream:${h.toString(16).padStart(16, '0')}`;
}

// Consolidate the OLD tail of a memory WAL into summaries. The caller owns
// semantics: `summarize(batch)` must return a string, or null/undefined to
// refuse. Refusal is a first-class receipt — a dream you cannot source is
// a rumor, and a rumor is never booked as memory.
export function consolidateMemory({
  entries,
  ledger = new Ledger('dream'),
  windowSize = 4,
  keepRecent = 1,
  summarize = null,
} = {}) {
  if (!Number.isInteger(windowSize) || windowSize < 1) {
    throw new TypeError('windowSize must be a positive integer');
  }
  if (!Number.isInteger(keepRecent) || keepRecent < 0) {
    throw new TypeError('keepRecent must be a non-negative integer');
  }

  const kept = [];
  const consolidated = [];
  const achieved = [];
  let dreamed = 0;
  let refused = 0;

  const oldCount = Math.max(0, entries.length - keepRecent);
  const old = entries.slice(0, oldCount);
  kept.push(...entries.slice(oldCount));

  for (let start = 0, batchIndex = 0; start < old.length; start += windowSize, batchIndex++) {
    const batch = old.slice(start, start + windowSize);
    const sourceIds = batch.map((entry, j) => sourceId(entry, start + j));

    if (typeof summarize !== 'function') {
      refused++;
      kept.push(...batch);
      ledger.book({ batch: batchIndex, kept: batch.length }, {
        sources: sourceIds,
      }, 'dream-refusal', { reason: 'no summarizer' });
      continue;
    }

    const summary = summarize(batch);
    if (typeof summary !== 'string' || summary.trim() === '') {
      refused++;
      kept.push(...batch);
      ledger.book({ batch: batchIndex, kept: batch.length }, {
        sources: sourceIds,
      }, 'dream-refusal', { reason: 'empty summary' });
      continue;
    }

    const id = dreamId(summary, sourceIds);
    const memory = {
      id,
      kind: 'consolidated-memory',
      text: summary,
      sources: sourceIds,
      at: batch.at(-1)?.at ?? null,
    };
    consolidated.push(memory);
    achieved.push(...batch.map((entry) => ({
      ...entry,
      state: 'achieved',
      supersededBy: id,
    })));
    dreamed++;
    ledger.book({ batch: batchIndex, dreamed }, {
      summary: summary.slice(0, 120),
      sources: sourceIds,
    }, 'dream', {
      achieved: batch.length,
      summaryHash: id.slice('dream:'.length),
    });
  }

  return {
    kept,
    consolidated,
    achieved,
    dreamed,
    refused,
    verified: ledger.verify(),
  };
}
