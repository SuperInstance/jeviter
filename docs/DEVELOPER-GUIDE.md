# jeviter — Developer Guide

## Code layout

```
src/
  core.js        (169) JevIterator, Throttle, Ledger, scanLedger — the whole
                 iteration + receipting doctrine; imports only profile.js
  profile.js     (125) exact primitives: fnv1a64 (café canary pinned), Q16
                 BigInt rationals, letter-class profile(), klGain(),
                 dynamicThreshold()
  cli.js         (158) tail / follow / scan / tui / digest (stdin); ledger
                 persistence via patched book(); exit-code law (0/1/2)
  tui.js         (107) zero-dep ANSI instrument panel; silences rendered as
                 data; renderScanSummary for `scan --panel`
  mcp.js         (121) MCP stdio server: jeviter_tail / jeviter_next /
                 jeviter_throttle / jeviter_ledger_verify + ADE bridge tools
  ade.js         (78)  ADE bridge (SDAD seed 6): doctrine manifest, spec
                 fidelity, collab readings as MCP-callable gates
  fidelity.js    (54)  spec fidelity: verified_receipts / claimed_receipts per
                 vessel; MISSING → INCOMPLETE (fidelity=null), drift named per-path
  collab.js      (69)  collaboration-paradox reader: resolution paths
                 (delegated/reviewed/direct), named walls, never a mood score
  governor.js    (86)  seed 7: sequential-merge governor — shapeOf(pr) =
                 "areas:magnitude"; rest length counted in held PRs, not time
  dream.js       (108) receipted sleep: consolidateMemory() compresses the old
                 WAL tail, relocates (never deletes) to achieved/supersededBy
  distill.js     (288) SDAD seed 3: Vibe→Spec distiller — CITATION / DUP / JEV
                 GATE / WELL-FORMEDNESS, never-throw, verifyStub() hash recompute
test/            10 test files, 88 tests total (core, collab, strict, scan,
                 ade, governor, distill, fidelity, tui, dream — core.test.js
                 pins the café canary, seed-not-news, the ratchet, and the
                 Throttle flood/alternating-payload armor)
examples/
  org-watch.js       in-service org firehose watch (gh-backed) + state file
  jev-ci.js          in-service PR-stream watch (gh-backed)
  vibe-distill.js    distiller driver (--check mode)
  collab-paradox.js, dreaming.js, fidelity-cell.js, governor.js — cell demos
  fixtures/playest-jeviter-tui.md — the persona playtest fixture
docs/  VIBE-DISTILL.md, AGENTIC-CYCLE.md, DREAMING.md, SPEC-FIDELITY.md,
       FLEET-DOGFOOD.md, IN-SERVICE.md, SUBSTRATE-SPRINGS.md,
       JEV-USAGE-NOTES-kimi1-2026-09-24.md (+ this wave-69 package)
.github/workflows/  ci.yml (the README badge), npm-publish.yml,
       npm-publish-github-packages.yml
root ledgers: org-watch.ledger.jsonl (102 rows), jev-ci.ledger.jsonl (13 rows),
       org-watch.state.json (100 repos → last pushed_at)
```

## Core concepts

1. **Belief / boundary** — the iterator's sliding model of the stream. The
   first pull seeds it (`seed` receipt, never emitted); every admission updates
   it. `Throttle` and `MergeGovernor` keep a bounded window (default 16) of
   admitted shapes.
2. **Gain** — KL divergence Σ p·log(p/q) between the belief profile and the
   new reading, over shared support. Zero-mass cells contribute nothing; the
   profile is exact Q16 rationals converted for the log only.
3. **Dynamic threshold** — `dynamicThreshold(accepted, k)`: mean + k·σ over
   admitted gains. Admitting changes the threshold — this is the ratchet that
   makes fixed-amplitude resonance impossible.
4. **Ledger** — `book(state, payload, kind, extra)` chains fnv1a-64 over UTF-8
   of a JSON body `{cell, seq, state, kind, payload(≤200ch), extra, prev}`;
   genesis `prev = 0n`. Kinds seen in the wild: `seed`, `event`, `silence`,
   `shed`, `escalated`, `exhausted`, plus cell-specific ones (`merged`,
   `held`, dream/distill kinds).
5. **scanLedger** — replay from genesis; names the break (`unparseable body`,
   `prev-link mismatch`, `self-hash mismatch`) and reads the pattern (`EMPTY`,
   `QUIET`, `ALIVE` with admission %, `TAMPER` with row + why).
6. **Cells** — governor/dream/distill/fidelity/collab: the same law (no
   belief-no refusal; every hold/silence/refusal booked; refusal is
   first-class; never-throw on malformed input) applied to a new surface.

## How to extend

### Add a new cell (the house pattern)

1. Create `src/<name>.js` with a doctrine header: state the laws in comments
   AND pin each with a test (the phrase in the codebase is "pinned by tests,
   not comments" — every existing module follows it).
2. Import `{ Ledger }` from `./core.js`; book every decision as a row. A
   reading that is not booked is self-reported (fidelity.js doctrine #4).
3. Refusal is first-class: malformed input produces a refused receipt and an
   honest empty result — never a throw (distill.js is the canonical example).
4. Add `test/<name>.test.js` with `node:test` + `node:assert/strict` (see
   `test/strict.test.js` for the import style). Run `npm test`.
5. If it should be an MCP tool, register it in `src/mcp.js`'s `TOOLS` with an
   inputSchema; if it should cross to ADEs, route it through `src/ade.js` with
   a receipted manifest (ade.js doctrine #4: an ADE that read the doctrine and
   did not book it did not read the doctrine).

### Add a profile function (a new "sense organ")

`profile(text)` maps text → a `{class: Q16}` distribution; `klGain` compares
two profiles. To sense something other than letter classes (the E5–E7 lesson:
letter-class profiles beat chaotic per-char hashes because KL must always have
mass to compare):

1. Add your function to `src/profile.js` (or accept `profileFn` at
   construction — `JevIterator` and `Throttle` both take one).
2. It must return a fixed support (same keys every call) of Q16 summing to 1;
   KL over disjoint support silently contributes zero, which weakens the gate.
3. Pin the sense-organ lesson with a test: an adversarial alternating-payload
   pair must be silenced after one admission (the Throttle armor is pinned in
   test/core.test.js, the governor variant in test/governor.test.js).
4. docs/SUBSTRATE-SPRINGS.md documents the honest gaps of embedding-based
   profiles — read it before wiring a remote embedder (receipt the payload
   hash if you do).

### Add a CLI verb

Follow `src/cli.js`: parse via the `opt()` helper, wire a `Ledger` with
`--ledger` persistence (the `persist` patch of `ledger.book` is the pattern),
keep the exit-code law — success 0, broken chain 1, usage/unreadable input 2.

### Extend the distiller

`src/distill.js` is the biggest module (288 lines). The gates are sequential:
CITATION (every lesson cites a resolvable `T<n>` line) → DUP (normalized-text
fnv1a hash already pinned → silence, never re-pin) → JEV GATE (Throttle) →
WELL-FORMEDNESS (the rendered stub is re-parsed; hashes recomputed against the
transcript — `verifyStub` closes the forged-hash gap; test 17 pins that
shape-only passes and recompute catches). Any new gate must: book its own
receipts, name refused lessons, and keep the never-throw contract.

## Testing

```bash
npm test          # node --test — measured 2026-10-04: 88 tests, ~0.6s, all green
```

- Green means: every doctrine law has a pinning test; the fixture-based gates
  (vibe-distill `--check`, scan against both shipped ledgers) pass; the strict
  mode test (`test/strict.test.js`) passes, so no accidental `any`-ish JS
  slop in the core paths.
- `node examples/vibe-distill.js --check` is the distiller's end-to-end
  fixture check (18 distill tests included in the 88).
- There is no network in the suite; the gh-backed examples are not tests.

## Conventions

- **Doctrine headers**: file 1 comment states the laws; tests pin them.
- **Naming**: cells and modules are lowercase single words (governor, dream,
  distill, fidelity, collab); receipt kinds are lowercase (`seed`, `silence`,
  `shed`, `escalated`, `event`, `exhausted`); error codes are SCREAMING_SNAKE
  only in fail-closed surfaces that borrowed organ vocabulary — jeviter's own
  refusals are named in receipt `extra` fields instead.
- **Receipt discipline**: every reading is a ledger row; docs/IN-SERVICE.md is
  the operator's log of what was routed through the tool (write yours there).
- **Exactness**: BigInt Q16 rationals for profiles; fnv1a-64 over UTF-8 for
  identity; floats only inside `klGain`'s log. Never let a float touch
  identity.
- **Zero dependencies**: the whole repo imports only `node:` builtins and
  relative modules. Do not add npm deps; the browser-native claim depends on
  it.
- **Commits**: short imperative subjects; the CI badge (ci.yml) runs the
  suite on push; npm-publish workflows exist for package release.

## Gotchas for editors

- **`src/core.js` is the contract.** `JevIterator.next()`, `Throttle.call()`,
  `Ledger.book()/verify()`, and `scanLedger`'s reading strings are consumed by
  the CLI, the TUI, the MCP server, and every cell. Changing the receipt body
  shape breaks ledger cross-verification with jev-quilt's Bookkeeper — the
  café canary test and test/core.test.js will catch the hash change, but
  downstream stored ledgers would be orphaned.
- **The 200-char payload truncation** in `Ledger.book` is load-bearing for
  ledger size; raising it changes stored bytes for all future rows and makes
  old/new ledgers visually inconsistent (still chain-valid — the hash covers
  what was written).
- **`test/` vs `tests/`**: jeviter uses `test/`. The GitHub CI (ci.yml) runs
  `npm test`; do not move the directory without editing the workflow.
- **cli.js patches `ledger.book`** twice (persistence, then TUI observation).
  Keep the `origBook.bind` pattern or the TUI stops seeing silences (doctrine
  3: a tail you can watch must not hide what it swallowed).
- **governor's rest length is counted in held PRs, not time** (doctrine 3:
  wall-clock smuggling is not a release mechanism). Tests will reject any
  timer-based shortcut.
- **dream.js never deletes**: relocating instead of deleting is Casey's
  no-delete doctrine; a "cleanup" PR that drops rows breaks the audit chain
  the cell exists to provide.
- **PROGRESS.md is a lane artifact** (distiller lane, 44/44 at the time) — do
  not update it as a status page; write receipts and the journal instead.
