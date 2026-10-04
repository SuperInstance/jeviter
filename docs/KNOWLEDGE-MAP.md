# jeviter — Knowledge Map
> The index of indexes for this repo.

## In this repo

- `src/core.js` — JevIterator, Throttle, Ledger, scanLedger; the three laws
  and the ratchet live here in 169 lines.
- `src/profile.js` — fnv1a64 (café canary pinned), Q16 BigInt rationals,
  letter-class profile, klGain, dynamicThreshold.
- `src/cli.js` — tail / follow / scan / tui / digest verbs; ledger persistence;
  exit-code law.
- `src/tui.js` — zero-dep ANSI instrument panel; silences rendered as data;
  `renderScanSummary` behind `scan --panel`.
- `src/mcp.js` — MCP stdio server; stream handles; ADE bridge tool registry.
- `src/ade.js` — ADE bridge (SDAD seed 6): receipted doctrine manifest,
  spec-fidelity gate, collab-read gate.
- `src/fidelity.js` — implementation-side spec fidelity
  (verified/claimed receipts; MISSING → INCOMPLETE; drift named per-path).
- `src/collab.js` — collaboration-paradox reader: resolution paths
  (delegated/reviewed/direct), named walls, paradox band as a reading.
- `src/governor.js` — sequential-merge governor (seed 7): shapeOf(pr) =
  areas:magnitude; rests counted in held PRs.
- `src/dream.js` — receipted sleep: consolidateMemory with caller-owned
  summarize; relocate-not-delete; FLUCTLIGHT cited as prior art.
- `src/distill.js` — Vibe→Spec distiller (SDAD seed 3): CITATION / DUP /
  JEV GATE / WELL-FORMEDNESS; verifyStub hash recomputation; never-throw.
- `test/` — 11 test files, 88 tests (core, collab, strict, scan, ade,
  governor, distill, fidelity, tui, dream).
- `examples/` — org-watch.js and jev-ci.js (the in-service watchers),
  vibe-distill.js (+ fixtures/playest-jeviter-tui.md), collab-paradox.js,
  dreaming.js, fidelity-cell.js, governor.js.
- `org-watch.ledger.jsonl` — 102 real receipts from the org firehose watch
  (cell `org-watch`): 1 seed, 6 events, 93 silences, 2 exhausted; chain
  verifies.
- `jev-ci.ledger.jsonl` — 13 real receipts from the AI-Writings PR-stream
  watch (cell `jev-ci:SuperInstance/AI-Writings`): 1 seed, 4 events,
  7 silences, 1 exhausted; chain verifies.
- `org-watch.state.json` — the watch's boundary state: 100 SuperInstance
  repos → last-seen `pushed_at` timestamps (2026-09-17 … 2026-09-21).
- `PROGRESS.md` — a lane artifact from the vibe-spec-distiller lane (44/44
  at that time; history, not status).
- `.github/workflows/` — ci.yml (the README badge), npm-publish.yml,
  npm-publish-github-packages.yml.
- `package.json` / `package-lock.json` — zero runtime deps; bin `jeviter`;
  exports ./profile ./ade ./distill.

## Pre-existing docs (everything before wave-69)

- `README.md` — the three laws, the ratchet, canon-compatibility (the café
  canary), install/use, surfaces table, the Vibe→Spec distiller section,
  doctrine provenance (jev-quilt classifier lab E5–E7).
- `docs/AGENTIC-CYCLE.md` — deep-research synthesis naming the industry frame:
  SDAD (arXiv 2608.20341), Anthropic's collaboration paradox (0–20% full
  delegation), ADE taxonomy, six coordination patterns; the seeds each cell
  answers.
- `docs/VIBE-DISTILL.md` — the distiller's doctrine statement (the stub is the
  spec surface fidelity.js meters).
- `docs/DREAMING.md` — receipted sleep doctrine; FLUCTLIGHT (arXiv 2608.12365)
  as prior art; "replay resumes the day, the dream ledger audits the night."
- `docs/SPEC-FIDELITY.md` — names the SDAD metric the fidelity cell computes;
  maps canon-lint (spec-side) vs fidelity.js (implementation-side).
- `docs/FLEET-DOGFOOD.md` — kimi1's honest usage notes (what was routed,
  admitted, refused; the 3-pinned/3-silenced gate decision).
- `docs/IN-SERVICE.md` — the operator's log (Service 1: self-digestion of a
  session report; further services appended over time). Seam: IN-SERVICE.md
  froze at 101 receipts; the shipped ledger (`org-watch.ledger.jsonl`) has
  grown since — ledgers are truth.
- `docs/SUBSTRATE-SPRINGS.md` — which substrate-* repos can replace which
  seams (rng/embedding/vectors) with the honest gaps of each.
- `docs/JEV-USAGE-NOTES-kimi1-2026-09-24.md` — arena-grounded notes on where
  JEV routing is most/least useful (dissent-as-material; raw receipts).

## In the fleet

- `SuperInstance/jev-quilt` — upstream doctrine origin (classifier lab E5–E7:
  cascade non-monotonicity, amplitude-invariance sweep, throttle sense-organ
  lesson) and byte-exact ledger cross-verify partner (same fnv1a-64 law, same
  café canary); also hosts the Python port `jev_quilt/jeviter.py`.
- `SuperInstance/quilt` — the reactive cell runtime ancestor of the cellular
  doctrine.
- `SuperInstance/quilt-jev-toolkit` — sibling: the JEV wire client + organ
  protocol; its signed-checkpoint work (v2 HMAC, v3 Ed25519) is the stronger
  custody layer jeviter's checksum ledger can pair with.
- `SuperInstance/substrate-rng`, `substrate-embedding`, `substrate-vectors` —
  candidate "springs" for seeded probes, semantic profiles, and neighborhood
  layers (docs/SUBSTRATE-SPRINGS.md).
- `SuperInstance/quilt-transformer-arena` — where the JEV usage notes were
  grounded (competitors/*/jev/ raw receipts).
- `SuperInstance/AI-Writings` — the repo whose PR stream jev-ci.ledger.jsonl
  actually watched.
- `SuperInstance/superinstance-lab` — the monorepo journal (worklog.md).

## In the journal

SuperInstance/superinstance-lab → worklog.md, grep `jeviter`. Verified entries
(2026-10-04):

- **Task 66-b** — garden-family decomposition: line-level study and dog-food
  of jeviter; negative findings receipted: (1) an explicit-dir `node --test`
  invocation failure from outside the package root, (2) pre-existing mode-bit
  changes in the working tree; decomposition parts written to
  download/decomposition-atlas/parts/garden/jeviter.json with file:line
  evidence.
- **Task 67-p** — credential sweep across subrepos (jeviter included): one
  embedded token found, tested against api.github.com → 401 dead, scrubbed;
  push-readiness recorded in the wave-67 close.
- (Context entries: Task 5-6 and Task 50 name jeviter in fleet surveys of the
  JEV family.)

## Receipts of record

- `org-watch.ledger.jsonl` — proves the firehose watch ran in service: chain
  VERIFIED via `node src/cli.js scan org-watch.ledger.jsonl`; the ALIVE
  reading (6 events / 93 silences / 6.1% admission) is the honest service
  record.
- `jev-ci.ledger.jsonl` — proves the PR-stream watch ran against
  SuperInstance/AI-Writings (13 receipts, 36.4% admission).
- `org-watch.state.json` — proves the census breadth (100 repos tracked).
- `examples/fixtures/playest-jeviter-tui.md` — the persona playtest the
  distiller's fixture check consumes; `node examples/vibe-distill.js --check`
  passes against it (3 pinned / 3 silenced, all receipted).

## How to search further

```bash
# Verify any ledger, including your own:
node src/cli.js scan org-watch.ledger.jsonl
# Where the doctrine is pinned in tests:
grep -rn "ratchet\|seeded\|silence" test/ | head -30
# The in-service history:
cat docs/IN-SERVICE.md docs/FLEET-DOGFOOD.md
# Journal mentions:
grep -n "jeviter" /home/z/my-project/worklog.md
# Cross-repo canary pins:
grep -rn "24a555471370b18d" test/ README.md   # café canary: test/core.test.js:11 (string form), test/distill.test.js:57 (0x024a… BigInt), README.md
grep -rn "0x024a555471370b18d" ../jev-quilt/tests/test_bookkeeper.py   # same value, leading-zero notation (fleet-internal sibling; clone https://github.com/SuperInstance/jev-quilt to resolve)
```
