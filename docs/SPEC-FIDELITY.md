# Spec-Fidelity: naming the mapping

SDAD (arXiv 2608.20341, spec-driven agentic development) names
**Spec Fidelity** as a governance metric: how faithfully the running
system still implements the spec it claims to implement — as opposed
to how faithfully a diff matches an issue, or how green a test suite is.
Fidelity is measured against the *declared intent*, and intent drifts
faster than code.

The fleet already computes this. canon-lint
(`fleet-canon/lint.py`, Layer C of the canon layer) is a spec-fidelity
meter where the spec is the CANON.md and the system is the repo
graph. This doc names the mapping so the fleet's numbers can be read
in SDAD's vocabulary — and so the next SDAD-shaped question ("what is
our spec fidelity?") has a published answer.

## The mapping

| canon-lint check | SDAD spec-fidelity reading |
| --- | --- |
| **schema** — CANON.md parses, required fields present, `name == repo`, one-mission-sentence | *Spec is well-formed and attributable.* A spec that doesn't parse isn't a spec; fidelity to it is undefined, not high. The name-mission checks pin identity so fidelity can't migrate between vessels. |
| **edges** — `feeds`/`owed_by` acknowledged on BOTH sides | *Dependency fidelity.* Every declared relationship is a claim about the world; the bidirectionality check is the receipt that the other side still acknowledges the claim. An edge ACK'd one-way is a spec the world no longer signs. |
| **staleness** — verified >30d ago + pushes since → warn; >90d → fail | *Time-decay of fidelity.* The classic SDAD failure mode: code keeps moving, the spec doesn't. "Pushes since" is the load-bearing term — movement without re-verification is exactly drift. The 30/90 split prices it: warn at suspicion, fail at habit. |
| **coverage** — Tier-1 repos without CANON.md | *Coverage of the spec surface.* Fidelity only exists where a spec exists; uncovered Tier-1 vessels are unmeasured, and `--enforce-coverage` is the flip from "unmeasured is fine" to "unmeasured is a failure" — the same gate SDAD flips when the spec corpus is declared load-bearing. |

## The one gap the mapping exposes

canon-lint measures **spec-side** fidelity: does the canon layer
faithfully describe the fleet. SDAD's metric is symmetric — it also
asks whether the *code* still implements the canon. That half is
currently attested by hand (reviews, FLUX fabric verification, suite
runs) rather than metered.

Candidate for the meter's next cell, in the fleet's own idiom:
**canon-claimed artifacts that hash-match at verify-time.** Every
CANON.md already names `canonical_docs`; the receipts discipline
(hash-chained, chain-verified) means implementation-fidelity can be
computed as `verified_receipts / claimed_receipts` per vessel, booked
like any other silence. Until that exists, report the metric as
*canon-side fidelity*, and say so.

## How to report it

- Sweep result is the meter reading: `PASS (n/n)` = fidelity 1.0 on
  the measured surface; `FAIL` lists the drifted dimensions by name
  (schema/edge/staleness/coverage) — the reading is per-dimension,
  never a scalar vibe.
- An `INCOMPLETE` run (exit 2, rate-limited staleness phase) is
  **not** a PASS. An unchecked sweep is never a fidelity claim —
  this is load-bearing per the 2026-09-21 lesson, not pedantry.
- The meter runs on the throttle's cadence, not on demand: fidelity
  measured only when someone asks is self-reported fidelity.

## Receipts

- Source metric: SDAD, arXiv 2608.20341 (spec-driven agentic
  development, "Spec Fidelity" governance metric).
- Implementation: `fleet-canon/lint.py`, checks 1–4, hardened
  2026-09-21 (RateLimited → INCOMPLETE exit 2 at both crash sites).
- Fleet readings to date: 12:55 PASS reversed at 13:35/13:45 — 4 edge
  gaps, deterministic; the reversal is the meter working, and the
  "never declare a sweep clean from one run" doctrine is the
  anti-flattery guard on the reading itself.
- Honest negative: implementation-side fidelity is hand-attested
  today; the receipts-based cell above is designed, not built.
