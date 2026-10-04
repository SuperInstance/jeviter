# jeviter — Engineering Notes

## Architecture

One kernel, many cells, one ledger law.

```
   streams (files, SSE, gh API, stdin, MCP handles)
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│ core.js                                                     │
│   JevIterator(stream, {k, ledger, profileFn})               │
│     pull → profile(text) → belief? → klGain → threshold?    │
│     seed │ silence(booked) │ EVENT yield                    │
│   Throttle(fn, {k, window})   — call-level ratchet          │
│   Ledger / scanLedger         — fnv1a-64 chain + reading    │
└──────┬─────────────────────────────┬───────────────────────┘
       │ profile.js                  │ consumed by
       ▼                             ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│ fnv1a64 (canary) │   │ cli.js (tail/follow/scan/tui/digest)      │
│ Q16 rationals    │   │ tui.js (ANSI panel) · mcp.js (stdio)      │
│ letter profile   │   │ cells: governor · dream · distill ·       │
│ klGain           │   │        fidelity · collab · ade bridge     │
│ dynamicThreshold │   │ in-service: org-watch.js · jev-ci.js      │
└──────────────────┘   └──────────────────────────────────────────┘
```

Data flow of one pull: the stream yields a line; `profile()` converts it to an
exact rational letter-class distribution; `klGain(belief, reading)` scores the
surprise; `dynamicThreshold(accepted, k)` sets the live bar (mean + k·σ over
admitted gains); below the bar the pull is booked as a `silence` row and the
loop continues; above it, the belief updates, the gain joins `accepted`
(moving the bar), and one event is yielded. Stream exhausted → an `exhausted`
row. Every row is `{body, hash}` where body chains fnv1a-64-over-UTF-8 with
`prev` — replay from genesis is the verifier, and `scanLedger` names the
stream state (`EMPTY` / `QUIET` / `ALIVE` / `TAMPER` at row N).

The cell family reuses the same skeleton on new surfaces: `Throttle` wraps
calls instead of pulls; `MergeGovernor` profiles PR *shapes* (`areas:magnitude`)
and rests the queue `restLen` held PRs between divergent changes; `dream.js`
consolidates a memory WAL with a caller-supplied `summarize()` and relocates
superseded rows (no delete); `distill.js` turns persona playtests into
machine-checked CANON stubs; `fidelity.js` meters implementation-vs-canon by
sha256; `collab.js` classifies work by resolution path; `mcp.js`/`ade.js` carry
all of it across process boundaries as MCP tools.

## Invariants

- **Law 1 — no belief, no refusal**: the first pull seeds and is not news.
  Enforced in `JevIterator.next()` (`last === null` branch) and
  `Throttle.call()` (`base === null` branch); pinned by test/core.test.js.
- **Law 2 — every silence is booked**: no code path may pull without a ledger
  row (`silence`, `shed`, or the cell's hold/refusal equivalent). Pinned by
  scan counts in tests and by the TUI's observe-the-book patch in cli.js.
- **Law 3 — the threshold is alive**: `dynamicThreshold` over admitted gains;
  pinned by test/core.test.js and test/governor.test.js.
- **The ratchet**: a fixed-amplitude world is silenced after exactly one
  admission (the first gain sets the bar; the return leg lands just under it).
  Pinned by test/core.test.js ("THE RATCHET: fixed-amplitude oscillation
  silences after one admission" + the Throttle flood/alternating-payload
  test) and test/governor.test.js.
- **Chain verifiability**: `verify()` replays from genesis (`prev` links +
  self-hash); a forged body with a recomputed self-hash dies on its prev-link.
  Pinned in test/core.test.js and test/scan.test.js; demonstrated on real
  data by both shipped ledgers verifying.
- **Canary pin**: `fnv1a64("café Δ 日本語") === 0x24a555471370b18d` in
  profile.js — byte-compatibility with jev-quilt's Bookkeeper, duke-lab's WASM
  port, and quilt-engine-ports' GDScript.
- **Exit-code law** (cli.js): 0 verified / 1 broken / 2 usage-or-unreadable.
  "Paint never softens the verdict" (`scan --panel` uses the same exit codes).

## Failure modes & blast radius

- **Stream source dies** (file deleted mid-tail, HTTP drop): `followFile`
  throws ENOENT on stat; `followUrl` ends on reader close → the iterator
  books `exhausted`. Blast radius: one run; the ledger keeps what was booked
  and verifies.
- **Tampered ledger**: `scan` names the row and reason (exit 1); consumers
  that honor exit codes are safe; blast radius is contained to the file.
- **`gh` failures in in-service examples**: `execFileSync` with 30 s timeout
  throws through; a poll failure is a crashed run, not a forged silence — the
  ledger shows the honest gap by absence. (Documented tradeoff; a watchdog
  would wrap the loop.)
- **Pathological streams**: an attacker who can shape payloads cannot keep
  escalation (the ratchet); an attacker who can *rewrite history* is caught by
  the chain; an attacker who can replace the whole ledger plus verifier is
  outside the threat model (fnv1a-64 is a checksum, not cryptography — stated
  in the README's honesty and in docs/).
- **MCP handle leaks**: handles map grows per `jeviter_tail` call in
  `mcp.js`; long-lived servers should release handles — current release path
  is process lifecycle (small blast radius, stdio server).

## Performance & cost envelope

- Suite: 88 tests in ~0.6 s (measured 2026-10-04) — the whole proof suite is
  effectively instant, which is why CI on every push is cheap.
- Iterator cost per pull: one letter-class pass (O(len)), one KL over a
  5-class support, one fnv1a-64 over a small JSON body. Sub-microsecond-class
  work per pull in Node on typical lines; no allocation-heavy paths.
  [Estimate label: no formal benchmark exists; the numbers above are the
  complexity argument, not a measurement.]
- Ledger size: 102 real receipts (org-watch) and 13 (jev-ci) at ~250–450
  bytes/row; payload truncation at 200 chars bounds row size.
- Real-service yield: org firehose watch admitted 6 events out of 99 booked
  pulls (6.1% admission) across its life; jev-ci admitted 4 of 11 (36.4%) —
  measured by `scan` on the shipped ledgers.
- Zero external services, zero API cost; the gh-backed examples spend only
  GitHub API quota.

## Operations

- Local: `npm test`; CLI verbs; `node examples/vibe-distill.js --check`.
- CI: `.github/workflows/ci.yml` (the README badge) runs the suite on push;
  `npm-publish.yml` and `npm-publish-github-packages.yml` exist for releases.
- In service (the fleet's own dog-food): `examples/org-watch.js` watched the
  SuperInstance org firehose (state in `org-watch.state.json`, 100 repos);
  `examples/jev-ci.js` watched the AI-Writings PR stream (ledger cell
  `jev-ci:SuperInstance/AI-Writings`). Both persist ledgers and replay from
  the last receipt on restart.
- MCP: `node src/mcp.js` over stdio — the intended integration for Claude
  Desktop and fleet agents; ADE bridge tools expose doctrine, spec fidelity,
  and collab readings to Gen-4 environments.
- Credentials model: the core reads no env vars and holds no keys; examples
  delegate auth to the `gh` CLI. The wave-67 fleet credential sweep (worklog
  Task 67-p) found one embedded token in this repo's config, verified dead
  (401), and scrubbed it — the tree is clean as of this writing
  (keyscan-pattern greps: zero hits, 2026-10-04).

## Design decisions & why

1. **fnv1a-64 over a cryptographic hash for receipts**. The fleet law is
   cross-verifiability: the same hash must reproduce byte-exactly in
   jev-quilt's Python Bookkeeper, duke-lab's WASM, and GDScript. Tradeoff:
   not tamper-*resistant* against a full-history forger; mitigated by the
   prev-link check and by replay-equality in downstream consumers.
2. **KL over letter-class profiles instead of content hashing** (the E5–E7
   sense-organ lesson, inherited from jev-quilt's classifier lab). Chaotic
   per-char hashes starve KL of mass; letter classes always have mass to
   compare, so the threshold stays meaningful. Tradeoff: sense is syntactic,
   not semantic; SUBSTRATE-SPRINGS.md records the embedding-based alternative
   and its gap.
3. **Silences are receipts, not suppressed logs** ("every silence is booked").
   A quiet stream becomes an auditable object (QUIET reading). Tradeoff: row
   volume scales with pulls; bounded by 200-char payloads and, in practice,
   by admission ratios (93 silences over the org-watch ledger's whole life).
4. **The ratchet as anti-DoS armor**: amplitude-adaptive, not
   amplitude-sensitive. Tradeoff: persistent legitimate repetition is
   silenced after one admission — chosen deliberately; callers should model
   event *shape*, not resend identical text expecting attention.
5. **Never-throw surfaces** (distill, fidelity, collab): malformed input
   yields refused receipts and honest empty results. Tradeoff: errors are
   data, so sloppy callers see empty artifacts instead of stack traces; the
   refusal rows are the paper trail.
6. **Rest length counted in held PRs, not time** (governor doctrine 3):
   wall-clock is not a release mechanism. Tradeoff: an idle queue rests
   indefinitely behind a held PR; the payoff is determinism and replayability
   of the merge policy.
