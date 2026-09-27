// test/strict.test.js — the night-lab receipt, folded home.
// Two fleet-measured defects, both falsifier-backed before this file existed:
//
// DEFECT 1 — klGain categorical blindness (three independent sightings):
//   w2-verdict-coroner v1 (verdict-flip gain exactly 0.0),
//   w2-outside-eye (fixed-grammar numeric stream: 4/53 booked),
//   w3-samey-canon (maximally different essays score exactly 0).
//   Root: q==0 and p==0 terms skipped → mass movement between mutually
//   exclusive classes (the NORMAL case for categorical profiles) scores 0.
//
// DEFECT 2 — dynamicThreshold starvation lock (org-watch found DEAD):
//   no admissions → threshold frozen → no admissions. No descent path.
//   erised-mirror's tool 06 ships the cure: EWMA over ALL pulls (alpha=0.15),
//   "25 quiet samples let the baseline forget the day" (06-home-ecos.mjs:83,134).
//   w4-erised-lock-audit Arm C proved the patched rule on the locking feed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profile, profileValue, klGain, klGainStrict, dynamicThreshold, dynamicThresholdEWMA, Q16 } from '../src/profile.js';

// ---------- klGainStrict ----------
test('categorical replacement is visible (the three-sighting defect)', () => {
  const a = { x: new Q16(1), y: new Q16(0) };   // mass 100% on x
  const b = { x: new Q16(0), y: new Q16(1) };   // mass 100% on y — maximally different
  assert.equal(klGain(a, b), 0);                // documents the old blindness
  assert.ok(klGainStrict(a, b) > 0.5);          // and the strict organ sees it
});

test('deletion counts: vanished mass is news', () => {
  const base = profile('abc def');              // letter-class organ
  const cut = profile('abc');                   // one word deleted
  assert.ok(klGainStrict(base, cut) > 0);
});

test('strict keeps shared-support agreement with stock klGain', () => {
  const a = profile('the quick brown fox');
  const b = profile('the quick brown fox');
  assert.equal(klGainStrict(a, b), 0);          // identical → no gain, either organ
  const c = profile('99999999');
  assert.ok(klGainStrict(a, c) > klGain(a, c)); // strict ≥ stock always (vanished mass ≥ 0)
});

// ---------- profileValue ----------
test('profileValue: single leaf flip escalates (coroner v2 falsifier)', () => {
  const row = { verdict: 'ok', n: 12, meta: { lane: '33-b' } };
  const tampered = { verdict: 'ok', n: 13, meta: { lane: '33-b' } }; // one digit
  const base = profileValue(row);
  assert.equal(klGainStrict(base, base), 0);              // intact row: no news
  const flip = klGainStrict(base, profileValue(tampered));
  assert.ok(flip >= 1 / 3 - 1e-9);                         // the class carried 1/3 of mass
  assert.ok(flip <= 1 / 3 + 0.35);                        // and KL log-term keeps it bounded
});

test('profileValue: path=value classes — same value, different path, different class', () => {
  const a = profileValue({ x: { v: 1 }, y: { v: 1 } });
  const b = profileValue({ x: { v: 1 }, y: { v: 2 } });
  assert.ok(klGainStrict(a, b) > 0);                       // y.v moved classes
  assert.equal(klGainStrict(profileValue({ v: 1 }), profileValue({ v: 1 })), 0);
});

// ---------- dynamicThresholdEWMA ----------
test('starvation feed: old law freezes, EWMA law descends (Arm A/C of w4)', () => {
  // 3 seeds, then 10^3 quiet pulls. Old law: frozen forever after last admission.
  const seeds = [0.100476, 0.090000, 0.110000];
  const quiet = Array.from({ length: 1000 }, (_, i) => 0.001 + 0.0001 * Math.sin(i));
  const oldThs = [];
  const accepted = [...seeds];
  for (const g of quiet) {
    oldThs.push(dynamicThreshold(accepted, 2));
    if (g > oldThs[oldThs.length - 1]) accepted.push(g); // ratchet: only admissions move it
  }
  assert.ok(new Set(oldThs.slice(100)).size === 1);      // frozen: bit-identical for 900 rows
  // EWMA law over ALL pulls:
  const ew = dynamicThresholdEWMA(seeds, quiet, { alpha: 0.15, k: 2 });
  assert.ok(ew < oldThs[0]);                             // the bar came DOWN in a quiet world
});

test('EWMA still admits a post-starvation surge (recovery, not just descent)', () => {
  const seeds = [0.100476, 0.090000, 0.110000];
  const quiet = Array.from({ length: 200 }, () => 0.001);
  const state = { ewma: null };
  let th = dynamicThresholdEWMA(seeds, quiet.slice(0, 100), { alpha: 0.15, k: 2, state });
  const quietAdmissions = quiet.slice(100).filter(g => g > th).length;
  assert.equal(quietAdmissions, 0);
  th = dynamicThresholdEWMA([], [0.4], { alpha: 0.15, k: 2, state }); // a real surge after starvation
  assert.ok(0.4 > th);                                   // fires: baseline tracked the world down
});
