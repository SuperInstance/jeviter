// examples/fidelity-cell.js — the implementation-half of spec fidelity
// (docs/SPEC-FIDELITY.md), run end-to-end on a fixture vessel:
// canon-claimed artifacts that hash-match at verify-time.
// Run: node examples/fidelity-cell.js
import { measureFidelity, bookFidelity, sha256Hex } from '../src/fidelity.js';
import { Ledger } from '../src/core.js';

// A vessel's CANON.md names what it claims; the world holds what it ships.
const world = {
  'CANON.md': 'mission sentence, one only',
  'docs/ROADMAP.md': 'the declared intent',
  'src/core.js': 'the implementation',
};
const canon = Object.keys(world).map(path => ({ path, sha256: sha256Hex(world[path]) }));

const ledger = new Ledger('fidelity-cell');

// 1. clean sweep — fidelity 1.0, receipted quiet
const clean = measureFidelity(canon, p => world[p] ?? null);
bookFidelity(ledger, 'fixture-vessel', clean);
console.log(`clean sweep: fidelity ${clean.fidelity} (${clean.verified}/${clean.claimed})`);

// 2. drift — the world moved, the canon didn't (SDAD's classic failure)
const driftedWorld = { ...world, 'src/core.js': 'the implementation, drifted' };
const drifted = measureFidelity(canon, p => driftedWorld[p] ?? null);
bookFidelity(ledger, 'fixture-vessel', drifted);
console.log(`drift sweep: fidelity ${drifted.fidelity}, drift named: ${drifted.drift}`);

// 3. incomplete — an artifact you cannot check is never a fidelity claim
const partialWorld = { ...world }; delete partialWorld['docs/ROADMAP.md'];
const partial = measureFidelity(canon, p => partialWorld[p] ?? null);
bookFidelity(ledger, 'fixture-vessel', partial);
console.log(`partial sweep: INCOMPLETE (fidelity ${partial.fidelity}), missing: ${partial.missing}`);

console.log(`ledger: ${ledger.entries.length} receipts, chain verified: ${ledger.verify()}`);
