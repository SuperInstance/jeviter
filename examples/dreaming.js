// examples/dreaming.js — Dreaming, receipted (docs/DREAMING.md): a tiny
// memory WAL takes a sleep pass. Run: node examples/dreaming.js
import { consolidateMemory } from '../src/dream.js';
import { Ledger } from '../src/core.js';

const memoryRows = [
  { id: 'mem-0', at: '2026-09-22T03:00:00+08:00', text: 'gateway flapped at 03:12; direct-build doctrine held' },
  { id: 'mem-1', at: '2026-09-22T03:20:00+08:00', text: 'jeviter seed 3 shipped: distiller checks now receipted' },
  { id: 'mem-2', at: '2026-09-22T03:40:00+08:00', text: 'FLUCTLIGHT = WAL replay prior art; differentiate on receipts' },
  { id: 'mem-3', at: '2026-09-22T04:00:00+08:00', text: 'dreaming seed designed: consolidate, relocate, book' },
  { id: 'mem-4', at: '2026-09-22T04:40:00+08:00', text: 'latest waking row stays live until the next sleep' },
];

const ledger = new Ledger('agent-dream');
const result = consolidateMemory({
  entries: memoryRows,
  ledger,
  windowSize: 2,
  keepRecent: 1,
  summarize: (batch) => batch.map((m) => m.text).join(' · '),
});

console.log(`slept: ${result.dreamed} batch(es), ${result.refused} refusal(s)`);
console.log(`kept live: ${result.kept.map((m) => m.id ?? 'mem').join(', ')}`);
console.log(`consolidated: ${result.consolidated.map((m) => `${m.id} <- ${m.sources.join('+')}`).join(' | ')}`);
console.log(`achieved: ${result.achieved.map((m) => `${m.id} -> ${m.state}`).join(', ')}`);
console.log(`ledger: ${ledger.entries.length} receipt(s), chain verified: ${result.verified}`);
