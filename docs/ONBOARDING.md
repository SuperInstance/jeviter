# jeviter — Agent Onboarding
> Zero-shot entry point. Clone → competent in ~10 minutes.

## Identity (2 sentences)

jeviter is homeostatic iteration for agentic systems: replace `for (const event
of stream)` polling with an iterator that pulls until the world *surprises* a
sliding boundary belief, then yields once — and books every non-surprising
pull as a hash-chained silence receipt. It ships as a zero-dependency ESM core
(`JevIterator`, `Throttle`, `Ledger`), a CLI (`tail`/`follow`/`scan`/`tui`/stdin
`digest`), an MCP stdio server, and a family of cells built on the same law
(governor, dream, distill, fidelity, collab, ADE bridge).

## Why it exists (the fleet problem it solves)

Agents that poll a log tail, SSE feed, PR queue, or org firehose burn context
and tokens on repetition, and a quiet stream is indistinguishable from a hang.
jeviter inverts the loop: the first pull seeds the boundary ("no belief, no
refusal" — seeding is not news), every silenced pull is booked ("a silence you
cannot audit is indistinguishable from a hang"), and the threshold is alive
(mean + k·σ over admitted gains — "a fixed line is a target; this moves").
The armor is the ratchet: a world oscillating at any fixed amplitude is
silenced after exactly one admission, so adversarial resonance is impossible by
construction. The doctrine was born in jev-quilt's classifier lab (E5–E7:
cascade non-monotonicity, amplitude-invariance sweep, the throttle sense-organ
lesson) and industrialized here across fleet lanes; the wave-66 decomposition
(Task 66-b) dog-food-verified it headless, and the journal carries its credential
sweep (Task 67-p). The receipt cross-verifies with jev-quilt's Bookkeeper from
byte one: the ledger hash is fnv1a-64 over UTF-8 pinned to the fleet canary
`fnv1a64("café Δ 日本語") === 0x24a555471370b18d`.

## Verify it works (exact commands)

```bash
# 0. Requirements: Node >= 18 (package.json engines). Zero npm dependencies.

# 1. The proof suite — measured 2026-10-04 on this tree: 88 tests, ~0.6s, all pass.
npm test                        # node --test

# 2. The CLI, offline, no credentials:
node src/cli.js scan org-watch.ledger.jsonl
#   → scan(org-watch.ledger.jsonl): CHAIN VERIFIED — 102 receipt(s)
#     event: 6 / exhausted: 2 / seed: 1 / silence: 93
#     reading: ALIVE — 6 event(s), 93 silence(s) booked, admission 6.1%
node src/cli.js scan jev-ci.ledger.jsonl      # 13 receipts, admission 36.4%
printf 'a\na\na\nsuddenly something new\n' | node src/cli.js -
#   digest: books seed + silences + the event on stdin

# 3. Live tails need a stream to watch (a file that grows, or an SSE URL):
node src/cli.js tail app.log --ledger app.ledger.jsonl
node src/cli.js follow https://example.com/stream --k 1.5

# 4. The gh-backed examples need the GitHub CLI installed AND authenticated
#    (gh) — they are in-service tools, not tests:
node examples/org-watch.js --once              # org firehose, one poll
node examples/jev-ci.js SuperInstance/jev-quilt --once   # PR-stream watch

# 5. MCP stdio server (wire it into Claude Desktop or a fleet agent):
node src/mcp.js
```

Nothing in the core requires credentials or network. The two in-service
examples require the `gh` CLI installed AND authenticated; without `gh` the
examples crash with a `TypeError` (not a friendly error) — wave-69 drill
finding.

## Reading order (paths, not vibes)

1. `README.md` — the three laws, the ratchet, the surfaces table, install.
2. `src/core.js` — 169 lines: `Ledger`, `scanLedger`, `JevIterator`, `Throttle`.
   The doctrine is in the header comment and pinned by tests.
3. `src/profile.js` — the exact primitives: `fnv1a64` (café-canary pinned),
   `Q16` BigInt rationals, the letter-class `profile`, `klGain`,
   `dynamicThreshold`.
4. `src/cli.js` — the command surface, including the exit-code discipline
   (unreadable ledger → exit 2; broken chain → exit 1).
5. `docs/AGENTIC-CYCLE.md` — the research synthesis that names the industry
   frame (SDAD, the collaboration paradox, ADEs) each cell answers.
6. `docs/VIBE-DISTILL.md` + `src/distill.js` — the Vibe→Spec distiller doctrine
   (CITATION / DUP / JEV GATE / WELL-FORMEDNESS).
7. `docs/DREAMING.md` + `src/dream.js` — receipted sleep; FLUCTLIGHT as prior
   art, the dream ledger as the audit layer.
8. `docs/FLEET-DOGFOOD.md` and `docs/IN-SERVICE.md` — where it has actually
   earned its keep, honestly.
9. `docs/SUBSTRATE-SPRINGS.md` — which substrate-* repos can replace which
   seams, with the honest gaps.

## The things that will bite you (gotchas)

- **The threshold is dynamic and per-iteration**: `k` (default 2.0) scales
  mean + k·σ over *admitted* gains. The first pull after a burst resets
  expectations; do not compare thresholds across iterators.
- **Seeding is not news**: the first pull (or first call on a fresh
  `Throttle`) is booked as `seed` and never emitted. If your first event
  "disappears," it seeded the belief.
- **Ledger rows are `{"body": "<json string>", "hash": "<16 hex>"}`** — the
  body is a *stringified* JSON of `{cell, seq, state, kind, payload, extra,
  prev}`. Parsing naively as flat JSON is the #1 integration mistake.
- **Payloads are truncated to 200 chars** in `Ledger.book` (`payload:
  JSON.stringify(payload).slice(0, 200)`) — the ledger is an audit trail, not
  a data store.
- **`scan` exit codes are law**: unreadable ledger → exit 2 (an unreadable
  ledger is never a PASS), broken chain → exit 1, verified → 0. Scripts that
  ignore exit codes will silently accept tampered ledgers.
- **`follow` never checks the HTTP status**: a 404 URL streams nothing and
  exits 0 — zero output, zero ledger rows, a silent success. Verify the URL
  manually before trusting a quiet `follow` (wave-69 drill finding).
- **`digest` reads STDIN, not its file argument**: `digest <file>` ignores the
  filename — pipe into it (`cat report.md | node src/cli.js digest`), do not
  pass a filename (wave-69 drill finding).
- **`src/profile.js` holds more than the core primitives**: `klGainStrict`,
  `profileValue`, and `dynamicThresholdEWMA` live beside `fnv1a64`, `Q16`,
  `profile`, `klGain`, `dynamicThreshold`. The EWMA comment
  (`src/profile.js:108-114`) records real history: org-watch was once found
  DEAD (frozen threshold, 81 zero-admission rows) — read it before touching
  the threshold code.
- **The TUI needs a TTY** (`tui` exits 2 without one — "the panel is an
  instrument, not a pager").
- **The ratchet cuts both ways**: a fixed-amplitude signal is silenced after
  one admission by design. If your stream legitimately repeats the same
  important line forever, jeviter will book it as silence after the first —
  that is the point; model the shape, don't fight it.
- **`node --test` discovery**: run `npm test` from the repo root (test files
  live in `test/`). A wave-66 dog-food pass (Task 66-b) receipted a failure
  when invoking node --test with an explicit-dir pattern from elsewhere —
  use the package script.
- **No delete in the dream cell**: `dream.js` consolidates by *relocating*
  rows to `achieved` with `supersededBy` markers; nothing is ever deleted
  (the fleet no-delete doctrine). Code that assumes deletion will not find it.
- **Credentials**: the core reads none. `examples/*.js` read none (they shell
  out to `gh`, which holds auth). Wave-67 (Task 67-p) swept embedded tokens
  fleet-wide; the one found in this repo's config was dead/revoked and
  scrubbed. Keep tokens in `gh`/env, never in files.

## Where deeper knowledge lives

- Knowledge map: [docs/KNOWLEDGE-MAP.md](./KNOWLEDGE-MAP.md)
- Fleet journal: SuperInstance/superinstance-lab → worklog.md (grep 'jeviter';
  Task IDs 66-b and 67-p are the load-bearing entries)
- `org-watch.ledger.jsonl` / `jev-ci.ledger.jsonl` — real in-service run
  state (102 + 13 receipted rows), verifiable with `node src/cli.js scan`.
- `org-watch.state.json` — the firehose watch's boundary state: 100 repos,
  each with its last-seen `pushed_at` timestamp.
- `docs/` — AGENTIC-CYCLE, VIBE-DISTILL, DREAMING, SPEC-FIDELITY,
  FLEET-DOGFOOD, IN-SERVICE, SUBSTRATE-SPRINGS, JEV-USAGE-NOTES (all pre-date
  wave-69; indexed in KNOWLEDGE-MAP.md).
- `jev-quilt` — the doctrine origin (classifier lab E5–E7) and the byte-exact
  ledger cross-verify partner; its `jev_quilt/jeviter.py` is the Python port.
- `quilt-jev-toolkit` — the JEV wire protocol repo; the "JEV GATE" in the
  distiller consumes the same noul/choice/score philosophy (here implemented
  locally via the Throttle, no API key needed).

## Current frontier (what is open right now)

- The valve dashboard TUI is listed in README's surfaces table as *designed —
  threshold, gain histogram, silence counter*; the shipped `tui` is the tail
  instrument panel. The dashboard is unbuilt.
- The Python port lives in jev-quilt (`jev_quilt/jeviter.py`), not here; a
  first-class Python package is not cut.
- `SUBSTRATE-SPRINGS.md` maps three open seams: a semantic `profileFn`
  (embedding-based) instead of letter classes, a vector neighborhood layer
  beside KL, and reproducible seeded probe streams — each with its honest gap
  stated; none is built.
- PROGRESS.md is a lane artifact from the distiller lane (44/44 at the time);
  the suite has since doubled (88) — the file is history, not status.
- Push/PR from the wave-66 lane (`vibe-spec-distiller` branch, "push + PR"
  unchecked) happened via the fleet's own process; the journal records the
  credential state, not this file.
