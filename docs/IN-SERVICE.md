# IN SERVICE — the operator's log

jeviter, used by its own operator, on real work. This file is the honest
record: what was routed through it, what it admitted, what it refused,
and what the receipts taught. Updated as the service grows.

## Service 1 — self-digestion of a session report (`cli.js -`)

**Stream:** my own merge-sweep report (`memory/2026-09-21.md`, 15 lines).
**First meal, because doctrine says eat first.**

```
$ node src/cli.js - < memory/2026-09-21.md
[event #1 +0.032>0.000] ## MERGE SWEEP — 35 PRs merged (23:33–23:52, Casey directive)
[event #2 +0.130>0.032] Merged all auto-mergeable non-dependabot PRs across SuperInstance…
[event #3 …] **Blocked: midden#4 … jev-quilt #7–#10 … classifier-lab (CONFLICTING, stacked).**
digest: 15 pulls booked, 11 silences — the rest told us something
```

**What it taught:** the three events are exactly the three things a reader
needs — the headline, the full accounting, the blockers. The eleven
silences are the prose between them. A 15-line status collapses to its
load-bearing skeleton without being *summarized* — admission by shape,
not by keyword. Nobody wrote a summary heuristic. The threshold did it.

## Service 2 — the org firehose (`examples/org-watch.js`)

**Stream:** push movement across SuperInstance — a *user* account, 4,578
public repos (correcting my earlier notes: "~3,951 repos in the org").
The organizations-events endpoint 404s; the repos endpoint with
`sort=pushed` is the honest firehose.

**Poll 1 — census (real run, 2026-09-22 02:26 UTC+8):**

```
[org-watch +0.011>0.000] seen jeviter
[org-watch +0.019>0.011] seen jev-quilt
[org-watch +0.025>0.023] seen substrate-embedding
[org-watch +0.041>0.029] seen hn-sim
[org-watch +0.048>0.046] seen midden
[org-watch +0.101>0.056] seen q16-trajectories
```

```
scan(org-watch.ledger.jsonl): CHAIN VERIFIED — 101 receipt(s)
  event: 6 · exhausted: 1 · seed: 1 · silence: 93
reading: ALIVE — 6 event(s), 93 silence(s) booked, admission 6.1%
```

A 100-repo census collapsed to **6 events, 93 booked silences, chain
verified from genesis**. The six admitted are the six whose current
push-shape genuinely differs — a new repo (jeviter itself), a
submarine (substrate-embedding surfacing), the night's hottest lanes.
6.1% admission means a human glance covers the whole org.

**Poll 2 — the quiet (60 seconds later):** zero output. Zero pulls, zero
receipts — every recently-pushed repo's shape was already in the
boundary; unchanged `pushed_at` never reaches the iterator. *The org
being quiet is not a gap in the watch; the absence of receipts is the
proof of quiet.* This is the doctrine made tangible: a silence you
cannot audit is indistinguishable from a hang — so jeviter hangs
nothing; it rests.

**What it taught:**
1. **The 404 lesson:** my notes said "org, ~3,951 repos." Reality: user,
   4,578 repos. jeviter's first service act was falsifying its
   operator's map. Route real streams — they correct you.
2. **Census ≠ news:** 100 new-repo sightings yielded 6 events because
   "seen X" lines from quiet repos share a shape. Novelty is
   *profile-divergent*, not *novel-strings*. The letter-class organ
   carries semantic weight cheaply.
3. **The exhausted receipt is load-bearing.** Poll 2 wrote nothing — but
   the ledger from poll 1 verifies from genesis, so "nothing new" is a
   *verified* nothing, not an assumption.

## Standing doctrine for future services

- Route work through `JevIterator` before acting on a stream: the events
  it admits are the work worth doing.
- Persist the ledger; `scan` after every run. CHAIN BROKEN is a stop.
- If admission > ~20% on a routine stream, the organ is wrong (see the
  classifier-lab lesson: letter-class profiles, never chaotic hashes).
- New services get an entry here with real receipts or they don't ship.

*— kimi1, first operator, 2026-09-22*
