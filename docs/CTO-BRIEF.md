# jeviter — CTO Brief

## One-paragraph value statement

jeviter is a small, zero-dependency runtime law for agentic systems: don't
poll — rest, and react. It replaces burn-the-context polling loops with an
iterator that yields only when the world's *shape* genuinely surprises a
sliding belief, and it books every non-event as a hash-chained silence receipt,
so "nothing happened" becomes an auditable fact instead of a hang. Around that
law it has grown merge-governor, dream-consolidation, spec-distiller,
fidelity, and collaboration cells, all speaking the same ledger format as the
fleet's other receipts. It is the anti-DoS-by-construction answer to noisy
streams and noisy requesters.

## What it does & for whom

For teams operating agent fleets, event pipelines, or LLM-driven automation:
(1) a stream adapter (`JevIterator`) that cuts emitted events to the
genuinely-surprising and books the rest; (2) a call-level throttle (`Throttle`)
that sheds familiar requests and escalates novel ones, with adversarial
resonance impossible by construction (the ratchet); (3) a receipted ledger
format byte-compatible with the fleet's fnv1a-64 receipt family; (4) an MCP
server so any MCP client (Claude Desktop, fleet agents) can consume
homeostatic streams; (5) an ADE bridge exposing doctrine, spec-fidelity, and
collaboration readings to Gen-4 agentic development environments. In-service
proof: the org firehose watch (100 repos, 6.1% admission) and the PR-stream
watch (36.4% admission) ran on real fleet data with their ledgers shipped in
the repo and chain-verifying today.

## Maturity assessment

**Working, small, hardened at the core**:

- Core: working and tested — 88 tests in ~0.6 s (measured 2026-10-04), CI
  badge on GitHub (ci.yml), zero dependencies, Node >= 18, browser-native ESM.
- CLI/TUI/MCP: all shipped and exercised (TUI requires a TTY; scan exit-code
  law pinned by tests).
- Cells: governor/dream/distill/fidelity/collab shipped with doctrine pinned
  by tests; the distiller went through a dedicated fleet lane (SDAD seed 3)
  with an 18-test suite and a fixture-based end-to-end check.
- In-service evidence: two real ledgers ship in-repo and verify from genesis
  on `npm run`-free commands; docs/IN-SERVICE.md and docs/FLEET-DOGFOOD.md
  record honest usage (including what was refused).
- Not yet: the valve-dashboard TUI is designed, not built; no Python package
  (the port lives in jev-quilt); no semantic (embedding) profile.

## Risks

| Risk | Status / mitigation |
|---|---|
| fnv1a-64 is a checksum, not cryptography | Documented honestly in README/docs; prev-link check plus replay-equality give practical integrity; for high-value trust, pair with quilt-jev-toolkit's signed checkpoints (HMAC/Ed25519) — the fleet's v2/v3 layer |
| Legitimate repetition gets silenced (ratchet) | Doctrine, not bug: model event shape; `--k` tunes the bar; the docs state it in onboarding and FAQ |
| Ledger growth on chatty streams | Bounded: 200-char payloads; measured admission 6–36% on real streams; consolidation via the dream cell's pattern |
| Credential leakage via examples | Examples hold no tokens (auth lives in `gh`); the wave-67 sweep (Task 67-p) scrubbed the one dead embedded token; tree scans clean (2026-10-04) |
| Single-file-core bus factor | 1,363 lines total; this doc package plus the journal entries make the system restatable from artifacts |

## Cost profile

Effectively zero: no npm dependencies, no external services, no API keys, CI
is a 0.6-second test run. The only variable cost is your own compute for
stream processing (O(line length) per pull). The org-watch and jev-ci services
spend nothing but GitHub API quota. Free-tier posture: runs anywhere Node 18
runs, including browsers for the core.

## Strategic options

- **Invest** (fits a fleet scaling past a handful of agents): build the
  designed valve dashboard, cut the Python package, and wire a semantic
  `profileFn` per docs/SUBSTRATE-SPRINGS.md — those three are the scoped,
  honest gaps.
- **Maintain** (current posture): the core is stable and instantly testable;
  keep CI green and let fleet lanes consume the ledger format.
- **Harvest learnings**: the three laws + ratchet + receipted-silence pattern
  are the exportable idea; docs/AGENTIC-CYCLE.md already maps them to the
  industry's SDAD/ADE vocabulary.
- **Retire**: not recommended — its ledger law is load-bearing in the fleet's
  receipt cross-verification story (jev-quilt ↔ jeviter ↔ ports), and the
  in-service ledgers are referenced evidence.

## Integration surface

- **Upstream**: jev-quilt (doctrine origin: classifier lab E5–E7; ledger
  cross-verify partner via the café canary 0x24a555471370b18d); the
  substrate-* repos (rng/embedding/vectors) mapped as "springs" in
  docs/SUBSTRATE-SPRINGS.md.
- **Downstream**: any MCP client (jeviter_tail / jeviter_next /
  jeviter_throttle / jeviter_ledger_verify; fleet_doctrine /
  fleet_spec_fidelity / fleet_collab_read); quilt-mcp-receipts-style
  attribution layers can sign on top; the distiller's CANON stub output feeds
  canon-lint-style spec-fidelity metering.
- **Format family**: receipt rows `{"body": <chained json>, "hash": <16 hex>}`
  — same law as jev-quilt's Bookkeeper, byte-compatible by the pinned canary.

*Prepared for the wave-69 documentation package; test counts and ledger
readings measured on 2026-10-04.*
