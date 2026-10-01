// src/fidelity.js — the implementation-half of spec fidelity, in the
// fleet's own idiom (docs/SPEC-FIDELITY.md, "the one gap the mapping
// exposes"). canon-lint measures spec-side fidelity (does the canon
// describe the fleet); this cell meters implementation-side fidelity:
// canon-claimed artifacts that hash-match at verify-time.
//
// Doctrine (pinned by tests):
//   1. fidelity = verified_receipts / claimed_receipts per vessel.
//   2. A claim whose artifact is ABSENT is not verified and not failed —
//      it is MISSING, and the whole reading is INCOMPLETE (fidelity=null).
//      An unchecked claim is never a fidelity claim (exit-2 doctrine).
//   3. A hash MISMATCH is named drift: the vessel's own row names it
//      (per-path, never a scalar vibe).
//   4. The reading is booked as a hash-chained receipt like any other
//      silence — fidelity measured only when someone asks is
//      self-reported fidelity.

import { createHash } from 'node:crypto';
import { Ledger } from './core.js';

export function sha256Hex(content) {
  return createHash('sha256').update(content).digest('hex');
}

// claims: [{ path, sha256 }] — what the vessel's CANON.md names.
// read: (path) => string|Buffer|null — artifact provider.
export function measureFidelity(claims, read) {
  const drift = [];   // hash mismatch — named, per path
  const missing = []; // artifact absent — the reading is INCOMPLETE
  let verified = 0;
  for (const c of claims) {
    const content = read(c.path);
    if (content == null) { missing.push(c.path); continue; }
    if (sha256Hex(content) === c.sha256) verified++;
    else drift.push(c.path);
  }
  const claimed = claims.length;
  const complete = missing.length === 0;
  return {
    claimed, verified, drift, missing,
    complete,
    fidelity: complete && claimed > 0 ? verified / claimed : null,
  };
}

// Book the reading on a ledger (the fleet idiom: receipted or it didn't
// happen). kind 'fidelity' — one row per sweep, replayable, tamper-named.
export function bookFidelity(ledger, vessel, result) {
  return ledger.book(vessel, {
    claimed: result.claimed, verified: result.verified,
    drift: result.drift, missing: result.missing,
    fidelity: result.fidelity,
  }, 'fidelity');
}
